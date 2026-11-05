'use server';

// ============================================================
// app/actions/payment.ts
// Server Actions — Integração Mercado Pago (PIX)
// ============================================================

import { getPaymentStatus } from '@/lib/mercadopago';
import { getActivePaymentGateway } from '@/lib/payments';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import { isStaff, UNAUTHORIZED_MESSAGE } from '@/lib/authz';
import { normalizeBookingId } from '@/lib/queryInput';
import { isIntegrationMockAllowed, isMockDataAllowed } from '@/lib/dataMode';
import { isOnlineBookingEnabled, ONLINE_BOOKING_DISABLED_MESSAGE } from '@/lib/launchMode';
import { confirmBookingFromPayment, type ConfirmationOutcome } from '@/lib/paymentConfirmation';
import { supabaseConfirmationRepository, mockConfirmationRepository } from '@/lib/paymentConfirmationRepo';
import { sendPaymentConfirmedEmail } from '@/lib/bookingNotifications';
import { recordPaymentEvent } from '@/lib/payments/events';
import { getPaymentIntegrationStatus } from '@/lib/payments/diagnostics';

export interface CreatePixPaymentResult {
  success: boolean;
  paymentId?: number;
  qrCodeBase64?: string;
  copiaECola?: string;
  ticketUrl?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Cria um pagamento PIX no Mercado Pago para uma reserva.
 */
export async function createPixPaymentAction(
  bookingId: string,
  amount: number,
  email: string,
  // Mantido por compatibilidade com o checkout; a descrição real usa o localizador gravado.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  description: string
): Promise<CreatePixPaymentResult> {
  // Pré-lançamento: nenhuma cobrança é gerada pelo fluxo público
  if (!isOnlineBookingEnabled()) {
    return { success: false, error: ONLINE_BOOKING_DISABLED_MESSAGE };
  }

  // Verificar se MP_ACCESS_TOKEN está configurado
  if (!process.env.MP_ACCESS_TOKEN) {
    // Em produção, nunca exibir QR Code PIX falso ao hóspede
    if (!isIntegrationMockAllowed()) {
      console.error('[createPixPaymentAction] MP_ACCESS_TOKEN ausente em produção.');
      return { success: false, error: 'Pagamento PIX indisponível no momento. Sua reserva foi registrada; entre em contato para concluir o pagamento.' };
    }
    // Modo mock (desenvolvimento): simular pagamento PIX sem Mercado Pago real.
    // Mesmo no mock, o valor vem da reserva gravada, não do navegador.
    const mockBooking = mockData.getReservationById(normalizeBookingId(bookingId) || '');
    if (!mockBooking) return { success: false, error: 'Reserva não encontrada para pagamento.' };
    return mockPixFor(mockBooking.id, mockBooking.totalPrice);
  }

  // Valor e e-mail vêm da reserva gravada — nunca do cliente (evita pagar
  // um valor diferente do registrado e ter a reserva confirmada pelo webhook).
  const safeId = normalizeBookingId(bookingId);
  if (!safeId || !isSupabaseConfigured()) {
    return { success: false, error: 'Reserva inválida para pagamento.' };
  }
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_code, total_price, guest_email, status')
    .eq('id', safeId)
    .maybeSingle();
  if (bookingError || !booking) {
    return { success: false, error: 'Reserva não encontrada para pagamento.' };
  }
  if (booking.status !== 'pending') {
    return { success: false, error: 'Esta reserva não está aguardando pagamento.' };
  }
  if (!(Number(booking.total_price) > 0)) {
    return { success: false, error: 'Esta reserva não possui valor a pagar.' };
  }
  if (Number(booking.total_price) !== Number(amount)) {
    console.warn('[createPixPaymentAction] Valor enviado pelo cliente difere do registrado; usando o valor da reserva.');
  }

  try {
    const charge = await getActivePaymentGateway().createPixCharge({
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      amount: Number(booking.total_price),
      payerEmail: booking.guest_email || email,
    });
    await recordPaymentEvent({
      type: 'pix_created',
      environment: getPaymentIntegrationStatus().environment,
      paymentId: charge.providerPaymentId,
      bookingId: booking.id,
      paymentStatus: 'pending',
      amount: Number(booking.total_price),
    });
    return {
      success: true,
      paymentId: Number(charge.providerPaymentId),
      qrCodeBase64: charge.qrCodeBase64,
      copiaECola: charge.copiaECola,
      ticketUrl: charge.ticketUrl,
      expiresAt: charge.expiresAt,
    };
  } catch (error) {
    // Detalhes do gateway ficam no log; o hóspede recebe mensagem segura
    console.error('[createPixPaymentAction] Falha no gateway:', error);
    return { success: false, error: 'Não foi possível gerar o PIX agora. Sua reserva foi registrada; tente novamente ou fale conosco.' };
  }
}

/** PIX simulado — somente desenvolvimento (isIntegrationMockAllowed). */
function mockPixFor(bookingId: string, amount: number): CreatePixPaymentResult {
  return {
    success: true,
    paymentId: 1,
    qrCodeBase64: generateMockQrCodeBase64(),
    copiaECola: `00020126580014br.gov.bcb.pix0136${bookingId}@anaue.com.br5204000053039865${amount.toFixed(2)}5802BR5925ANAU AMAZONIA ECOLODGE6009SAO PAULO62070503***6304`,
    ticketUrl: '#',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export interface PixDisplayResult extends CreatePixPaymentResult {
  /** Estado do pagamento no gateway: 'pending' exibe o QR; demais não. */
  paymentStatus?: string;
}

/**
 * Dados do PIX para a tela de sucesso, buscados NO GATEWAY e vinculados à
 * reserva. Substitui a leitura de QR/copia-e-cola de parâmetros da URL —
 * que permitia montar um link no domínio oficial com a chave PIX de terceiros.
 */
export async function getPixPaymentForBookingAction(
  bookingId: string,
  paymentId: number
): Promise<PixDisplayResult> {
  if (!isOnlineBookingEnabled()) {
    return { success: false, error: ONLINE_BOOKING_DISABLED_MESSAGE };
  }
  const safeId = normalizeBookingId(bookingId);
  if (!safeId) return { success: false, error: 'Reserva inválida.' };

  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      if (!isIntegrationMockAllowed()) {
        return { success: false, error: 'Pagamento PIX indisponível no momento.' };
      }
      const mockBooking = mockData.getReservationById(safeId);
      if (!mockBooking || mockBooking.status !== 'pending') {
        return { success: false, paymentStatus: mockBooking?.status, error: 'Não há PIX pendente para esta reserva.' };
      }
      return { ...mockPixFor(mockBooking.id, mockBooking.totalPrice), paymentStatus: 'pending' };
    }

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return { success: false, error: 'Pagamento inválido.' };
    }
    const { charge, payment } = await getActivePaymentGateway().getPixCharge(String(paymentId));
    if (normalizeBookingId(payment.external_reference) !== safeId) {
      return { success: false, error: 'Este pagamento não pertence a esta reserva.' };
    }
    if (payment.status !== 'pending') {
      // Aprovado, expirado, recusado ou estornado: não exibe QR para pagamento
      return { success: false, paymentStatus: payment.status };
    }
    return {
      success: true,
      paymentStatus: 'pending',
      paymentId: Number(charge.providerPaymentId),
      qrCodeBase64: charge.qrCodeBase64,
      copiaECola: charge.copiaECola,
      ticketUrl: charge.ticketUrl,
      // MP sempre informa o vencimento do PIX; fallback conservador de 30 min
      expiresAt: charge.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  } catch (err) {
    console.error('[getPixPaymentForBookingAction] Falha ao consultar PIX:', err);
    return { success: false, error: 'Não foi possível carregar o PIX agora. Atualize a página em instantes.' };
  }
}

/**
 * Verifica o status de um pagamento pelo ID.
 */
export async function checkPaymentStatusAction(
  paymentId: number
): Promise<{ status: string; statusDetail: string }> {
  if (!process.env.MP_ACCESS_TOKEN) {
    return { status: 'pending', statusDetail: 'mock_mode' };
  }

  try {
    const payment = await getPaymentStatus(paymentId);
    return {
      status: payment.status,
      statusDetail: payment.status_detail,
    };
  } catch {
    return { status: 'error', statusDetail: 'Erro ao consultar pagamento.' };
  }
}

/**
 * Confirmação manual pela equipe a partir de um pagamento do Mercado Pago.
 * Busca o pagamento na API do MP e só confirma se aprovado, da mesma
 * reserva e com valor pago igual ao total calculado no servidor.
 * (Pagamento recebido por outro meio: use a mudança de status no painel.)
 */
export async function confirmBookingPayment(
  bookingId: string,
  paymentId?: number
): Promise<{ success: boolean; outcome?: ConfirmationOutcome; error?: string }> {
  // Sem esta checagem, qualquer pessoa confirmaria uma reserva sem pagar.
  if (!(await isStaff())) return { success: false, error: UNAUTHORIZED_MESSAGE };
  const safeId = normalizeBookingId(bookingId);
  if (!safeId) return { success: false, error: 'ID da reserva inválido.' };

  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      if (!isIntegrationMockAllowed()) {
        return { success: false, error: 'Mercado Pago não configurado: não é possível verificar o pagamento.' };
      }
      // Desenvolvimento: simula um pagamento aprovado com o valor da reserva
      const booking = await mockConfirmationRepository.getBooking(safeId);
      if (!booking) return { success: false, outcome: 'booking_not_found', error: 'Reserva não encontrada.' };
      const r = await confirmBookingFromPayment(
        { id: 'mock', status: 'approved', transaction_amount: booking.totalPrice, external_reference: safeId, currency_id: 'BRL' },
        isSupabaseConfigured() ? supabaseConfirmationRepository : mockConfirmationRepository
      );
      return { success: r.outcome === 'confirmed' || r.outcome === 'already_confirmed', outcome: r.outcome };
    }

    if (!Number.isInteger(paymentId) || (paymentId as number) <= 0) {
      return { success: false, error: 'Informe o ID do pagamento do Mercado Pago.' };
    }
    const payment = await getActivePaymentGateway().getPayment(String(paymentId));
    if (normalizeBookingId(payment.external_reference) !== safeId) {
      return { success: false, outcome: 'invalid_reference', error: 'Este pagamento não pertence a esta reserva.' };
    }
    const repo = isSupabaseConfigured()
      ? supabaseConfirmationRepository
      : isMockDataAllowed()
        ? mockConfirmationRepository
        : null;
    if (!repo) return { success: false, error: 'Banco de dados indisponível.' };
    const r = await confirmBookingFromPayment(payment, repo);
    const messages: Partial<Record<ConfirmationOutcome, string>> = {
      not_approved: 'Pagamento ainda não aprovado.',
      amount_mismatch: `Valor pago (R$ ${r.paid}) diferente do total da reserva (R$ ${r.due}). Reserva não confirmada.`,
      currency_mismatch: 'Moeda do pagamento inválida.',
      booking_not_found: 'Reserva não encontrada.',
      not_pending: 'A reserva não está mais pendente.',
    };
    const ok = r.outcome === 'confirmed' || r.outcome === 'already_confirmed';
    await recordPaymentEvent({
      type: 'manual_confirmation',
      environment: getPaymentIntegrationStatus().environment,
      paymentId: payment.id,
      bookingId: safeId,
      paymentStatus: payment.status,
      outcome: r.outcome,
      amount: Number(payment.transaction_amount),
    });
    if (r.outcome === 'confirmed') await sendPaymentConfirmedEmail(safeId);
    return { success: ok, outcome: r.outcome, error: ok ? undefined : messages[r.outcome] };
  } catch (err) {
    console.error('[confirmBookingPayment] Erro:', err);
    return { success: false, error: 'Não foi possível verificar o pagamento agora.' };
  }
}

// ─── Gerador de QR Code mock (SVG base64) ───────────────────

function generateMockQrCodeBase64(): string {
  // Gera um SVG simples de QR code para demonstração
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <rect width="300" height="300" fill="white"/>
    <g fill="black">
      <rect x="20" y="20" width="60" height="60"/>
      <rect x="80" y="20" width="20" height="20"/>
      <rect x="120" y="20" width="20" height="20"/>
      <rect x="160" y="20" width="20" height="20"/>
      <rect x="220" y="20" width="60" height="60"/>
      <rect x="20" y="80" width="20" height="20"/>
      <rect x="60" y="80" width="20" height="20"/>
      <rect x="100" y="80" width="20" height="20"/>
      <rect x="140" y="80" width="20" height="20"/>
      <rect x="200" y="80" width="20" height="20"/>
      <rect x="260" y="80" width="20" height="20"/>
      <rect x="20" y="120" width="20" height="20"/>
      <rect x="80" y="120" width="60" height="60"/>
      <rect x="160" y="120" width="20" height="20"/>
      <rect x="220" y="120" width="20" height="20"/>
      <rect x="20" y="220" width="60" height="60"/>
      <rect x="100" y="200" width="20" height="20"/>
      <rect x="140" y="220" width="20" height="20"/>
      <rect x="180" y="200" width="20" height="20"/>
      <rect x="220" y="220" width="60" height="60"/>
      <rect x="100" y="260" width="20" height="20"/>
      <rect x="180" y="260" width="20" height="20"/>
    </g>
    <text x="150" y="150" text-anchor="middle" font-size="10" fill="#666" font-family="monospace">PIX - ANAUÊ</text>
  </svg>`;

  return Buffer.from(svg).toString('base64');
}

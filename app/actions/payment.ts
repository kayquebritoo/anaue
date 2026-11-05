'use server';

// ============================================================
// app/actions/payment.ts
// Server Actions — Integração Mercado Pago (PIX)
// ============================================================

import { createPixPayment, getPaymentStatus, type PixPaymentResponse } from '@/lib/mercadopago';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import { isStaff, UNAUTHORIZED_MESSAGE } from '@/lib/authz';
import { normalizeBookingId } from '@/lib/queryInput';
import { isIntegrationMockAllowed } from '@/lib/dataMode';

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
  // Verificar se MP_ACCESS_TOKEN está configurado
  if (!process.env.MP_ACCESS_TOKEN) {
    // Em produção, nunca exibir QR Code PIX falso ao hóspede
    if (!isIntegrationMockAllowed()) {
      console.error('[createPixPaymentAction] MP_ACCESS_TOKEN ausente em produção.');
      return { success: false, error: 'Pagamento PIX indisponível no momento. Sua reserva foi registrada; entre em contato para concluir o pagamento.' };
    }
    // Modo mock (desenvolvimento): simular pagamento PIX sem Mercado Pago real
    const mockQrCode = `00020126580014br.gov.bcb.pix0136${bookingId}@anaue.com.br5204000053039865${amount.toFixed(2)}5802BR5925ANAU AMAZONIA ECOLODGE6009SAO PAULO62070503***6304`;
    const mockBase64 = generateMockQrCodeBase64();

    return {
      success: true,
      paymentId: Date.now(),
      qrCodeBase64: mockBase64,
      copiaECola: mockQrCode,
      ticketUrl: '#',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
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
  if (Number(booking.total_price) !== Number(amount)) {
    console.warn('[createPixPaymentAction] Valor enviado pelo cliente difere do registrado; usando o valor da reserva.');
  }

  try {
    const payment = await createPixPayment({
      amount: Number(booking.total_price),
      description: `Reserva Anauê — ${booking.booking_code}`,
      email: booking.guest_email || email,
      externalReference: booking.id,
    });

    // Extrair QR code da resposta
    const qrCodeBase64 =
      payment.point_of_interaction?.transaction_data?.qr_code_base64 ||
      payment.qr_code_base64 ||
      '';

    const copiaECola =
      payment.point_of_interaction?.transaction_data?.qr_code ||
      payment.qr_code ||
      '';

    const ticketUrl =
      payment.point_of_interaction?.transaction_data?.redirect_url ||
      payment.ticket_url ||
      '';

    return {
      success: true,
      paymentId: payment.id,
      qrCodeBase64,
      copiaECola,
      ticketUrl,
      expiresAt: payment.date_of_expiration,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar pagamento PIX.',
    };
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
 * Confirma uma reserva (atualiza status para confirmed) após pagamento aprovado.
 */
export async function confirmBookingPayment(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  // Sem esta checagem, qualquer pessoa confirmaria uma reserva sem pagar.
  if (!(await isStaff())) return { success: false, error: UNAUTHORIZED_MESSAGE };
  const safeId = normalizeBookingId(bookingId);
  if (!safeId) return { success: false, error: 'ID da reserva inválido.' };

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', safeId)
      .eq('status', 'pending'); // Só atualiza se ainda estiver pendente

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Mock: atualizar status localmente
    mockData.updateReservationStatus(safeId, 'confirmed');
  }

  return { success: true };
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

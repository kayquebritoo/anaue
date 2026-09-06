'use server';

// ============================================================
// app/actions/payment.ts
// Server Actions — Integração Mercado Pago (PIX)
// ============================================================

import { createPixPayment, getPaymentStatus, type PixPaymentResponse } from '@/lib/mercadopago';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';

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
  description: string
): Promise<CreatePixPaymentResult> {
  // Verificar se MP_ACCESS_TOKEN está configurado
  if (!process.env.MP_ACCESS_TOKEN) {
    // Modo mock: simular pagamento PIX sem Mercado Pago real
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

  try {
    const payment = await createPixPayment({
      amount,
      description,
      email,
      externalReference: bookingId,
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
  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .eq('status', 'pending'); // Só atualiza se ainda estiver pendente

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Mock: atualizar status localmente
    mockData.updateReservationStatus(bookingId, 'confirmed');
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

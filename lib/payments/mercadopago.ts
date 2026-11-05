// ============================================================
// lib/payments/mercadopago.ts
// Adaptador Mercado Pago para o contrato PaymentGateway.
// ============================================================

import { createPixPayment, getPaymentStatus, type PaymentStatusResponse } from '@/lib/mercadopago';
import type { PaymentSnapshot } from '@/lib/paymentConfirmation';
import { verifyMercadoPagoSignature } from '@/lib/mercadopagoSignature';
import type { PaymentGateway } from '@/lib/payments/types';

async function fetchPayment(providerPaymentId: string): Promise<PaymentStatusResponse> {
  const id = Number(providerPaymentId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('ID de pagamento Mercado Pago inválido.');
  return getPaymentStatus(id);
}

function toSnapshot(p: PaymentStatusResponse): PaymentSnapshot {
  return {
    id: p.id,
    status: p.status, // 'approved' = creditado
    status_detail: p.status_detail ?? null,
    transaction_amount: Number(p.transaction_amount),
    external_reference: p.external_reference ?? null,
    currency_id: p.currency_id ?? null,
  };
}

export const mercadoPagoGateway: PaymentGateway = {
  id: 'mercadopago',

  isConfigured() {
    return Boolean(process.env.MP_ACCESS_TOKEN);
  },

  async createPixCharge(req) {
    const payment = await createPixPayment({
      amount: req.amount,
      description: `Reserva Anauê — ${req.bookingCode}`,
      email: req.payerEmail,
      externalReference: req.bookingId,
      // Determinística por reserva + valor: clique duplo/reenvio não gera 2 cobranças
      idempotencyKey: `anaue-pix-${req.bookingId}-${Math.round(req.amount * 100)}`,
    });
    return {
      providerPaymentId: String(payment.id),
      qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || payment.qr_code_base64 || '',
      copiaECola: payment.point_of_interaction?.transaction_data?.qr_code || payment.qr_code || '',
      ticketUrl: payment.point_of_interaction?.transaction_data?.redirect_url || payment.ticket_url || '',
      expiresAt: payment.date_of_expiration,
    };
  },

  async getPayment(providerPaymentId) {
    return toSnapshot(await fetchPayment(providerPaymentId));
  },

  async getPixCharge(providerPaymentId) {
    const p = await fetchPayment(providerPaymentId);
    const td = p.point_of_interaction?.transaction_data ?? {};
    return {
      payment: toSnapshot(p),
      charge: {
        providerPaymentId: String(p.id),
        qrCodeBase64: td.qr_code_base64 || '',
        copiaECola: td.qr_code || '',
        ticketUrl: td.ticket_url || td.redirect_url || '',
        expiresAt: p.date_of_expiration,
      },
    };
  },

  verifyWebhook({ headers, url }) {
    return verifyMercadoPagoSignature({
      secret: process.env.MP_WEBHOOK_SECRET,
      xSignature: headers.get('x-signature'),
      xRequestId: headers.get('x-request-id'),
      dataId: url.searchParams.get('data.id') || url.searchParams.get('id'),
    });
  },
};

// ============================================================
// lib/payments/mercadopago.ts
// Adaptador Mercado Pago para o contrato PaymentGateway.
// ============================================================

import { createPixPayment, getPaymentStatus } from '@/lib/mercadopago';
import { verifyMercadoPagoSignature } from '@/lib/mercadopagoSignature';
import type { PaymentGateway } from '@/lib/payments/types';

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
    const id = Number(providerPaymentId);
    if (!Number.isInteger(id) || id <= 0) throw new Error('ID de pagamento Mercado Pago inválido.');
    const p = await getPaymentStatus(id);
    return {
      id: p.id,
      status: p.status, // 'approved' = creditado
      transaction_amount: Number(p.transaction_amount),
      external_reference: p.external_reference ?? null,
      currency_id: p.currency_id ?? null,
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

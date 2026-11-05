// ============================================================
// lib/payments/types.ts
// Contrato de gateway de pagamento. Hoje só o Mercado Pago está
// implementado; um segundo gateway (ex.: PagBank) entra implementando
// esta interface — sem mudar checkout, preço ou confirmação.
// Ver docs/payment-gateways.md.
// ============================================================

import type { PaymentSnapshot } from '@/lib/paymentConfirmation';

export type PaymentProviderId = 'mercadopago' | 'pagbank';

export interface PixChargeRequest {
  /** ID interno da reserva (vira a referência externa no gateway). */
  bookingId: string;
  bookingCode: string;
  /** Valor calculado e gravado pelo servidor — nunca vindo do navegador. */
  amount: number;
  payerEmail: string;
}

export interface PixCharge {
  providerPaymentId: string;
  qrCodeBase64: string;
  copiaECola: string;
  ticketUrl: string;
  expiresAt?: string;
}

export interface WebhookVerificationInput {
  headers: Headers;
  url: URL;
  rawBody?: string;
}

export type WebhookVerification = 'valid' | 'invalid' | 'not_configured';

export interface PaymentGateway {
  readonly id: PaymentProviderId;
  /** Credenciais presentes no ambiente. */
  isConfigured(): boolean;
  createPixCharge(req: PixChargeRequest): Promise<PixCharge>;
  /**
   * Consulta o pagamento NA API DO GATEWAY (nunca confiar no corpo da
   * notificação) e normaliza para PaymentSnapshot: status 'approved' só
   * quando o dinheiro foi efetivamente recebido; valor em reais; moeda.
   */
  getPayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  verifyWebhook(input: WebhookVerificationInput): WebhookVerification;
}

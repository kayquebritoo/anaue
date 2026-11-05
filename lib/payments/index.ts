// ============================================================
// lib/payments/index.ts
// Seleção do gateway ativo por PAYMENT_PROVIDER (padrão: mercadopago).
// 'pagbank' está reservado mas NÃO implementado: selecioná-lo falha de
// forma explícita em vez de cair silenciosamente em outro gateway.
// ============================================================

import { mercadoPagoGateway } from '@/lib/payments/mercadopago';
import type { PaymentGateway, PaymentProviderId } from '@/lib/payments/types';

const REGISTRY: Partial<Record<PaymentProviderId, PaymentGateway>> = {
  mercadopago: mercadoPagoGateway,
  // pagbank: pagBankGateway,  ← futuro (docs/payment-gateways.md)
};

export class PaymentGatewayUnavailableError extends Error {
  constructor(provider: string) {
    super(`Gateway de pagamento "${provider}" não está disponível nesta versão.`);
    this.name = 'PaymentGatewayUnavailableError';
  }
}

export function getActivePaymentGateway(): PaymentGateway {
  const provider = (process.env.PAYMENT_PROVIDER || 'mercadopago').trim().toLowerCase();
  const gateway = REGISTRY[provider as PaymentProviderId];
  if (!gateway) throw new PaymentGatewayUnavailableError(provider);
  return gateway;
}

export function getPaymentGateway(id: PaymentProviderId): PaymentGateway {
  const gateway = REGISTRY[id];
  if (!gateway) throw new PaymentGatewayUnavailableError(id);
  return gateway;
}

export type { PaymentGateway, PaymentProviderId } from '@/lib/payments/types';

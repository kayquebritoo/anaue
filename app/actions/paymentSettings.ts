'use server';

// ============================================================
// app/actions/paymentSettings.ts
// Painel → Configurações → Pagamentos. Somente equipe autenticada.
// Nenhuma resposta contém Access Token, segredo do webhook ou parte deles.
// Não há edição de credenciais pelo painel (MVP): elas ficam em
// variáveis protegidas da Vercel.
// ============================================================

import { isStaff, UNAUTHORIZED_MESSAGE } from '@/lib/authz';
import {
  getPaymentIntegrationStatus,
  testMercadoPagoConnection,
  type ConnectionTestResult,
  type PaymentIntegrationStatus,
} from '@/lib/payments/diagnostics';
import { listPaymentEvents, recordPaymentEvent, type PaymentEventsResult } from '@/lib/payments/events';

export type PaymentSettingsResult =
  | { success: true; status: PaymentIntegrationStatus; events: PaymentEventsResult }
  | { success: false; error: string };

export async function getPaymentSettingsAction(): Promise<PaymentSettingsResult> {
  if (!(await isStaff())) return { success: false, error: UNAUTHORIZED_MESSAGE };
  const status = getPaymentIntegrationStatus();
  const events = await listPaymentEvents(30);
  return { success: true, status, events };
}

export async function testPaymentConnectionAction(): Promise<
  { success: true; result: ConnectionTestResult } | { success: false; error: string }
> {
  if (!(await isStaff())) return { success: false, error: UNAUTHORIZED_MESSAGE };
  const result = await testMercadoPagoConnection();
  await recordPaymentEvent({
    type: 'connection_test',
    environment: getPaymentIntegrationStatus().environment,
    outcome: result.ok ? 'ok' : result.errorKind ?? 'error',
    detail: result.message,
  });
  return { success: true, result };
}

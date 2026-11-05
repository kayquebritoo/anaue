// ============================================================
// lib/payments/events.ts
// Histórico de eventos de pagamento para o painel (tabela payment_events,
// migration 20261106000000). Gravação de MELHOR ESFORÇO: se a tabela
// ainda não existe ou o servidor não tem permissão (produção sem a chave
// secreta), o evento é descartado sem afetar pagamento/reserva.
//
// Não grava dados pessoais nem credenciais: só IDs, status, resultado e valor.
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isMockDataAllowed } from '@/lib/dataMode';

export type PaymentEventType = 'webhook' | 'webhook_rejected' | 'pix_created' | 'manual_confirmation' | 'connection_test';

export interface PaymentEventInput {
  type: PaymentEventType;
  environment?: 'test' | 'production' | 'unknown';
  paymentId?: string | number | null;
  bookingId?: string | null;
  paymentStatus?: string | null;
  outcome?: string | null;
  amount?: number | null;
  detail?: string | null;
}

export interface PaymentEvent extends Required<Omit<PaymentEventInput, 'paymentId'>> {
  id: string;
  createdAt: string;
  paymentId: string | null;
}

export type PaymentEventsResult =
  | { available: true; events: PaymentEvent[] }
  | { available: false; reason: string; events: [] };

// Desenvolvimento/testes sem Supabase: memória do processo
const memoryEvents: PaymentEvent[] = [];

const clip = (v: unknown, n = 120) => (v === null || v === undefined ? null : String(v).slice(0, n));

export async function recordPaymentEvent(input: PaymentEventInput): Promise<void> {
  const row = {
    provider: 'mercadopago',
    environment: input.environment ?? null,
    event_type: input.type,
    payment_id: clip(input.paymentId, 40),
    booking_id: clip(input.bookingId, 40),
    payment_status: clip(input.paymentStatus, 40),
    outcome: clip(input.outcome, 40),
    amount: typeof input.amount === 'number' && Number.isFinite(input.amount) ? input.amount : null,
    detail: clip(input.detail, 200),
  };

  try {
    if (isSupabaseConfigured()) {
      // Tipagem gerada ainda não conhece a tabela nova (migration pendente em produção)
      const { error } = await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<{ error: unknown }> } })
        .from('payment_events')
        .insert(row);
      if (error) console.warn('[payment_events] evento não registrado (tabela ausente ou sem permissão).');
      return;
    }
    if (isMockDataAllowed()) {
      memoryEvents.unshift({
        id: String(memoryEvents.length + 1),
        createdAt: new Date().toISOString(),
        type: input.type,
        environment: row.environment as PaymentEvent['environment'],
        paymentId: row.payment_id,
        bookingId: row.booking_id as string,
        paymentStatus: row.payment_status as string,
        outcome: row.outcome as string,
        amount: row.amount as number,
        detail: row.detail as string,
      });
      memoryEvents.splice(200);
    }
  } catch {
    // nunca interfere no fluxo de pagamento
  }
}

export async function listPaymentEvents(limit = 50): Promise<PaymentEventsResult> {
  const n = Math.min(Math.max(1, limit), 200);
  if (!isSupabaseConfigured()) {
    return isMockDataAllowed()
      ? { available: true, events: memoryEvents.slice(0, n) }
      : { available: false, reason: 'Banco de dados não configurado.', events: [] };
  }

  // Leitura com a SESSÃO da equipe (cookie): a política RLS "somente equipe"
  // é aplicada pelo próprio banco, sem depender da chave secreta do servidor.
  let reader: unknown;
  try {
    const { createClientServer } = await import('@/lib/supabaseServer');
    reader = await createClientServer();
  } catch {
    return { available: false, reason: 'Sessão indisponível para ler o histórico.', events: [] };
  }

  const { data, error } = await (reader as {
    from: (t: string) => { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null; error: { code?: string } | null }> } } };
  })
    .from('payment_events')
    .select('id, created_at, event_type, environment, payment_id, booking_id, payment_status, outcome, amount, detail')
    .order('created_at', { ascending: false })
    .limit(n);

  if (error) {
    const missing = error.code === '42P01' || error.code === 'PGRST205';
    return {
      available: false,
      reason: missing
        ? 'Histórico disponível após aplicar a migration 20261106000000_payment_events.'
        : 'Não foi possível carregar o histórico agora.',
      events: [],
    };
  }

  return {
    available: true,
    events: (data ?? []).map((r) => ({
      id: String(r.id),
      createdAt: String(r.created_at),
      type: r.event_type as PaymentEventType,
      environment: (r.environment as PaymentEvent['environment']) ?? 'unknown',
      paymentId: (r.payment_id as string) ?? null,
      bookingId: (r.booking_id as string) ?? '',
      paymentStatus: (r.payment_status as string) ?? '',
      outcome: (r.outcome as string) ?? '',
      amount: r.amount === null || r.amount === undefined ? (null as unknown as number) : Number(r.amount),
      detail: (r.detail as string) ?? '',
    })),
  };
}

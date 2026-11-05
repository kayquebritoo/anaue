// ============================================================
// scripts/test-staging.ts
// Testes de aceitação contra um Supabase de STAGING (nunca produção).
//
// Exercita o código REAL do app (createBookingAction, cálculo de preço,
// confirmação de pagamento) contra PostgreSQL + PostgREST reais, com
// conexões concorrentes de verdade — complementa os testes em PGlite.
//
// Uso:
//   STAGING_SUPABASE_URL=https://<ref-staging>.supabase.co \
//   STAGING_SUPABASE_ANON_KEY=<publishable de staging> \
//   STAGING_SUPABASE_SERVICE_ROLE_KEY=<secret de staging> \
//   [STAGING_STAFF_EMAIL=... STAGING_STAFF_PASSWORD=...] \
//   [STAGING_NONSTAFF_EMAIL=... STAGING_NONSTAFF_PASSWORD=...] \
//   npm run test:staging
//
// TRAVAS DE SEGURANÇA:
//  - Recusa o projeto de produção (ref fixo abaixo + ANAUE_PRODUCTION_REF).
//  - Não lê .env.local; só variáveis STAGING_* (do ambiente ou de .env.staging.local).
//  - Dados de teste: hóspede "TESTE-STAGING-<run>", datas em 2091+, apagados ao final.
//  - Sem e-mail (RESEND/SMTP apagados) e sem Mercado Pago (API não é chamada).
// ============================================================

import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

// Opcional: .env.staging.local (ignorado pelo git). Só chaves STAGING_* são
// aceitas — evita colar segredos no terminal/chat e nunca carrega produção.
(() => {
  const file = resolvePath(process.cwd(), '.env.staging.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(STAGING_[A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const PRODUCTION_REFS = ['yjtbwxjxhfkxrmdurgdu', ...(process.env.ANAUE_PRODUCTION_REF || '').split(',').filter(Boolean)];

function fail(msg: string): never {
  console.error(`\n⛔ ${msg}\n`);
  process.exit(2);
}

const STAGING_URL = (process.env.STAGING_SUPABASE_URL || '').trim();
const STAGING_ANON = (process.env.STAGING_SUPABASE_ANON_KEY || '').trim();
const STAGING_SERVICE = (process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '').trim();

export function assertStagingTarget(url: string): void {
  if (!url) fail('Defina STAGING_SUPABASE_URL (projeto de staging).');
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    fail('STAGING_SUPABASE_URL inválida.');
  }
  if (PRODUCTION_REFS.some((ref) => host.includes(ref))) {
    fail('STAGING_SUPABASE_URL aponta para o projeto de PRODUÇÃO. Abortado — nada foi executado.');
  }
  const isSupabaseCloud = /^[a-z0-9]{20}\.supabase\.co$/.test(host);
  const isLocal = host === '127.0.0.1' || host === 'localhost';
  if (!isSupabaseCloud && !isLocal) fail(`Host inesperado para staging: ${host}`);
}

assertStagingTarget(STAGING_URL);
if (!STAGING_ANON || !STAGING_SERVICE) fail('Defina STAGING_SUPABASE_ANON_KEY e STAGING_SUPABASE_SERVICE_ROLE_KEY.');

// O app passa a enxergar o staging (antes de qualquer import do app)
for (const k of ['RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'ANAUE_ALLOW_MOCK_DATA', 'ANAUE_STAFF_EMAILS']) {
  delete process.env[k];
}
const env = process.env as Record<string, string | undefined>;
env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = STAGING_ANON;
env.SUPABASE_SERVICE_ROLE_KEY = STAGING_SERVICE;
env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const RUN = `TESTE-STAGING-${Date.now().toString(36)}`;
const YEAR = 2091 + Math.floor(Math.random() * 8); // evita colisão com execuções anteriores
const d = (month: number, day: number) => `${YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

let admin: SupabaseClient; // service role (ignora RLS) — só para preparar/limpar
let anon: SupabaseClient;
let roomId: string;
let roomPrice: number;
let roomMaxGuests: number;

const code = (e: unknown) => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '');

async function rawBooking(inDate: string, outDate: string, status = 'confirmed', room = roomId) {
  return admin
    .from('bookings')
    .insert({ room_id: room, guest_name: RUN, guest_email: 'staging@example.com', check_in_date: inDate, check_out_date: outDate, total_price: 1, status })
    .select('id')
    .single();
}

const input = (checkIn: string, checkOut: string, extra: Record<string, unknown> = {}) => ({
  roomId,
  checkIn,
  checkOut,
  guests: 1,
  guestName: RUN,
  guestEmail: 'staging@example.com',
  guestPhone: '92999999999',
  paymentMethod: 'pix' as const,
  ...extra,
});

before(async () => {
  admin = createClient(STAGING_URL, STAGING_SERVICE, { auth: { persistSession: false } });
  anon = createClient(STAGING_URL, STAGING_ANON, { auth: { persistSession: false } });
  const { data, error } = await admin.from('rooms').select('id, price_per_night, max_guests, is_available').eq('is_available', true).order('id').limit(1);
  if (error || !data?.length) fail(`Não foi possível ler quartos do staging: ${error?.message ?? 'nenhum quarto'}`);
  roomId = data[0].id;
  roomPrice = Number(data[0].price_per_night);
  roomMaxGuests = data[0].max_guests;
  console.log(`ℹ️  staging ok · quarto ${roomId} (R$ ${roomPrice}/noite, máx ${roomMaxGuests}) · ano ${YEAR} · marcador ${RUN}`);
});

after(async () => {
  if (!admin) return;
  await admin.from('room_blocks').delete().like('notes', `${RUN}%`);
  const { error } = await admin.from('bookings').delete().eq('guest_name', RUN);
  console.log(error ? `⚠️  limpeza incompleta: ${error.message}` : `🧹 dados de teste removidos (${RUN})`);
});

describe('1. Migrations ativas (comportamento do banco)', () => {
  test('exclusion constraint recusa sobreposição (23P01)', async () => {
    assert.equal((await rawBooking(d(1, 10), d(1, 15))).error, null);
    const dup = await rawBooking(d(1, 12), d(1, 13));
    assert.equal(code(dup.error), '23P01', `esperado 23P01, veio ${code(dup.error)} — migration de integridade aplicada?`);
  });

  test('CHECK de datas (23514) e período adjacente permitido', async () => {
    assert.equal(code((await rawBooking(d(1, 20), d(1, 20))).error), '23514');
    assert.equal((await rawBooking(d(1, 15), d(1, 18))).error, null, 'check-out = check-in seguinte deve ser aceito');
  });

  test('trigger reserva × bloqueio (AN001) e bloqueio × reserva (AN002)', async () => {
    const block = await admin.from('room_blocks').insert({ room_id: roomId, start_date: d(2, 1), end_date: d(2, 5), notes: `${RUN} manutenção` });
    assert.equal(block.error, null);
    assert.equal(code((await rawBooking(d(2, 3), d(2, 7))).error), 'AN001');
    assert.equal((await rawBooking(d(2, 10), d(2, 12))).error, null);
    const over = await admin.from('room_blocks').insert({ room_id: roomId, start_date: d(2, 11), end_date: d(2, 13), notes: `${RUN} conflito` });
    assert.equal(code(over.error), 'AN002');
  });

  test('cancelar libera; reativar sobre período ocupado é recusado', async () => {
    const first = await rawBooking(d(3, 1), d(3, 5));
    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', first.data!.id);
    assert.equal((await rawBooking(d(3, 2), d(3, 4))).error, null, 'período liberado após cancelamento');
    const reactivate = await admin.from('bookings').update({ status: 'confirmed' }).eq('id', first.data!.id);
    assert.equal(code(reactivate.error), '23P01');
  });
});

describe('2. RLS — dados pessoais protegidos', () => {
  test('anônimo não lê reservas, cupons, bloqueios nem governança', async () => {
    for (const table of ['bookings', 'coupons', 'room_blocks', 'housekeeping']) {
      const { data, error } = await anon.from(table).select('*').limit(5);
      assert.ok(error || (data ?? []).length === 0, `${table} visível para anônimo — migration de RLS aplicada?`);
    }
  });

  test('anônimo não insere nem altera reservas', async () => {
    const ins = await anon.from('bookings').insert({ room_id: roomId, guest_name: RUN, guest_email: 'x@x.com', check_in_date: d(4, 1), check_out_date: d(4, 2), total_price: 1 });
    assert.ok(ins.error, 'anônimo conseguiu inserir reserva');
    const upd = await anon.from('bookings').update({ total_price: 0 }).eq('guest_name', RUN).select('id');
    assert.ok(upd.error || (upd.data ?? []).length === 0, 'anônimo conseguiu alterar reserva');
  });

  test('catálogo continua público', async () => {
    const { data, error } = await anon.from('rooms').select('id').limit(1);
    assert.equal(error, null);
    assert.ok((data ?? []).length > 0);
  });

  test('equipe vê reservas; usuário fora de staff_members não vê', { skip: !process.env.STAGING_STAFF_EMAIL && 'defina STAGING_STAFF_EMAIL/PASSWORD' }, async () => {
    const staff = createClient(STAGING_URL, STAGING_ANON, { auth: { persistSession: false } });
    const login = await staff.auth.signInWithPassword({ email: process.env.STAGING_STAFF_EMAIL!, password: process.env.STAGING_STAFF_PASSWORD! });
    assert.equal(login.error, null, `login da equipe falhou: ${login.error?.message}`);
    const { data } = await staff.from('bookings').select('id').eq('guest_name', RUN);
    assert.ok((data ?? []).length > 0, 'equipe não enxerga reservas — staff_members cadastrado?');

    if (process.env.STAGING_NONSTAFF_EMAIL) {
      const other = createClient(STAGING_URL, STAGING_ANON, { auth: { persistSession: false } });
      await other.auth.signInWithPassword({ email: process.env.STAGING_NONSTAFF_EMAIL, password: process.env.STAGING_NONSTAFF_PASSWORD! });
      const r = await other.from('bookings').select('id').limit(1);
      assert.equal((r.data ?? []).length, 0, 'usuário fora da equipe enxerga reservas');
    }
  });
});

describe('3. Checkout real (código do app) contra o staging', () => {
  test('10 reservas simultâneas no mesmo quarto/período → exatamente 1', async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const results = await Promise.all(Array.from({ length: 10 }, () => createBookingAction(input(d(5, 1), d(5, 4)))));
    const ok = results.filter((r) => r.success);
    assert.equal(ok.length, 1, JSON.stringify(results.map((r) => r.error ?? 'ok')));
    const { count } = await admin.from('bookings').select('id', { count: 'exact', head: true }).eq('guest_name', RUN).eq('check_in_date', d(5, 1)).neq('status', 'cancelled');
    assert.equal(count, 1);
  });

  test('preço calculado no servidor com as tarifas do staging; valor adulterado recusado', async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const nights = 2;
    const expected = roomPrice * nights - Math.round(roomPrice * nights * 0.05);
    const tampered = await createBookingAction(input(d(6, 1), d(6, 3), { totalPrice: 1 }));
    assert.equal(tampered.success, false);
    const ok = await createBookingAction(input(d(6, 1), d(6, 3), { totalPrice: expected }));
    assert.equal(ok.success, true, ok.error);
    const { data } = await admin.from('bookings').select('total_price, discount_price, status').eq('id', ok.bookingId!).single();
    assert.equal(Number(data!.total_price), expected);
    assert.equal(data!.status, 'pending');
  });

  test('bloqueio impede checkout com mensagem clara', async () => {
    await admin.from('room_blocks').insert({ room_id: roomId, start_date: d(7, 1), end_date: d(7, 10), notes: `${RUN} bloqueio checkout` });
    const { createBookingAction } = await import('../app/actions/booking');
    const r = await createBookingAction(input(d(7, 3), d(7, 5)));
    assert.equal(r.success, false);
    assert.match(r.error ?? '', /bloqueado/);
  });

  test('busca pelo novo localizador encontra a reserva (visão pública mascarada)', async () => {
    const { createBookingAction, lookupBookingAction } = await import('../app/actions/booking');
    const created = await createBookingAction(input(d(8, 1), d(8, 2)));
    assert.equal(created.success, true, created.error);
    const found = await lookupBookingAction(created.bookingCode!.toLowerCase());
    assert.equal(found.success, true, found.error);
    assert.notEqual(found.reservation!.guestEmail, 'staging@example.com');
  });
});

describe('4. Confirmação de pagamento confere o valor (sem chamar o Mercado Pago)', () => {
  test('valor divergente mantém pendente; valor correto confirma; reenvio idempotente', async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const { confirmBookingFromPayment } = await import('../lib/paymentConfirmation');
    const { supabaseConfirmationRepository } = await import('../lib/paymentConfirmationRepo');
    const b = await createBookingAction(input(d(9, 1), d(9, 3)));
    assert.equal(b.success, true, b.error);
    const silent = { error: () => {}, warn: () => {} };
    const pay = (amount: number) => ({ id: 'staging', status: 'approved', transaction_amount: amount, external_reference: b.bookingId!, currency_id: 'BRL' });

    assert.equal((await confirmBookingFromPayment(pay(1), supabaseConfirmationRepository, silent)).outcome, 'amount_mismatch');
    let row = await admin.from('bookings').select('status').eq('id', b.bookingId!).single();
    assert.equal(row.data!.status, 'pending');

    assert.equal((await confirmBookingFromPayment(pay(b.reservation!.totalPrice), supabaseConfirmationRepository, silent)).outcome, 'confirmed');
    row = await admin.from('bookings').select('status').eq('id', b.bookingId!).single();
    assert.equal(row.data!.status, 'confirmed');
    assert.equal((await confirmBookingFromPayment(pay(b.reservation!.totalPrice), supabaseConfirmationRepository, silent)).outcome, 'already_confirmed');
  });
});

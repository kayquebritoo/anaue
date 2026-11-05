// ============================================================
// scripts/test-compat.ts
// Compatibilidade do PR #1 com um banco NO ESTADO ATUAL DA PRODUÇÃO
// (schema.sql, RLS público, SEM as migrations, servidor só com a chave
// pública) e com reservas online DESLIGADAS (pré-lançamento).
//
// Roda contra o STAGING antes de aplicar as migrations nele.
//   STAGING_SUPABASE_URL=... STAGING_SUPABASE_ANON_KEY=... npm run test:compat
//
// Travas: recusa o projeto de produção; não usa chave secreta; dados de
// teste com e-mail @exemplo.test, cancelados/removidos ao final.
// ============================================================

const PRODUCTION_REFS = ['yjtbwxjxhfkxrmdurgdu'];
const URL_ = (process.env.STAGING_SUPABASE_URL || '').trim();
const ANON = (process.env.STAGING_SUPABASE_ANON_KEY || '').trim();
if (!URL_ || !ANON) {
  console.error('⛔ Defina STAGING_SUPABASE_URL e STAGING_SUPABASE_ANON_KEY.');
  process.exit(2);
}
if (PRODUCTION_REFS.some((r) => URL_.includes(r))) {
  console.error('⛔ URL de PRODUÇÃO recusada. Nada foi executado.');
  process.exit(2);
}

for (const k of ['SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'ANAUE_ALLOW_MOCK_DATA', 'ANAUE_STAFF_EMAILS', 'VERCEL_ENV']) {
  delete process.env[k];
}
const env = process.env as Record<string, string | undefined>;
env.NEXT_PUBLIC_SUPABASE_URL = URL_;
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON; // como a produção hoje: só chave pública
env.NEXT_PUBLIC_ONLINE_BOOKING_ENABLED = 'false'; // pré-lançamento
env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

const RUN = `TESTE-COMPAT-${Date.now().toString(36)}`;
const YEAR = 2095 + Math.floor(Math.random() * 4);
const d = (m: number, day: number) => `${YEAR}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const created: string[] = [];
const createdBlocks: string[] = [];

type Authz = typeof import('../lib/authz');
let authz: Authz;
const asStaff = () => authz.__setStaffResolverForTests(async () => ({ id: 'staff-compat', email: null }));
const asPublic = () => authz.__setStaffResolverForTests(async () => null);

const quiet = <T>(fn: () => Promise<T>) => async () => {
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { log, warn });
  }
};

before(async () => {
  authz = await import('../lib/authz');
});

after(async () => {
  asStaff();
  const { updateBookingStatusAction } = await import('../app/actions/booking');
  const { deleteRoomBlockAction } = await import('../app/actions/roomBlock');
  for (const id of created) await updateBookingStatusAction(id, 'cancelled');
  for (const id of createdBlocks) await deleteRoomBlockAction(id);
  authz.__setStaffResolverForTests(null);
  console.log(`🧹 ${created.length} reserva(s) de teste canceladas, ${createdBlocks.length} bloqueio(s) removido(s) (${RUN})`);
});

describe('Páginas públicas leem o banco atual', () => {
  test('quartos, quarto por slug e experiências', async () => {
    const sd = await import('../lib/supabaseData');
    const rooms = await sd.getRoomsAsync();
    assert.ok(rooms.length >= 4, `quartos: ${rooms.length}`);
    assert.equal((await sd.getRoomBySlugAsync('bacuri'))?.id, 'room-001');
    assert.ok((await sd.getExperiencesAsync()).length >= 5);
    const avail = await (await import('../app/actions/availability')).getUnavailableRoomIdsAction(d(1, 1), d(1, 3));
    assert.equal(avail.success, true);
  });
});

describe('Pré-lançamento: nada público cria reserva ou cobrança', () => {
  test('checkout público recusado no servidor e nada é gravado', quiet(async () => {
    asPublic();
    const { createBookingAction } = await import('../app/actions/booking');
    const { supabase } = await import('../lib/supabase');
    const r = await createBookingAction({ roomId: 'room-001', checkIn: d(2, 1), checkOut: d(2, 3), guests: 2, guestName: RUN, guestEmail: 'compat@exemplo.test', paymentMethod: 'pix' });
    assert.equal(r.success, false);
    assert.match(r.error ?? '', /em breve/);
    const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('guest_name', RUN);
    assert.equal(count, 0);
  }));

  test('nenhum PIX criado nem exibido (fictício ou real)', quiet(async () => {
    const { createPixPaymentAction, getPixPaymentForBookingAction } = await import('../app/actions/payment');
    const a = await createPixPaymentAction('res-stg00002', 1691, 'x@exemplo.test', 'x');
    const b = await getPixPaymentForBookingAction('res-stg00002', 1);
    for (const r of [a, b]) {
      assert.equal(r.success, false);
      assert.equal(r.qrCodeBase64, undefined);
      assert.equal(r.copiaECola, undefined);
    }
  }));

  test('ações administrativas recusadas para anônimo', quiet(async () => {
    asPublic();
    const { updateBookingStatusAction } = await import('../app/actions/booking');
    const { createRoomBlockAction } = await import('../app/actions/roomBlock');
    assert.equal((await updateBookingStatusAction('res-00000001', 'cancelled')).success, false);
    assert.equal((await createRoomBlockAction({ roomId: 'room-001', startDate: d(3, 1), endDate: d(3, 2), reason: 'maintenance' })).success, false);
  }));
});

describe('Painel administrativo e reservas manuais continuam funcionando', () => {
  test('reserva manual confirmada pela equipe → gravada com preço do servidor', quiet(async () => {
    asStaff();
    const { createBookingAction } = await import('../app/actions/booking');
    const r = await createBookingAction({
      roomId: 'room-002', checkIn: d(4, 10), checkOut: d(4, 12), guests: 2, totalPrice: 1780,
      guestName: RUN, guestEmail: 'compat@exemplo.test', guestPhone: '92900000000',
      paymentMethod: 'pix', channel: 'manual', status: 'confirmed',
    });
    assert.equal(r.success, true, r.error);
    created.push(r.bookingId!);
    assert.equal(r.reservation!.totalPrice, 1780); // 890 × 2, sem desconto PIX no canal manual
    assert.equal(r.reservation!.status, 'confirmed');
  }));

  test('listagem do painel, mudança de status, governança e faturamento', quiet(async () => {
    asStaff();
    const sd = await import('../lib/supabaseData');
    const { updateBookingStatusAction } = await import('../app/actions/booking');
    const { getAllInvoicesAction } = await import('../app/actions/invoice');
    const all = await sd.getBookingsAsync();
    assert.ok(all.some((b) => b.id === created[0]), 'reserva manual aparece no painel');
    const up = await updateBookingStatusAction(created[0], 'checked_in');
    assert.equal(up.success, true, up.error);
    assert.equal(up.reservation!.status, 'checked_in');
    assert.ok((await sd.getHousekeepingAsync()).length >= 4);
    assert.equal((await getAllInvoicesAction()).success, true);
  }));

  test('bloqueio de quarto criado e removido pela equipe; reserva manual sobre bloqueio recusada', quiet(async () => {
    asStaff();
    const { createRoomBlockAction } = await import('../app/actions/roomBlock');
    const { createBookingAction } = await import('../app/actions/booking');
    const b = await createRoomBlockAction({ roomId: 'room-003', startDate: d(5, 1), endDate: d(5, 5), reason: 'maintenance', notes: RUN });
    assert.equal(b.success, true, b.error);
    createdBlocks.push(b.block!.id);
    const r = await createBookingAction({ roomId: 'room-003', checkIn: d(5, 2), checkOut: d(5, 3), guests: 1, guestName: RUN, guestEmail: 'compat@exemplo.test', paymentMethod: 'pix', channel: 'manual', status: 'confirmed' });
    assert.equal(r.success, false);
    assert.match(r.error ?? '', /bloqueado/);
  }));

  test('consulta pública pelo novo localizador funciona (visão mascarada)', quiet(async () => {
    asPublic();
    const sd = await import('../lib/supabaseData');
    const mine = (await sd.getBookingsAsync()).find((b) => b.id === created[0])!;
    const { lookupBookingAction } = await import('../app/actions/booking');
    const found = await lookupBookingAction(mine.bookingCode.toLowerCase());
    assert.equal(found.success, true, found.error);
    assert.notEqual(found.reservation!.guestEmail, 'compat@exemplo.test');
  }));
});

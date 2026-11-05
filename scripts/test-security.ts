// ============================================================
// scripts/test-security.ts
// Testes das vulnerabilidades corrigidas na 2ª auditoria (PR #1).
//
// Execução: npm run test:security
//
// AMBIENTE ISOLADO — NÃO TOCA EM PRODUÇÃO:
//  - Variáveis do Supabase, e-mail e Mercado Pago são apagadas antes de
//    importar o app (.env.local nunca é lido) → app roda em modo mock.
//  - Testes de RLS/migrations rodam em PGlite (PostgreSQL em memória), com
//    roles e auth.uid() simulados como no Supabase.
// ============================================================

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
  'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET',
  'ANAUE_ALLOW_MOCK_DATA', 'NEXT_PUBLIC_ANAUE_ALLOW_MOCK_DATA', 'ANAUE_STAFF_EMAILS',
  'VERCEL_ENV', 'NEXT_PUBLIC_VERCEL_ENV',
]) {
  delete process.env[key];
}
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = 'test';

import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

type Authz = typeof import('../lib/authz');
let authz: Authz;

const STAFF = { id: '11111111-1111-1111-1111-111111111111', email: 'equipe@anaue.test' };

async function withEnv(vars: Record<string, string | undefined>, fn: () => unknown | Promise<unknown>) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = env[k];
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
  }
}

const asAnonymous = () => authz.__setStaffResolverForTests(async () => null);
const asStaff = () => authz.__setStaffResolverForTests(async () => STAFF);

before(async () => {
  authz = await import('../lib/authz');
});
beforeEach(() => asAnonymous());
after(() => authz.__setStaffResolverForTests(null));

const silence = <T>(fn: () => Promise<T>) => async () => {
  const { error, warn, log } = console;
  console.error = console.warn = console.log = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { error, warn, log });
  }
};

// ─────────────────────────────────────────────────────────────
describe('1. Modo mock bloqueado em produção', () => {
  test('matriz de ambientes de isMockDataAllowed / shouldUseMockData', async () => {
    const dm = await import('../lib/dataMode');
    assert.equal(dm.isMockDataAllowed(), true, 'dev/test sem Supabase: mock liberado');

    await withEnv({ NODE_ENV: 'production' }, () => {
      assert.equal(dm.isMockDataAllowed(), false);
      assert.throws(() => dm.shouldUseMockData(), dm.DataUnavailableError);
    });
    await withEnv({ NODE_ENV: 'production', ANAUE_ALLOW_MOCK_DATA: 'true' }, () => {
      assert.equal(dm.isMockDataAllowed(), true, 'demo offline explícita fora da Vercel');
    });
    await withEnv({ NODE_ENV: 'production', VERCEL_ENV: 'production', ANAUE_ALLOW_MOCK_DATA: 'true' }, () => {
      assert.equal(dm.isMockDataAllowed(), false, 'Vercel produção: flag de escape ignorada');
      assert.equal(dm.isIntegrationMockAllowed(), false);
    });
    await withEnv({ VERCEL_ENV: 'production' }, () => {
      assert.equal(dm.isMockDataAllowed(), false, 'mesmo com NODE_ENV != production');
    });
  });

  test('leituras operacionais em produção sem Supabase lançam erro em vez de devolver hóspedes fictícios', async () => {
    const sd = await import('../lib/supabaseData');
    const { DataUnavailableError } = await import('../lib/dataMode');
    await withEnv({ NODE_ENV: 'production' }, async () => {
      await assert.rejects(sd.getBookingsAsync(), DataUnavailableError);
      await assert.rejects(sd.getBillingBookingsAsync(), DataUnavailableError);
      await assert.rejects(sd.getHousekeepingAsync(), DataUnavailableError);
      await assert.rejects(sd.getUnavailableRoomIdsAsync('2030-01-01', '2030-01-03'), DataUnavailableError);
    });
  });

  test('cupom fictício (mock) não é aceito em produção', silence(async () => {
    const { validateCouponAction } = await import('../app/actions/coupon');
    const dev = await validateCouponAction('BEMVINDO15', 1000);
    assert.equal(dev.valid, true, 'em dev o cupom mock existe');
    await withEnv({ NODE_ENV: 'production' }, async () => {
      await assert.rejects(validateCouponAction('BEMVINDO15', 1000));
    });
  }));

  test('PIX simulado (QR falso) não é gerado em produção', silence(async () => {
    const { createPixPaymentAction } = await import('../app/actions/payment');
    const dev = await createPixPaymentAction('res-001', 100, 'a@b.com', 'x');
    assert.equal(dev.success, true);
    await withEnv({ NODE_ENV: 'production' }, async () => {
      const prod = await createPixPaymentAction('res-001', 100, 'a@b.com', 'x');
      assert.equal(prod.success, false);
      assert.equal(prod.qrCodeBase64, undefined);
    });
  }));

  test('KPIs do painel usam as reservas recebidas, não o store mock', async () => {
    const { getAdminKPIs, getDailyActions } = await import('../lib/mockData');
    const kpis = getAdminKPIs('2030-05-02', [], [{ id: 'room-001' }]);
    assert.equal(kpis.monthlyRevenueEstimated, 0);
    assert.equal(kpis.occupiedRoomsCount, 0);
    assert.equal(kpis.totalRoomsCount, 1);
    assert.equal(getDailyActions('2030-05-02', [], []).allToday.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────
describe('2. Credenciais: chave secreta truncada não é usada', () => {
  test('getValidServiceRoleKey rejeita chaves incompletas/mascaradas', async () => {
    const { getValidServiceRoleKey } = await import('../lib/supabase');
    assert.equal(getValidServiceRoleKey(''), null);
    assert.equal(getValidServiceRoleKey('sb_secret_ABCDE'), null, 'prefixo de 15 chars (como em pass.env.local)');
    assert.equal(getValidServiceRoleKey('sb_secret_ABCDE••••••••••••••••••••••••••••'), null, 'mascarada');
    assert.equal(getValidServiceRoleKey('eyJhbGciOi.abc.def'), null, 'JWT curto');
    const full = 'sb_secret_' + 'a'.repeat(31);
    assert.equal(getValidServiceRoleKey(full), full);
    const jwt = 'eyJ' + 'a'.repeat(40) + '.' + 'b'.repeat(40) + '.' + 'c'.repeat(40);
    assert.equal(getValidServiceRoleKey(jwt), jwt);
  });

  test('pass.env.local não está mais versionado e é ignorado pelo git', async () => {
    const { execFileSync } = await import('node:child_process');
    const tracked = execFileSync('git', ['ls-files', 'pass.env.local'], { encoding: 'utf8' }).trim();
    assert.equal(tracked, '');
    const ignored = execFileSync('git', ['check-ignore', 'pass.env.local', 'qualquer.env.local'], { encoding: 'utf8' });
    assert.match(ignored, /pass\.env\.local/);
    assert.match(ignored, /qualquer\.env\.local/);
  });
});

// ─────────────────────────────────────────────────────────────
describe('3. Autorização das Server Actions administrativas', () => {
  test('anônimo é recusado em todas as ações da equipe', silence(async () => {
    const booking = await import('../app/actions/booking');
    const block = await import('../app/actions/roomBlock');
    const coupon = await import('../app/actions/coupon');
    const ical = await import('../app/actions/ical');
    const invoice = await import('../app/actions/invoice');
    const payment = await import('../app/actions/payment');
    const U = authz.UNAUTHORIZED_MESSAGE;

    const results: Array<[string, { success: boolean; error?: string }]> = [
      ['updateBookingStatus', await booking.updateBookingStatusAction('res-001', 'cancelled')],
      ['createRoomBlock', await block.createRoomBlockAction({ roomId: 'room-001', startDate: '2031-01-01', endDate: '2031-01-02', reason: 'maintenance' })],
      ['deleteRoomBlock', await block.deleteRoomBlockAction('blk-001')],
      ['getAllRoomBlocks', await block.getAllRoomBlocksAction()],
      ['saveIcalUrl', await ical.saveIcalImportUrlAction('room-001', 'https://example.com/a.ics')],
      ['syncIcal', await ical.syncRoomIcalAction('room-001')],
      ['updateBilling', await invoice.updateBookingBillingDataAction('res-001', { taxId: 'x' })],
      ['markInvoice', await invoice.markInvoiceAsIssuedAction('res-001')],
      ['getAllInvoices', await invoice.getAllInvoicesAction()],
      ['getInvoiceData', await invoice.getInvoiceDataAction('res-001')],
      ['confirmBookingPayment', await payment.confirmBookingPayment('res-001')],
      ['createBooking status=confirmed', await booking.createBookingAction({
        roomId: 'room-001', checkIn: '2031-03-01', checkOut: '2031-03-03', guests: 2, totalPrice: 1,
        roomPrice: 1, addonsPrice: 0, discountPrice: 0, guestName: 'Atacante', paymentMethod: 'pix', status: 'confirmed',
      })],
    ];
    for (const [name, r] of results) {
      assert.equal(r.success, false, `${name} deveria falhar`);
      assert.equal(r.error, U, `${name}: mensagem`);
    }
    await assert.rejects(coupon.getAllCouponsAction(), { message: U });
    await assert.rejects(coupon.createCouponAction({ code: 'HACK', discountType: 'percentage', discountValue: 100, minSpend: 0, expiresAt: null, isActive: true }), { message: U });
    await assert.rejects(coupon.toggleCouponStatusAction('cpn-001', true), { message: U });
    await assert.rejects(ical.getAllRoomsIcalConfigAsync(), { message: U });
  }));

  test('recusa não altera dados (status da reserva permanece)', silence(async () => {
    const { updateBookingStatusAction } = await import('../app/actions/booking');
    const mock = await import('../lib/mockData');
    const before = mock.getReservationById('res-002')!.status;
    await updateBookingStatusAction('res-002', 'cancelled');
    assert.equal(mock.getReservationById('res-002')!.status, before);
  }));

  test('equipe autenticada consegue executar as ações', silence(async () => {
    asStaff();
    const { updateBookingStatusAction, createBookingAction } = await import('../app/actions/booking');
    const { getAllRoomBlocksAction } = await import('../app/actions/roomBlock');
    const mock = await import('../lib/mockData');
    const original = mock.getReservationById('res-003')!.status;
    const r = await updateBookingStatusAction('res-003', 'confirmed');
    assert.equal(r.success, true, r.error);
    await updateBookingStatusAction('res-003', original);
    assert.equal((await getAllRoomBlocksAction()).success, true);
    const manual = await createBookingAction({
      roomId: 'room-003', checkIn: '2032-01-10', checkOut: '2032-01-12', guests: 2, totalPrice: 500,
      roomPrice: 500, addonsPrice: 0, discountPrice: 0, guestName: 'Reserva Manual', paymentMethod: 'pix', status: 'confirmed',
    });
    assert.equal(manual.success, true, manual.error);
    assert.equal(manual.reservation?.status, 'confirmed');
  }));

  test('checkout público continua funcionando (status pending)', silence(async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const r = await createBookingAction({
      roomId: 'room-002', checkIn: '2032-02-10', checkOut: '2032-02-12', guests: 2, totalPrice: 500,
      roomPrice: 500, addonsPrice: 0, discountPrice: 0, guestName: 'Hóspede', guestEmail: 'h@example.com', paymentMethod: 'pix',
    });
    assert.equal(r.success, true, r.error);
    assert.equal(r.reservation?.status, 'pending');
  }));

  test('falha ao validar sessão → acesso negado (fail-closed)', silence(async () => {
    authz.__setStaffResolverForTests(async () => {
      throw new Error('auth indisponível');
    });
    assert.equal(await authz.isStaff(), false);
  }));

  test('allowlist ANAUE_STAFF_EMAILS', () => {
    assert.equal(authz.isAllowedStaffEmail('x@y.com', ''), true, 'sem allowlist: qualquer autenticado');
    assert.equal(authz.isAllowedStaffEmail('Equipe@Anaue.test', 'equipe@anaue.test, outra@anaue.test'), true);
    assert.equal(authz.isAllowedStaffEmail('intruso@x.com', 'equipe@anaue.test'), false);
    assert.equal(authz.isAllowedStaffEmail(null, 'equipe@anaue.test'), false);
  });

  test('override de autorização só existe em NODE_ENV=test', async () => {
    await withEnv({ NODE_ENV: 'production' }, () => {
      assert.throws(() => authz.__setStaffResolverForTests(async () => STAFF));
    });
  });
});

// ─────────────────────────────────────────────────────────────
describe('3b. Dados pessoais em consultas públicas', () => {
  test('lookup público retorna visão reduzida (sem documento, contato mascarado)', silence(async () => {
    const { lookupBookingAction } = await import('../app/actions/booking');
    const r = await lookupBookingAction('AN-8412');
    assert.equal(r.success, true, r.error);
    const res = r.reservation!;
    assert.equal(res.guestDocument, null);
    assert.equal(res.taxId, null);
    assert.equal(res.billingAddress, null);
    assert.equal(res.specialRequests, null);
    assert.notEqual(res.guestEmail, 'lucas.silveira@email.com');
    assert.match(res.guestEmail, /^\w{1,2}\*+@email\.com$/);
    assert.ok(!res.guestPhone || res.guestPhone.startsWith('••••'));
  }));

  test('getBookingByIdAction: público reduzido, equipe completo', silence(async () => {
    const { getBookingByIdAction } = await import('../app/actions/booking');
    const pub = await getBookingByIdAction('res-001');
    assert.equal(pub.success, true);
    assert.notEqual(pub.reservation!.guestEmail, 'lucas.silveira@email.com');
    asStaff();
    const full = await getBookingByIdAction('res-001');
    assert.equal(full.reservation!.guestEmail, 'lucas.silveira@email.com');
  }));

  test('feed iCal público não expõe nome do hóspede nem localizador', silence(async () => {
    const { GET } = await import('../app/api/ical/[roomId]/route');
    const mock = await import('../lib/mockData');
    const roomRes = mock.getAllReservations().find((r) => r.roomId && r.status !== 'cancelled')!;
    const resp = await GET(new Request('http://localhost/api/ical/x') as never, { params: Promise.resolve({ roomId: roomRes.roomId }) });
    const body = await resp.text();
    assert.equal(resp.status, 200);
    assert.match(body, /BEGIN:VEVENT/);
    for (const r of mock.getAllReservations().filter((x) => x.roomId === roomRes.roomId)) {
      assert.ok(!body.includes(r.guestName), 'nome do hóspede no feed');
      assert.ok(!body.includes(r.bookingCode), 'localizador no feed');
    }
    const bad = await GET(new Request('http://localhost/api/ical/x') as never, { params: Promise.resolve({ roomId: '../../etc' }) });
    assert.equal(bad.status, 400);
  }));
});

// ─────────────────────────────────────────────────────────────
describe('4. Filtros construídos a partir de entrada do usuário', () => {
  const INJECTIONS = [
    'res-001,status.neq.zzz',
    'res-001),or(id.neq.0',
    'AN-8412,booking_code.neq.x',
    'x,id.not.is.null',
    '*',
    'res-001 ',
    "res-001'; drop table bookings;--",
  ];

  test('parseBookingRef aceita apenas ID/localizador válidos', async () => {
    const q = await import('../lib/queryInput');
    assert.deepEqual(q.parseBookingRef('res-001'), { column: 'id', value: 'res-001' });
    assert.deepEqual(q.parseBookingRef('RES-a1b2c3d4'), { column: 'id', value: 'res-a1b2c3d4' });
    assert.deepEqual(q.parseBookingRef('an-8412'), { column: 'booking_code', value: 'AN-8412' });
    for (const bad of INJECTIONS.filter((s) => s.trim() !== 'res-001')) {
      assert.equal(q.parseBookingRef(bad), null, `deveria rejeitar: ${bad}`);
    }
  });

  test('updateBookingStatusAction (equipe) recusa payload de injeção sem alterar nada', silence(async () => {
    asStaff();
    const { updateBookingStatusAction } = await import('../app/actions/booking');
    const mock = await import('../lib/mockData');
    const snapshot = mock.getAllReservations().map((r) => `${r.id}:${r.status}`).join('|');
    for (const bad of INJECTIONS.filter((s) => s.trim() !== 'res-001')) {
      const r = await updateBookingStatusAction(bad, 'cancelled');
      assert.equal(r.success, false, bad);
    }
    const invalidStatus = await updateBookingStatusAction('res-001', 'hacked' as never);
    assert.equal(invalidStatus.success, false);
    assert.equal(mock.getAllReservations().map((r) => `${r.id}:${r.status}`).join('|'), snapshot);
  }));

  test('escapeLikePattern: curingas viram literais (prova em PostgreSQL real)', async () => {
    const { escapeLikePattern, normalizeEmail } = await import('../lib/queryInput');
    assert.equal(escapeLikePattern('%@%'), '\\%@\\%');
    assert.equal(escapeLikePattern('a_b\\c'), 'a\\_b\\\\c');
    assert.equal(normalizeEmail('%@%'), null);
    assert.equal(normalizeEmail('a,b@x.com'), null);
    assert.equal(normalizeEmail(' Lucas@Email.COM '), 'lucas@email.com');

    const db = new PGlite();
    await db.exec(`CREATE TABLE b (guest_email text);
      INSERT INTO b VALUES ('lucas@email.com'), ('ana@email.com'), ('Maria@Email.com');`);
    const count = async (p: string) =>
      (await db.query<{ n: number }>('SELECT count(*)::int n FROM b WHERE guest_email ILIKE $1', [p])).rows[0].n;
    assert.equal(await count('%@%'), 3, 'sem escape, "%@%" casaria todos os hóspedes');
    assert.equal(await count(escapeLikePattern('%@%.%')), 0, 'com escape, nenhum');
    assert.equal(await count(escapeLikePattern('maria@email.com')), 1, 'busca exata, sem diferenciar maiúsculas');
  });

  test('lookup por e-mail com curingas não devolve reserva de terceiros', silence(async () => {
    const { lookupBookingAction } = await import('../app/actions/booking');
    for (const q of ['%@%', '%@%.%', '_%@email.com', '*@*']) {
      assert.equal((await lookupBookingAction(q)).success, false, q);
    }
  }));

  test('URLs iCal: só https público (mitiga SSRF)', async () => {
    const { isSafeExternalUrl } = await import('../lib/urlSafety');
    for (const ok of ['https://www.airbnb.com/calendar/ical/123.ics?s=abc', 'https://admin.booking.com/hotel/ical.ics']) {
      assert.equal(isSafeExternalUrl(ok), true, ok);
    }
    for (const bad of [
      'http://www.airbnb.com/a.ics', 'https://localhost/a', 'https://127.0.0.1/a', 'https://169.254.169.254/latest/meta-data',
      'https://10.0.0.5/a', 'https://192.168.1.1/a', 'https://172.16.0.1/a', 'https://[::1]/a', 'https://2130706433/a',
      'https://user:pass@example.com/a', 'https://example.com:8443/a', 'file:///etc/passwd', 'https://intranet/a',
      'https://db.internal/a', 'javascript:alert(1)', '',
    ]) {
      assert.equal(isSafeExternalUrl(bad), false, bad);
    }
    asStaff();
    const { saveIcalImportUrlAction } = await import('../app/actions/ical');
    const r = await saveIcalImportUrlAction('room-001', 'https://169.254.169.254/latest/meta-data');
    assert.equal(r.success, false);
  });

  test('webhook Mercado Pago: assinatura obrigatória e manifesto oficial', async () => {
    const { verifyMercadoPagoSignature } = await import('../lib/mercadopagoSignature');
    const secret = 'segredo-de-teste';
    const ts = '1730000000';
    const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex');
    const good = `ts=${ts},v1=${sign(`id:123456;request-id:req-1;ts:${ts};`)}`;
    const base = { secret, xRequestId: 'req-1', dataId: '123456' };
    assert.equal(verifyMercadoPagoSignature({ ...base, xSignature: good }), 'valid');
    assert.equal(verifyMercadoPagoSignature({ ...base, xSignature: null }), 'invalid', 'header ausente não pula mais a checagem');
    assert.equal(verifyMercadoPagoSignature({ ...base, dataId: '999', xSignature: good }), 'invalid', 'id adulterado');
    assert.equal(verifyMercadoPagoSignature({ ...base, xSignature: `ts=${ts},v1=${'0'.repeat(64)}` }), 'invalid');
    assert.equal(verifyMercadoPagoSignature({ ...base, xSignature: 'lixo' }), 'invalid');
    assert.equal(verifyMercadoPagoSignature({ ...base, secret: undefined, xSignature: null }), 'not_configured');
    const alnum = `ts=${ts},v1=${sign(`id:abc123;request-id:req-1;ts:${ts};`)}`;
    assert.equal(verifyMercadoPagoSignature({ ...base, dataId: 'ABC123', xSignature: alnum }), 'valid', 'id alfanumérico em minúsculas');
  });
});

// ─────────────────────────────────────────────────────────────
describe('5. Busca pelos novos códigos de reserva', () => {
  test('normalizeBookingCode aceita legado e formato atual', async () => {
    const { normalizeBookingCode } = await import('../lib/queryInput');
    assert.equal(normalizeBookingCode('AN-8412'), 'AN-8412');
    assert.equal(normalizeBookingCode('AN-K3F9123'), 'AN-K3F9123');
    assert.equal(normalizeBookingCode('  an-k3f9123 '), 'AN-K3F9123');
    for (const bad of ['AN-12', 'AN-K3F912', 'AN-K3F91234', 'XX-8412', 'AN8412', 'AN-K3F9ABC']) {
      assert.equal(normalizeBookingCode(bad), null, bad);
    }
  });

  test('o gerador real de códigos produz valores aceitos pela busca', async () => {
    const svc = await import('../lib/bookingService');
    const { normalizeBookingCode } = await import('../lib/queryInput');
    const codes: string[] = [];
    await svc.createBooking(
      { roomId: null, checkIn: '2033-01-01', checkOut: '2033-01-02', guests: 1, totalPrice: 1, roomPrice: 1, addonsPrice: 0, discountPrice: 0, guestName: 'X', paymentMethod: 'pix' },
      {
        repo: {
          findActiveBookingOverlaps: async () => [],
          findRoomBlockOverlaps: async () => [],
          insertBooking: async (row) => {
            codes.push(row.booking_code!);
            return { id: 'res-x', bookingCode: row.booking_code } as never;
          },
        },
        sendConfirmation: async () => {},
        logger: { error: () => {}, warn: () => {} },
      }
    );
    assert.equal(codes.length, 1);
    assert.equal(normalizeBookingCode(codes[0]), codes[0], `código gerado ${codes[0]}`);
  });

  test('reserva criada pelo checkout é encontrada pelo novo código (maiúsculas ou minúsculas)', silence(async () => {
    const { createBookingAction, lookupBookingAction } = await import('../app/actions/booking');
    const created = await createBookingAction({
      roomId: 'room-001', checkIn: '2033-06-01', checkOut: '2033-06-03', guests: 2, totalPrice: 1300,
      roomPrice: 1300, addonsPrice: 0, discountPrice: 0, guestName: 'Novo Código', guestEmail: 'novo@example.com', paymentMethod: 'pix',
    });
    assert.equal(created.success, true, created.error);
    const code = created.bookingCode!;
    assert.match(code, /^AN-[A-Z0-9]{4}\d{3}$/);
    for (const q of [code, code.toLowerCase(), ` ${code} `]) {
      const found = await lookupBookingAction(q);
      assert.equal(found.success, true, `${q}: ${found.error}`);
      assert.equal(found.reservation!.bookingCode, code);
    }
  }));
});

// ─────────────────────────────────────────────────────────────
describe('6. Migrations: RLS e integridade em PostgreSQL (PGlite)', () => {
  const SCHEMA = readFileSync(resolve(__dirname, '../supabase/schema.sql'), 'utf-8');
  const INTEGRITY = readFileSync(resolve(__dirname, '../supabase/migrations/20261105000000_booking_integrity.sql'), 'utf-8');
  const RLS = readFileSync(resolve(__dirname, '../supabase/migrations/20261105000100_rls_hardening.sql'), 'utf-8');

  // Simula o ambiente Supabase: roles da API, auth.uid() via claim, grants padrão.
  const SUPABASE_STUB = `
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  `;
  const GRANTS = `
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    -- Como no Supabase: tabelas criadas depois também recebem grants
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
  `;

  let db: PGlite;

  async function as(role: 'anon' | 'authenticated' | 'service_role', sub: string | null, fn: () => Promise<void>) {
    await db.exec(`SET request.jwt.claim.sub = '${sub ?? ''}'; SET ROLE ${role};`);
    try {
      await fn();
    } finally {
      await db.exec(`RESET ROLE; RESET request.jwt.claim.sub;`);
    }
  }
  const count = async (sql: string) => (await db.query<{ n: number }>(sql)).rows[0].n;
  const code = (e: unknown) => (e as { code?: string }).code;

  before(async () => {
    db = new PGlite({ extensions: { btree_gist, uuid_ossp } });
    await db.exec(SUPABASE_STUB);
    await db.exec(SCHEMA);
    await db.exec(GRANTS);
    await db.exec(INTEGRITY);
    await db.exec(RLS);
    await db.exec(`
      INSERT INTO public.staff_members (user_id, email) VALUES ('${STAFF.id}', '${STAFF.email}');
      INSERT INTO public.bookings (id, room_id, guest_name, guest_email, guest_document, check_in_date, check_out_date, total_price, status)
      VALUES ('res-aaaa0001', 'room-001', 'Hóspede Real', 'real@example.com', '123.456.789-00', '2034-01-10', '2034-01-15', 1000, 'confirmed');
    `);
  });

  test('migrations aplicam sobre schema.sql (btree_gist no schema extensions)', async () => {
    const r = await db.query<{ nspname: string }>(
      `SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'btree_gist'`
    );
    assert.equal(r.rows[0].nspname, 'extensions');
  });

  test('anon não lê, não insere e não altera reservas (dados pessoais)', async () => {
    await as('anon', null, async () => {
      assert.equal(await count('SELECT count(*)::int n FROM public.bookings'), 0);
      await assert.rejects(
        db.query(`INSERT INTO public.bookings (room_id, guest_name, guest_email, check_in_date, check_out_date, total_price)
                  VALUES ('room-002','X','x@x.com','2034-02-01','2034-02-02',1)`),
        (e) => code(e) === '42501'
      );
      const upd = await db.query(`UPDATE public.bookings SET total_price = 0`);
      assert.equal(upd.affectedRows ?? 0, 0);
      assert.equal(await count('SELECT count(*)::int n FROM public.coupons'), 0, 'códigos de cupom ocultos');
      assert.equal(await count('SELECT count(*)::int n FROM public.room_blocks'), 0);
      assert.ok((await count('SELECT count(*)::int n FROM public.rooms')) > 0, 'catálogo continua público');
    });
    assert.equal(await count(`SELECT count(*)::int n FROM public.bookings WHERE total_price = 1000`), 1);
  });

  test('usuário autenticado que não é da equipe não vê reservas', async () => {
    await as('authenticated', '22222222-2222-2222-2222-222222222222', async () => {
      assert.equal(await count('SELECT count(*)::int n FROM public.bookings'), 0);
      await assert.rejects(db.query('SELECT * FROM public.staff_members'), (e) => code(e) === '42501', 'lista da equipe oculta');
    });
  });

  test('equipe (staff_members) lê e atualiza reservas; service_role ignora RLS', async () => {
    await as('authenticated', STAFF.id, async () => {
      assert.equal(await count('SELECT count(*)::int n FROM public.bookings'), 1);
      const upd = await db.query(`UPDATE public.bookings SET status = 'checked_in' WHERE id = 'res-aaaa0001'`);
      assert.equal(upd.affectedRows, 1);
    });
    await as('service_role', null, async () => {
      assert.equal(await count('SELECT count(*)::int n FROM public.bookings'), 1);
    });
  });

  test('trigger SECURITY DEFINER: bloqueio sobre reserva é recusado mesmo se quem grava não enxerga bookings', async () => {
    // Role de teste que pode inserir bloqueios mas não ler reservas
    await db.exec(`
      CREATE ROLE tester NOLOGIN;
      GRANT USAGE ON SCHEMA public TO tester;
      GRANT SELECT, INSERT ON public.room_blocks TO tester;
      CREATE POLICY "tester insere bloqueios" ON public.room_blocks FOR ALL TO tester USING (true) WITH CHECK (true);
    `);
    await db.exec('SET ROLE tester');
    try {
      await assert.rejects(
        db.query(`INSERT INTO public.room_blocks (room_id, start_date, end_date) VALUES ('room-001','2034-01-12','2034-01-13')`),
        (e) => code(e) === 'AN002'
      );
    } finally {
      await db.exec('RESET ROLE');
    }
  });

  test('funções de trigger não podem ser executadas por anon/authenticated', async () => {
    const r = await db.query<{ anon: boolean; auth: boolean }>(`
      SELECT has_function_privilege('anon', 'public.anaue_room_blocks_check_bookings()', 'EXECUTE') AS anon,
             has_function_privilege('authenticated', 'public.anaue_bookings_check_room_blocks()', 'EXECUTE') AS auth`);
    assert.equal(r.rows[0].anon, false);
    assert.equal(r.rows[0].auth, false);
    const s = await db.query<{ anon: boolean }>(
      `SELECT has_function_privilege('anon', 'public.anaue_is_staff()', 'EXECUTE') AS anon`
    );
    assert.equal(s.rows[0].anon, false);
  });

  test('migrations são idempotentes (reaplicar não falha)', async () => {
    await db.exec(INTEGRITY);
    await db.exec(RLS);
  });
});

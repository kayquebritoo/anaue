// ============================================================
// scripts/test-launch.ts
// Testes do modo pré-lançamento, PIX seguro na tela de sucesso,
// pagamentos expirados/recusados, e-mails e isolamento do Preview.
//
// Execução: npm run test:launch — ambiente isolado (modo mock; API do
// Mercado Pago simulada por stub de fetch; nenhuma rede, nenhum banco real).
// ============================================================

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET',
  'MP_NOTIFICATION_URL', 'ANAUE_ALLOW_MOCK_DATA', 'NEXT_PUBLIC_ANAUE_ALLOW_MOCK_DATA', 'ANAUE_STAFF_EMAILS',
  'VERCEL_ENV', 'NEXT_PUBLIC_VERCEL_ENV', 'NEXT_PUBLIC_ONLINE_BOOKING_ENABLED', 'NEXT_PUBLIC_WHATSAPP_NUMBER',
]) {
  delete process.env[key];
}
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = 'test';

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type Authz = typeof import('../lib/authz');
let authz: Authz;

const quiet = <T>(fn: () => Promise<T>) => async () => {
  const { error, warn, log } = console;
  console.error = console.warn = console.log = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { error, warn, log });
  }
};

async function withEnv<T>(vars: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
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

const booking = (o: Record<string, unknown> = {}) => ({
  roomId: 'room-002',
  checkIn: '2040-03-10',
  checkOut: '2040-03-12',
  guests: 2,
  guestName: 'Hóspede Pré-lançamento',
  guestEmail: 'h@example.com',
  paymentMethod: 'pix' as const,
  ...o,
});

before(async () => {
  authz = await import('../lib/authz');
});
beforeEach(() => authz.__setStaffResolverForTests(async () => null));
after(() => authz.__setStaffResolverForTests(null));

// ─────────────────────────────────────────────────────────────
describe('Modo pré-lançamento (reservas online desligadas)', () => {
  test('flag: produção sem configuração = DESLIGADO; "true" liga; dev liga por padrão', async () => {
    const { isOnlineBookingEnabled } = await import('../lib/launchMode');
    assert.equal(isOnlineBookingEnabled(), true, 'dev/test');
    await withEnv({ NODE_ENV: 'production' }, () => assert.equal(isOnlineBookingEnabled(), false, 'seguro por padrão'));
    await withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ONLINE_BOOKING_ENABLED: 'true' }, () => assert.equal(isOnlineBookingEnabled(), true));
    await withEnv({ NEXT_PUBLIC_ONLINE_BOOKING_ENABLED: 'false' }, () => assert.equal(isOnlineBookingEnabled(), false));
    await withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ONLINE_BOOKING_ENABLED: 'TRUE ' }, () => assert.equal(isOnlineBookingEnabled(), true));
    await withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ONLINE_BOOKING_ENABLED: 'yes' }, () => assert.equal(isOnlineBookingEnabled(), false));
  });

  test('servidor recusa reserva pública e não grava nada', quiet(async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const { ONLINE_BOOKING_DISABLED_MESSAGE } = await import('../lib/launchMode');
    const mock = await import('../lib/mockData');
    const before = mock.getAllReservations().length;
    await withEnv({ NEXT_PUBLIC_ONLINE_BOOKING_ENABLED: 'false' }, async () => {
      const r = await createBookingAction(booking());
      assert.equal(r.success, false);
      assert.equal(r.error, ONLINE_BOOKING_DISABLED_MESSAGE);
      // tentar contornar declarando canal manual sem ser equipe
      const sneaky = await createBookingAction(booking({ channel: 'manual' }));
      assert.equal(sneaky.success, false);
    });
    assert.equal(mock.getAllReservations().length, before);
  }));

  test('produção sem a flag: reserva pública bloqueada', quiet(async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    await withEnv({ NODE_ENV: 'production', ANAUE_ALLOW_MOCK_DATA: 'true' }, async () => {
      const r = await createBookingAction(booking({ checkIn: '2040-04-01', checkOut: '2040-04-03' }));
      assert.equal(r.success, false);
      assert.match(r.error ?? '', /em breve/);
    });
  }));

  test('painel continua: equipe cria reserva manual com reservas online desligadas', quiet(async () => {
    authz.__setStaffResolverForTests(async () => ({ id: 'staff', email: null }));
    const { createBookingAction } = await import('../app/actions/booking');
    await withEnv({ NEXT_PUBLIC_ONLINE_BOOKING_ENABLED: 'false' }, async () => {
      const r = await createBookingAction(booking({ channel: 'manual', status: 'confirmed', checkIn: '2040-05-01', checkOut: '2040-05-03' }));
      assert.equal(r.success, true, r.error);
    });
  }));

  test('nenhuma cobrança PIX é gerada nem exibida', quiet(async () => {
    const { createPixPaymentAction, getPixPaymentForBookingAction } = await import('../app/actions/payment');
    await withEnv({ NEXT_PUBLIC_ONLINE_BOOKING_ENABLED: 'false' }, async () => {
      const created = await createPixPaymentAction('res-001', 100, 'a@b.com', 'x');
      assert.equal(created.success, false);
      assert.equal(created.qrCodeBase64, undefined);
      const shown = await getPixPaymentForBookingAction('res-001', 123);
      assert.equal(shown.success, false);
      assert.equal(shown.qrCodeBase64, undefined);
    });
  }));

  test('checkout mostra "em breve" quando desligado (código-fonte)', () => {
    const src = readFileSync(resolve(__dirname, '../app/reserva/checkout/page.tsx'), 'utf8');
    assert.match(src, /if \(!isOnlineBookingEnabled\(\)\) \{\s*return <BookingComingSoon/);
  });

  test('WhatsApp de contato: placeholder antigo não é exibido', async () => {
    const { getContactWhatsApp } = await import('../lib/launchMode');
    assert.equal(getContactWhatsApp(), null);
    await withEnv({ NEXT_PUBLIC_WHATSAPP_NUMBER: '5592998000000' }, () => assert.equal(getContactWhatsApp(), null));
    await withEnv({ NEXT_PUBLIC_WHATSAPP_NUMBER: '+55 (92) 99123-0000' }, () => assert.equal(getContactWhatsApp(), '5592991230000'));
  });
});

// ─────────────────────────────────────────────────────────────
describe('PIX na tela de sucesso vem do servidor, nunca da URL', () => {
  const realFetch = globalThis.fetch;
  let mpPayment: Record<string, unknown> = {};
  before(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (!String(input).startsWith('https://api.mercadopago.com/')) throw new Error('rede bloqueada');
      return new Response(JSON.stringify(mpPayment));
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
    delete env.MP_ACCESS_TOKEN;
  });

  test('a página de sucesso não lê QR nem copia-e-cola da URL', () => {
    const src = readFileSync(resolve(__dirname, '../app/reserva/sucesso/[id]/page.tsx'), 'utf8');
    for (const param of ['pix_qrCode', 'pix_copiaECola', 'pix_ticketUrl', 'pix_expiresAt', 'show_pix']) {
      assert.ok(!src.includes(`'${param}'`), `página ainda lê ${param} da URL`);
    }
    assert.match(src, /getPixPaymentForBookingAction/);
    const checkout = readFileSync(resolve(__dirname, '../app/reserva/checkout/page.tsx'), 'utf8');
    assert.ok(!checkout.includes('pix_qrCode'), 'checkout ainda envia QR pela URL');
  });

  async function pendingBooking(checkIn: string, checkOut: string) {
    const { createBookingAction } = await import('../app/actions/booking');
    const r = await createBookingAction(booking({ roomId: 'room-001', checkIn, checkOut }));
    assert.equal(r.success, true, r.error);
    return r.reservation!;
  }

  test('QR do gateway só para pagamento pendente da MESMA reserva', quiet(async () => {
    const b = await pendingBooking('2041-01-10', '2041-01-12');
    const { getPixPaymentForBookingAction } = await import('../app/actions/payment');
    env.MP_ACCESS_TOKEN = 'TEST-token-ficticio';

    mpPayment = { id: 501, status: 'pending', transaction_amount: b.totalPrice, external_reference: 'res-outra9999',
      point_of_interaction: { transaction_data: { qr_code: 'CHAVE-DE-TERCEIRO', qr_code_base64: 'QR-TERCEIRO' } } };
    const other = await getPixPaymentForBookingAction(b.id, 501);
    assert.equal(other.success, false, 'pagamento de outra reserva');
    assert.equal(other.copiaECola, undefined);

    mpPayment = { id: 502, status: 'approved', transaction_amount: b.totalPrice, external_reference: b.id };
    const paid = await getPixPaymentForBookingAction(b.id, 502);
    assert.equal(paid.success, false);
    assert.equal(paid.paymentStatus, 'approved');
    assert.equal(paid.qrCodeBase64, undefined, 'não exibe QR de pagamento já aprovado');

    mpPayment = { id: 503, status: 'pending', transaction_amount: b.totalPrice, external_reference: b.id, date_of_expiration: '2041-01-01T00:30:00Z',
      point_of_interaction: { transaction_data: { qr_code: 'PIX-ANAUE', qr_code_base64: 'QR-ANAUE', ticket_url: 'https://mp/t' } } };
    const ok = await getPixPaymentForBookingAction(b.id, 503);
    assert.equal(ok.success, true, ok.error);
    assert.equal(ok.copiaECola, 'PIX-ANAUE');
    assert.equal(ok.qrCodeBase64, 'QR-ANAUE');

    assert.equal((await getPixPaymentForBookingAction('res-001,status.neq.x', 503)).success, false);
    assert.equal((await getPixPaymentForBookingAction(b.id, -1)).success, false);
  }));
});

// ─────────────────────────────────────────────────────────────
describe('PIX expirado / cancelado / recusado libera o quarto', () => {
  const realFetch = globalThis.fetch;
  let mpPayment: Record<string, unknown> = {};
  before(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (!String(input).startsWith('https://api.mercadopago.com/')) throw new Error('rede bloqueada');
      return new Response(JSON.stringify(mpPayment));
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
    delete env.MP_ACCESS_TOKEN;
  });

  async function webhook(id: number) {
    const { POST } = await import('../app/api/webhooks/mercadopago/route');
    const res = await POST(new Request(`http://localhost/api/webhooks/mercadopago?topic=payment&id=${id}`, { method: 'POST' }) as never);
    return (await res.json()) as { outcome?: string };
  }

  test('webhook de PIX expirado cancela a reserva pendente e o período volta a ficar livre', quiet(async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const mock = await import('../lib/mockData');
    const first = await createBookingAction(booking({ roomId: 'room-004', checkIn: '2042-02-01', checkOut: '2042-02-03' }));
    assert.equal(first.success, true, first.error);
    const blocked = await createBookingAction(booking({ roomId: 'room-004', checkIn: '2042-02-01', checkOut: '2042-02-03', guestName: 'Outro' }));
    assert.equal(blocked.success, false, 'período ocupado pela reserva pendente');

    env.MP_ACCESS_TOKEN = 'TEST-token-ficticio';
    mpPayment = { id: 701, status: 'cancelled', status_detail: 'expired', transaction_amount: first.reservation!.totalPrice, currency_id: 'BRL', external_reference: first.bookingId };
    assert.equal((await webhook(701)).outcome, 'payment_failed_cancelled');
    assert.equal(mock.getReservationById(first.bookingId!)!.status, 'cancelled');

    delete env.MP_ACCESS_TOKEN;
    const again = await createBookingAction(booking({ roomId: 'room-004', checkIn: '2042-02-01', checkOut: '2042-02-03', guestName: 'Outro' }));
    assert.equal(again.success, true, `quarto deveria estar livre: ${again.error}`);
  }));

  test('pagamento recusado também cancela; reserva já confirmada NUNCA é cancelada por isso', async () => {
    const { confirmBookingFromPayment } = await import('../lib/paymentConfirmation');
    const silent = { error: () => {}, warn: () => {} };
    const make = (status: string) => {
      const state = { status };
      return {
        state,
        repo: {
          getBooking: async () => ({ id: 'res-abc12345', status: state.status, totalPrice: 100 }),
          markConfirmed: async () => 0,
          markCancelledIfPending: async () => {
            if (state.status !== 'pending') return 0;
            state.status = 'cancelled';
            return 1;
          },
        },
      };
    };
    const pay = (status: string) => ({ id: 1, status, transaction_amount: 100, external_reference: 'res-abc12345', currency_id: 'BRL' });

    const rejected = make('pending');
    assert.equal((await confirmBookingFromPayment(pay('rejected'), rejected.repo, silent)).outcome, 'payment_failed_cancelled');
    assert.equal(rejected.state.status, 'cancelled');

    const confirmed = make('confirmed');
    assert.equal((await confirmBookingFromPayment(pay('cancelled'), confirmed.repo, silent)).outcome, 'payment_failed');
    assert.equal(confirmed.state.status, 'confirmed', 'reserva paga não pode ser cancelada por notificação de outro pagamento');

    const forged = make('pending');
    assert.equal((await confirmBookingFromPayment({ ...pay('cancelled'), external_reference: 'x,status.neq.y' }, forged.repo, silent)).outcome, 'invalid_reference');
    assert.equal(forged.state.status, 'pending');
  });
});

// ─────────────────────────────────────────────────────────────
describe('E-mails transacionais', () => {
  test('assunto só diz "confirmada" quando a reserva está confirmada', async () => {
    const { bookingEmailSubject } = await import('../lib/email');
    assert.match(bookingEmailSubject({ status: 'pending', bookingCode: 'AN-K3F9123' }), /aguardando pagamento/);
    assert.doesNotMatch(bookingEmailSubject({ status: 'pending', bookingCode: 'AN-K3F9123' }), /confirmada/i);
    assert.match(bookingEmailSubject({ status: 'confirmed', bookingCode: 'AN-K3F9123' }), /^Reserva confirmada/);
  });

  test('produção sem provedor: falha explícita (não finge envio); endereço interno nunca recebe', quiet(async () => {
    const { sendBookingConfirmationEmail } = await import('../lib/email');
    const r = { id: 'res-x', bookingCode: 'AN-1234', status: 'pending', guestEmail: 'h@example.com', checkIn: '2040-01-01', checkOut: '2040-01-02', totalPrice: 10 } as never;
    await withEnv({ NODE_ENV: 'production' }, async () => {
      const res = await sendBookingConfirmationEmail(r);
      assert.equal(res.success, false);
      assert.equal(res.provider, 'none');
    });
    const synthetic = await sendBookingConfirmationEmail({ ...(r as object), guestEmail: 'wpp.5592999999999@guest.anaue.com.br' } as never);
    assert.equal(synthetic.success, false);
    assert.equal(synthetic.provider, 'none');
  }));

  test('e-mail de confirmação só sai para reserva confirmada', quiet(async () => {
    const { sendPaymentConfirmedEmail } = await import('../lib/bookingNotifications');
    const mock = await import('../lib/mockData');
    const pending = mock.getAllReservations().find((r) => r.status === 'pending');
    if (pending) assert.equal(await sendPaymentConfirmedEmail(pending.id), null, 'pendente não recebe "confirmada"');
    const confirmed = mock.getAllReservations().find((r) => r.status === 'confirmed' && !r.guestEmail.endsWith('anaue.com.br'))!;
    const sent = await sendPaymentConfirmedEmail(confirmed.id);
    assert.ok(sent && sent.success, 'confirmada recebe e-mail (mock em teste)');
  }));
});

// ─────────────────────────────────────────────────────────────
describe('Preview nunca usa o banco de produção', () => {
  const PROD = 'https://yjtbwxjxhfkxrmdurgdu.supabase.co';
  const run = (vars: Record<string, string>) =>
    spawnSync(process.execPath, [resolve(__dirname, 'check-env.mjs')], {
      cwd: resolve(__dirname, 'staging'), // pasta sem .env*: só as variáveis passadas
      env: { PATH: process.env.PATH ?? '', ...vars } as unknown as NodeJS.ProcessEnv,
      encoding: 'utf8',
    });

  test('build de Preview apontando para produção falha; Production é permitido', () => {
    const preview = run({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: PROD, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x' });
    assert.equal(preview.status, 1);
    assert.match(preview.stderr, /apontando para o Supabase de PRODUÇÃO/);
    const prod = run({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: PROD, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x' });
    assert.equal(prod.status, 0, prod.stderr);
    const staging = run({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijabcdefghij.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x' });
    assert.equal(staging.status, 0, staging.stderr);
  });

  test('a saída do check-env nunca contém valores das variáveis', () => {
    const secret = 'sb_secret_' + 'S'.repeat(40);
    const out = run({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijabcdefghij.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'pk-valor-unico', SUPABASE_SERVICE_ROLE_KEY: secret, MP_ACCESS_TOKEN: 'APP_USR-123456789' });
    const all = out.stdout + out.stderr;
    for (const v of [secret, 'pk-valor-unico', 'APP_USR-123456789', 'abcdefghijabcdefghij']) assert.ok(!all.includes(v), `vazou ${v.slice(0, 12)}…`);
  });

  test('detecção do ref de produção em tempo de execução', async () => {
    const { isProductionSupabaseUrl } = await import('../lib/supabase');
    assert.equal(isProductionSupabaseUrl(PROD), true);
    assert.equal(isProductionSupabaseUrl('https://abcdefghijabcdefghij.supabase.co'), false);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Seed de staging (dados fictícios)', () => {
  test('aplica sobre schema + migrations e recusa banco com reservas reais', async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    const { btree_gist } = await import('@electric-sql/pglite/contrib/btree_gist');
    const { uuid_ossp } = await import('@electric-sql/pglite/contrib/uuid_ossp');
    const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');
    const db = new PGlite({ extensions: { btree_gist, uuid_ossp } });
    await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;`);
    await db.exec(read('supabase/schema.sql'));
    await db.exec(read('supabase/migrations/20261105000000_booking_integrity.sql'));
    await db.exec(read('supabase/migrations/20261105000100_rls_hardening.sql'));
    await db.exec(read('supabase/seed-staging.sql'));
    await db.exec(read('supabase/seed-staging.sql')); // idempotente
    const n = await db.query<{ n: number }>(`SELECT count(*)::int n FROM bookings WHERE guest_email LIKE '%@exemplo.test'`);
    assert.equal(n.rows[0].n, 5);

    await db.exec(`INSERT INTO bookings (room_id, guest_name, guest_email, check_in_date, check_out_date, total_price)
                   VALUES ('room-003', 'Hóspede Real', 'real@gmail.com', '2031-01-01', '2031-01-02', 1)`);
    await assert.rejects(db.exec(read('supabase/seed-staging.sql')), /ABORTADO/);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Quarto sem fotos não derruba páginas', () => {
  test('foto principal com fallback (galeria → imagem institucional)', async () => {
    const { getRoomPrimaryImage, ROOM_IMAGE_FALLBACK } = await import('../lib/roomImages');
    assert.deepEqual(getRoomPrimaryImage({ name: 'X', images: [] }), { url: ROOM_IMAGE_FALLBACK, alt: 'X' });
    assert.deepEqual(getRoomPrimaryImage({ name: 'X', images: undefined as never }), { url: ROOM_IMAGE_FALLBACK, alt: 'X' });
    assert.equal(getRoomPrimaryImage({ name: 'X', images: [], gallery_images: ['/g.webp'] }).url, '/g.webp');
    assert.equal(getRoomPrimaryImage({ name: 'X', images: [{ url: '/a.webp', alt: '', isPrimary: false }, { url: '/b.webp', alt: 'B', isPrimary: true }] }).url, '/b.webp');
    assert.equal(getRoomPrimaryImage({ name: 'X', images: [{ url: '', alt: '', isPrimary: true }] as never }).url, ROOM_IMAGE_FALLBACK);
  });
});

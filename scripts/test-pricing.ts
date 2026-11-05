// ============================================================
// scripts/test-pricing.ts
// Testes de manipulação de preço e conferência de pagamento.
//
// Execução: npm run test:pricing
//
// AMBIENTE ISOLADO: variáveis de produção apagadas antes de importar o
// app (modo mock); a API do Mercado Pago é simulada com um stub de fetch
// (nenhuma requisição de rede); confirmação condicional testada em PGlite.
// ============================================================

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
  'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'ANAUE_ALLOW_MOCK_DATA', 'NEXT_PUBLIC_ANAUE_ALLOW_MOCK_DATA',
  'ANAUE_STAFF_EMAILS', 'VERCEL_ENV', 'NEXT_PUBLIC_VERCEL_ENV',
]) {
  delete process.env[key];
}
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = 'test';

import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

type Pricing = typeof import('../lib/pricing');
type Svc = typeof import('../lib/bookingService');
type Coupon = import('../types').Coupon;
type Reservation = import('../types').Reservation;

let pricing: Pricing;
let svc: Svc;

const silentLogger = { error: () => {}, warn: () => {} };
const quiet = <T>(fn: () => Promise<T>) => async () => {
  const { error, warn, log } = console;
  console.error = console.warn = console.log = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { error, warn, log });
  }
};

// ── Catálogo de teste com preços conhecidos (espelha mocks/*.json) ──
const COUPONS: Record<string, Coupon> = {
  DEZ: { id: 'c1', code: 'DEZ', discountType: 'percentage', discountValue: 10, minSpend: 500, expiresAt: '2099-12-31T23:59:59Z', isActive: true, createdAt: '' },
  CEM: { id: 'c2', code: 'CEM', discountType: 'fixed', discountValue: 100, minSpend: 800, expiresAt: null, isActive: true, createdAt: '' },
  VELHO: { id: 'c3', code: 'VELHO', discountType: 'percentage', discountValue: 50, minSpend: 0, expiresAt: '2020-01-01T00:00:00Z', isActive: true, createdAt: '' },
  INATIVO: { id: 'c4', code: 'INATIVO', discountType: 'percentage', discountValue: 50, minSpend: 0, expiresAt: null, isActive: false, createdAt: '' },
  TOTAL: { id: 'c5', code: 'TOTAL', discountType: 'percentage', discountValue: 100, minSpend: 0, expiresAt: null, isActive: true, createdAt: '' },
};

const catalog: import('../lib/pricing').PricingCatalog = {
  async getRoom(id) {
    const rooms: Record<string, { pricePerNight: number; maxGuests: number; isAvailable?: boolean }> = {
      'room-001': { pricePerNight: 650, maxGuests: 2 },
      'room-004': { pricePerNight: 1590, maxGuests: 3 },
      'room-off': { pricePerNight: 500, maxGuests: 2, isAvailable: false },
    };
    const r = rooms[id];
    return r ? { id, name: id, ...r } : undefined;
  },
  async getExperience(id) {
    return ({
      'exp-001': { id: 'exp-001', name: 'Banho de Argila', price: 180, priceType: 'per_person' },
      'exp-005': { id: 'exp-005', name: 'Passeios', price: 350, priceType: 'per_person' },
    } as const)[id as 'exp-001'];
  },
  async getAddon(id) {
    return ({
      'addon-001': { id: 'addon-001', name: 'Café Flutuante', price: 280, priceType: 'fixed' },
      'addon-002': { id: 'addon-002', name: 'Expedição Noturna', price: 350, priceType: 'per_person' },
    } as const)[id as 'addon-001'];
  },
  async getCoupon(code) {
    return COUPONS[code];
  },
  now: () => new Date('2027-01-01T12:00:00Z'),
};

const req = (o: Partial<import('../lib/pricing').PricingRequest> = {}): import('../lib/pricing').PricingRequest => ({
  channel: 'web',
  roomId: 'room-001',
  checkIn: '2027-03-10',
  checkOut: '2027-03-13', // 3 noites
  guests: 2,
  paymentMethod: 'credit_card',
  ...o,
});

async function quote(o: Partial<import('../lib/pricing').PricingRequest> = {}) {
  const r = await pricing.quoteBooking(req(o), catalog);
  if (!r.ok) throw new Error(`quote recusado: ${r.error}`);
  return r.quote;
}

async function rejected(o: Partial<import('../lib/pricing').PricingRequest>, message?: string) {
  const r = await pricing.quoteBooking(req(o), catalog);
  assert.equal(r.ok, false, `deveria recusar: ${JSON.stringify(o)}`);
  if (message && !r.ok) assert.equal(r.error, message);
}

// ── Repositório que captura o que seria gravado ──
function capturingRepo() {
  const inserted: import('../lib/bookingService').BookingInsertRow[] = [];
  return {
    inserted,
    repo: {
      findActiveBookingOverlaps: async () => [],
      findRoomBlockOverlaps: async () => [],
      insertBooking: async (row: import('../lib/bookingService').BookingInsertRow) => {
        inserted.push(row);
        return { id: `res-${inserted.length}aaa`, bookingCode: row.booking_code, totalPrice: row.total_price } as unknown as Reservation;
      },
    },
  };
}

const baseInput = (o: Partial<import('../lib/bookingService').CreateBookingInput> = {}) => ({
  roomId: 'room-001',
  checkIn: '2027-03-10',
  checkOut: '2027-03-13',
  guests: 2,
  guestName: 'Hóspede',
  guestEmail: 'h@example.com',
  paymentMethod: 'pix' as const,
  ...o,
});

async function create(o: Partial<import('../lib/bookingService').CreateBookingInput>) {
  const { repo, inserted } = capturingRepo();
  const sent: Reservation[] = [];
  const result = await svc.createBooking(baseInput(o), {
    repo,
    catalog,
    sendConfirmation: async (r) => {
      sent.push(r);
    },
    logger: silentLogger,
  });
  await new Promise((r) => setImmediate(r));
  return { result, inserted, sent };
}

before(async () => {
  pricing = await import('../lib/pricing');
  svc = await import('../lib/bookingService');
});

// ─────────────────────────────────────────────────────────────
describe('Cálculo no servidor (regras do checkout)', () => {
  test('quarto × noites; PIX 5%; cartão sem desconto', async () => {
    const card = await quote();
    assert.equal(card.nights, 3);
    assert.equal(card.roomSubtotal, 1950);
    assert.equal(card.total, 1950);
    const pix = await quote({ paymentMethod: 'pix' });
    assert.equal(pix.pixDiscount, 98); // round(1950 × 5%)
    assert.equal(pix.total, 1852);
  });

  test('adicionais (fixo e por pessoa) e experiências extras com preço do catálogo', async () => {
    const q = await quote({
      items: [{ id: 'addon-001' }, { id: 'addon-002' }, { id: 'exp-001', label: 'Banho de Argila (2027-03-11 09:00)' }],
    });
    assert.equal(q.itemsSubtotal, 280 + 350 * 2 + 180 * 2);
    assert.equal(q.total, 1950 + 1340);
    assert.equal(q.lineItems.find((l) => l.id === 'exp-001')!.name, 'Banho de Argila (2027-03-11 09:00)');
  });

  test('cupons: percentual, fixo, gasto mínimo, expirado, inativo, inexistente', async () => {
    const dez = await quote({ couponCode: 'dez' });
    assert.equal(dez.couponDiscount, 195);
    assert.equal(dez.couponCode, 'DEZ');
    assert.equal(dez.total, 1755);
    const cem = await quote({ couponCode: 'CEM', paymentMethod: 'pix' });
    assert.equal(cem.total, 1950 - 98 - 100);
    await rejected({ couponCode: 'CEM', checkOut: '2027-03-11' }, pricing.PRICING_MESSAGES.invalidCoupon); // 650 < 800
    await rejected({ couponCode: 'VELHO' }, pricing.PRICING_MESSAGES.invalidCoupon);
    await rejected({ couponCode: 'INATIVO' }, pricing.PRICING_MESSAGES.invalidCoupon);
    await rejected({ couponCode: 'NAOEXISTE' }, pricing.PRICING_MESSAGES.invalidCoupon);
    await rejected({ couponCode: "DEZ',x" }, pricing.PRICING_MESSAGES.invalidCoupon);
  });

  test('total nunca fica negativo (cupom 100% + PIX)', async () => {
    const q = await quote({ couponCode: 'TOTAL', paymentMethod: 'pix' });
    assert.equal(q.total, 0);
  });

  test('canal manual (equipe): sem desconto PIX, sem adicionais e sem cupom', async () => {
    const q = await quote({ channel: 'manual', paymentMethod: 'pix' });
    assert.equal(q.pixDiscount, 0);
    assert.equal(q.total, 1950);
    await rejected({ channel: 'manual', items: [{ id: 'addon-001' }] }, pricing.PRICING_MESSAGES.manualExtras);
    await rejected({ channel: 'manual', couponCode: 'DEZ' }, pricing.PRICING_MESSAGES.manualExtras);
  });

  test('entradas inválidas são recusadas', async () => {
    await rejected({ guests: 3 }, pricing.PRICING_MESSAGES.invalidGuests); // máx. 2
    await rejected({ guests: 0 }, pricing.PRICING_MESSAGES.invalidGuests);
    await rejected({ guests: 1.5 }, pricing.PRICING_MESSAGES.invalidGuests);
    await rejected({ roomId: 'room-xyz' }, pricing.PRICING_MESSAGES.invalidRoom);
    await rejected({ roomId: 'room-off' }, pricing.PRICING_MESSAGES.invalidRoom);
    await rejected({ checkOut: '2027-03-10' }, pricing.PRICING_MESSAGES.invalidDates);
    await rejected({ checkOut: '2027-07-10' }, pricing.PRICING_MESSAGES.invalidDates); // > 60 noites
    await rejected({ items: [{ id: 'addon-999' }] }, pricing.PRICING_MESSAGES.invalidItem);
    await rejected({ items: [{ id: 'addon-001' }, { id: 'addon-001' }] }, pricing.PRICING_MESSAGES.invalidItem);
    await rejected({ paymentMethod: 'boleto' as never }, pricing.PRICING_MESSAGES.invalidPayment);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Tentativas de adulteração de valor na criação da reserva', () => {
  test('total adulterado (R$ 1) → reserva recusada, nada gravado, nenhum e-mail', async () => {
    const { result, inserted, sent } = await create({ totalPrice: 1 });
    assert.equal(result.success, false);
    assert.equal(result.error, pricing.PRICING_MESSAGES.priceMismatch);
    assert.equal(inserted.length, 0);
    assert.equal(sent.length, 0);
  });

  test('total adulterado em 1 centavo também é recusado', async () => {
    const { result } = await create({ totalPrice: 1851.99 });
    assert.equal(result.success, false);
  });

  test('total correto → gravado com os valores do SERVIDOR, ignorando subtotais do cliente', async () => {
    const { result, inserted } = await create({
      totalPrice: 1852,
      roomPrice: 1,
      addonsPrice: 0,
      discountPrice: 9999,
    });
    assert.equal(result.success, true, result.error);
    const row = inserted[0];
    assert.equal(row.total_price, 1852);
    assert.equal(row.room_price, 1950);
    assert.equal(row.discount_price, 98);
    assert.equal(row.addons_price, 0);
  });

  test('sem total informado → servidor define o valor (nunca undefined/0)', async () => {
    const { result, inserted } = await create({});
    assert.equal(result.success, true, result.error);
    assert.equal(inserted[0].total_price, 1852);
  });

  test('preço de adicional adulterado (R$ 0) é ignorado; total exibido adulterado é recusado', async () => {
    const tampered = await create({
      selectedAddons: [{ id: 'addon-002', name: 'Expedição Noturna', price: 0 }],
      totalPrice: 1852,
    });
    assert.equal(tampered.result.success, false, 'cliente "pagaria" R$ 0 pelo adicional');
    assert.equal(tampered.inserted.length, 0);

    const honest = await create({ selectedAddons: [{ id: 'addon-002', name: 'x', price: 0 }] });
    assert.equal(honest.result.success, true, honest.result.error);
    const li = (honest.inserted[0].selected_addons as unknown as { id: string; name: string; price: number }[])[0];
    assert.deepEqual(li, { id: 'addon-002', name: 'Expedição Noturna', price: 700 });
    assert.equal(honest.inserted[0].total_price, 2650 - Math.round(2650 * 0.05)); // 2650 − 133 = 2517
  });

  test('item inexistente (preço inventado) → recusado', async () => {
    const { result, inserted } = await create({ selectedAddons: [{ id: 'addon-gratis', name: 'Suíte grátis', price: -5000 }] });
    assert.equal(result.success, false);
    assert.equal(inserted.length, 0);
  });

  test('desconto indevido: total com "cupom" sem enviar cupom válido → recusado', async () => {
    const semCupom = await create({ totalPrice: 1852 - 195 });
    assert.equal(semCupom.result.success, false);
    const cupomFalso = await create({ couponCode: 'HACK100', totalPrice: 0 });
    assert.equal(cupomFalso.result.success, false);
    assert.equal(cupomFalso.result.error, pricing.PRICING_MESSAGES.invalidCoupon);
    const expirado = await create({ couponCode: 'VELHO' });
    assert.equal(expirado.result.success, false);
  });

  test('cupom válido → desconto aplicado pelo servidor e código gravado', async () => {
    const { result, inserted } = await create({ couponCode: 'DEZ', totalPrice: 1950 - 98 - 195 });
    assert.equal(result.success, true, result.error);
    assert.equal(inserted[0].coupon_code, 'DEZ');
    assert.equal(inserted[0].discount_price, 98 + 195);
    assert.equal(inserted[0].total_price, 1657);
  });

  test('hóspedes acima da capacidade (para baratear por pessoa / lotar quarto) → recusado', async () => {
    const { result } = await create({ guests: 5 });
    assert.equal(result.success, false);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Server Action: canal e valor', () => {
  let authz: typeof import('../lib/authz');
  before(async () => {
    authz = await import('../lib/authz');
  });
  beforeEach(() => authz.__setStaffResolverForTests(async () => null));
  after(() => authz.__setStaffResolverForTests(null));

  test('público não pode usar o canal manual (sem desconto PIX, mas com status livre)', quiet(async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const r = await createBookingAction({ ...baseInput({ roomId: 'room-004', checkIn: '2035-01-01', checkOut: '2035-01-03' }), channel: 'manual' });
    assert.equal(r.success, false);
    assert.equal(r.error, authz.UNAUTHORIZED_MESSAGE);
    const unknown = await createBookingAction({ ...baseInput({ roomId: 'room-004', checkIn: '2035-01-01', checkOut: '2035-01-03' }), channel: 'vip' as never });
    assert.equal(unknown.success, false);
  }));

  test('checkout real (mock dev): valor adulterado recusado; valor do catálogo aceito', quiet(async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    // room-004: R$ 1.590/noite × 2 = 3.180; PIX 5% = 159 → 3.021
    const tampered = await createBookingAction({ ...baseInput({ roomId: 'room-004', checkIn: '2035-02-01', checkOut: '2035-02-03' }), totalPrice: 10 });
    assert.equal(tampered.success, false);
    const ok = await createBookingAction({ ...baseInput({ roomId: 'room-004', checkIn: '2035-02-01', checkOut: '2035-02-03' }), totalPrice: 3021 });
    assert.equal(ok.success, true, ok.error);
    assert.equal(ok.reservation!.totalPrice, 3021);
  }));
});

// ─────────────────────────────────────────────────────────────
describe('Confirmação de pagamento confere o valor pago', () => {
  type Conf = typeof import('../lib/paymentConfirmation');
  let conf: Conf;
  before(async () => {
    conf = await import('../lib/paymentConfirmation');
  });

  function memoryRepo(booking: { id: string; status: string; totalPrice: number } | null) {
    const state = { booking: booking ? { ...booking } : null, updates: 0 };
    return {
      state,
      repo: {
        getBooking: async (id: string) => (state.booking && state.booking.id === id ? { ...state.booking } : null),
        markConfirmed: async (id: string) => {
          if (state.booking?.id === id && state.booking.status === 'pending') {
            state.booking.status = 'confirmed';
            state.updates++;
            return 1;
          }
          return 0;
        },
      },
    };
  }
  const pay = (o: Partial<import('../lib/paymentConfirmation').PaymentSnapshot> = {}) => ({
    id: 123,
    status: 'approved',
    transaction_amount: 1852,
    external_reference: 'res-abc12345',
    currency_id: 'BRL',
    ...o,
  });
  const pending = () => ({ id: 'res-abc12345', status: 'pending', totalPrice: 1852 });

  test('aprovado e valor igual → confirma', async () => {
    const m = memoryRepo(pending());
    const r = await conf.confirmBookingFromPayment(pay(), m.repo, silentLogger);
    assert.equal(r.outcome, 'confirmed');
    assert.equal(m.state.booking!.status, 'confirmed');
  });

  test('valor pago MENOR (adulterado) → não confirma, reserva continua pendente', async () => {
    for (const paid of [1, 1851.99, 926]) {
      const m = memoryRepo(pending());
      const r = await conf.confirmBookingFromPayment(pay({ transaction_amount: paid }), m.repo, silentLogger);
      assert.equal(r.outcome, 'amount_mismatch', `pago ${paid}`);
      assert.equal(m.state.booking!.status, 'pending');
      assert.equal(m.state.updates, 0);
    }
  });

  test('valor pago MAIOR também é divergência (requer tratamento manual)', async () => {
    const m = memoryRepo(pending());
    const r = await conf.confirmBookingFromPayment(pay({ transaction_amount: 1852.01 }), m.repo, silentLogger);
    assert.equal(r.outcome, 'amount_mismatch');
  });

  test('pagamento não aprovado, moeda diferente, referência forjada ou inexistente', async () => {
    for (const status of ['pending', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back']) {
      assert.equal((await conf.confirmBookingFromPayment(pay({ status }), memoryRepo(pending()).repo, silentLogger)).outcome, 'not_approved', status);
    }
    assert.equal((await conf.confirmBookingFromPayment(pay({ currency_id: 'USD' }), memoryRepo(pending()).repo, silentLogger)).outcome, 'currency_mismatch');
    for (const ref of [null, '', 'res-abc12345,status.neq.x', '../res', 'AN-1234']) {
      assert.equal((await conf.confirmBookingFromPayment(pay({ external_reference: ref }), memoryRepo(pending()).repo, silentLogger)).outcome, 'invalid_reference', String(ref));
    }
    assert.equal((await conf.confirmBookingFromPayment(pay({ external_reference: 'res-zzzz9999' }), memoryRepo(pending()).repo, silentLogger)).outcome, 'booking_not_found');
  });

  test('reserva cancelada não é reativada por pagamento; confirmada é idempotente', async () => {
    const cancelled = memoryRepo({ ...pending(), status: 'cancelled' });
    assert.equal((await conf.confirmBookingFromPayment(pay(), cancelled.repo, silentLogger)).outcome, 'not_pending');
    assert.equal(cancelled.state.booking!.status, 'cancelled');

    const m = memoryRepo(pending());
    await conf.confirmBookingFromPayment(pay(), m.repo, silentLogger);
    const again = await conf.confirmBookingFromPayment(pay(), m.repo, silentLogger);
    assert.equal(again.outcome, 'already_confirmed');
    assert.equal(m.state.updates, 1);
  });

  test('UPDATE condicional em PostgreSQL: só confirma reserva pendente e com valor conferido', async () => {
    const db = new PGlite();
    await db.exec(`CREATE TABLE bookings (id text primary key, status text, total_price numeric(10,2));
      INSERT INTO bookings VALUES ('res-aaaa0001','pending',1852.00), ('res-aaaa0002','cancelled',500.00);`);
    const repo = {
      getBooking: async (id: string) => {
        const r = await db.query<{ id: string; status: string; total_price: string }>('SELECT id, status, total_price FROM bookings WHERE id = $1', [id]);
        return r.rows[0] ? { id: r.rows[0].id, status: r.rows[0].status, totalPrice: Number(r.rows[0].total_price) } : null;
      },
      markConfirmed: async (id: string) =>
        (await db.query(`UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND status = 'pending'`, [id])).affectedRows ?? 0,
    };
    assert.equal((await conf.confirmBookingFromPayment(pay({ external_reference: 'res-aaaa0001', transaction_amount: 10 }), repo, silentLogger)).outcome, 'amount_mismatch');
    assert.equal((await repo.getBooking('res-aaaa0001'))!.status, 'pending');
    assert.equal((await conf.confirmBookingFromPayment(pay({ external_reference: 'res-aaaa0001' }), repo, silentLogger)).outcome, 'confirmed');
    assert.equal((await conf.confirmBookingFromPayment(pay({ external_reference: 'res-aaaa0002', transaction_amount: 500 }), repo, silentLogger)).outcome, 'not_pending');
    assert.equal((await repo.getBooking('res-aaaa0002'))!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────
describe('Fluxo Mercado Pago ponta a ponta (API simulada, sem rede)', () => {
  const realFetch = globalThis.fetch;
  let mpPayment: Record<string, unknown> = {};
  const mpCalls: string[] = [];

  before(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      mpCalls.push(url);
      if (!url.startsWith('https://api.mercadopago.com/')) throw new Error(`rede bloqueada no teste: ${url}`);
      return new Response(JSON.stringify(mpPayment), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
    delete env.MP_ACCESS_TOKEN;
  });

  async function newPendingBooking(checkIn: string, checkOut: string) {
    const { createBookingAction } = await import('../app/actions/booking');
    const r = await createBookingAction(baseInput({ roomId: 'room-003', checkIn, checkOut }));
    assert.equal(r.success, true, r.error);
    return r.reservation!;
  }

  async function webhook(paymentId: number) {
    const { POST } = await import('../app/api/webhooks/mercadopago/route');
    const res = await POST(new Request(`http://localhost/api/webhooks/mercadopago?topic=payment&id=${paymentId}`, { method: 'POST' }) as never);
    return { status: res.status, body: (await res.json()) as { outcome?: string } };
  }

  test('PIX (mock dev) usa o valor da reserva, não o enviado pelo navegador', quiet(async () => {
    const booking = await newPendingBooking('2036-01-10', '2036-01-12'); // 1180 × 2 = 2360 − 118 = 2242
    assert.equal(booking.totalPrice, 2242);
    const { createPixPaymentAction } = await import('../app/actions/payment');
    const pix = await createPixPaymentAction(booking.id, 1, 'x@y.com', 'x');
    assert.equal(pix.success, true);
    assert.ok(pix.copiaECola!.includes('2242.00'), 'QR com valor da reserva');
    assert.ok(!pix.copiaECola!.includes('5303986' + '51.00'));
  }));

  test('webhook com pagamento de valor adulterado NÃO confirma a reserva', quiet(async () => {
    const booking = await newPendingBooking('2036-02-10', '2036-02-12');
    env.MP_ACCESS_TOKEN = 'TEST-token-ficticio';
    mpPayment = { id: 9001, status: 'approved', status_detail: 'accredited', transaction_amount: 1, currency_id: 'BRL', external_reference: booking.id };
    const r = await webhook(9001);
    assert.equal(r.status, 200);
    assert.equal(r.body.outcome, 'amount_mismatch');
    const mock = await import('../lib/mockData');
    assert.equal(mock.getReservationById(booking.id)!.status, 'pending');
    assert.ok(mpCalls.some((u) => u.endsWith('/payments/9001')), 'status consultado na API do MP, não no corpo da notificação');
  }));

  test('webhook com valor correto confirma; reenvio é idempotente', quiet(async () => {
    const booking = await newPendingBooking('2036-03-10', '2036-03-12');
    env.MP_ACCESS_TOKEN = 'TEST-token-ficticio';
    mpPayment = { id: 9002, status: 'approved', status_detail: 'accredited', transaction_amount: booking.totalPrice, currency_id: 'BRL', external_reference: booking.id };
    assert.equal((await webhook(9002)).body.outcome, 'confirmed');
    const mock = await import('../lib/mockData');
    assert.equal(mock.getReservationById(booking.id)!.status, 'confirmed');
    assert.equal((await webhook(9002)).body.outcome, 'already_confirmed');
  }));

  test('confirmação manual pela equipe também confere o valor no MP', quiet(async () => {
    const authz = await import('../lib/authz');
    authz.__setStaffResolverForTests(async () => ({ id: 'staff', email: null }));
    try {
      const booking = await newPendingBooking('2036-04-10', '2036-04-12');
      env.MP_ACCESS_TOKEN = 'TEST-token-ficticio';
      const { confirmBookingPayment } = await import('../app/actions/payment');
      mpPayment = { id: 9003, status: 'approved', transaction_amount: 100, currency_id: 'BRL', external_reference: booking.id };
      const bad = await confirmBookingPayment(booking.id, 9003);
      assert.equal(bad.success, false);
      assert.equal(bad.outcome, 'amount_mismatch');
      mpPayment = { id: 9004, status: 'approved', transaction_amount: booking.totalPrice, currency_id: 'BRL', external_reference: 'res-outra1234' };
      const other = await confirmBookingPayment(booking.id, 9004);
      assert.equal(other.outcome, 'invalid_reference', 'pagamento de outra reserva');
      assert.equal((await confirmBookingPayment(booking.id)).success, false, 'exige ID do pagamento');
      mpPayment = { id: 9005, status: 'approved', transaction_amount: booking.totalPrice, currency_id: 'BRL', external_reference: booking.id };
      assert.equal((await confirmBookingPayment(booking.id, 9005)).outcome, 'confirmed');
    } finally {
      authz.__setStaffResolverForTests(null);
    }
  }));
});

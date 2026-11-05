// ============================================================
// scripts/test-booking-integrity.ts
// Testes de integridade de reservas — overbooking e reservas fantasmas.
//
// Execução: npm run test:booking
//
// AMBIENTE ISOLADO — NÃO TOCA EM PRODUÇÃO:
//  - Variáveis do Supabase e de e-mail são apagadas ANTES de importar
//    qualquer módulo do app (o .env.local nunca é lido).
//  - Testes de banco rodam em PGlite (PostgreSQL real compilado para WASM,
//    em memória), aplicando supabase/schema.sql + migrations locais.
//  - Testes de falha usam repositórios falsos injetados.
// ============================================================

// ── 0. Isolamento: precisa acontecer antes de qualquer import do app ──
for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'ANAUE_ALLOW_MOCK_DATA',
]) {
  delete process.env[key];
}
(process.env as Record<string, string>).NODE_ENV = 'test';

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

type ServiceModule = typeof import('../lib/bookingService');
type ErrorsModule = typeof import('../lib/bookingErrors');
type Reservation = import('../types').Reservation;

let svc: ServiceModule;
let errs: ErrorsModule;

const SCHEMA_SQL = readFileSync(resolve(__dirname, '../supabase/schema.sql'), 'utf-8');
const MIGRATION_SQL = readFileSync(
  resolve(__dirname, '../supabase/migrations/20261105000000_booking_integrity.sql'),
  'utf-8'
);

const silentLogger = { error: () => {}, warn: () => {} };

async function createTestDb(withMigration = true): Promise<PGlite> {
  const db = new PGlite({ extensions: { btree_gist, uuid_ossp } });
  await db.exec(SCHEMA_SQL);
  if (withMigration) await db.exec(MIGRATION_SQL);
  return db;
}

function pgCode(err: unknown): string | undefined {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : undefined;
}

/** Repositório real sobre PGlite — mesma semântica de SQL do Supabase. */
function pgliteRepo(db: PGlite): import('../lib/bookingService').BookingRepository {
  return {
    async findActiveBookingOverlaps(roomId, checkIn, checkOut) {
      const r = await db.query<{ id: string }>(
        `SELECT id FROM bookings WHERE room_id = $1 AND status <> 'cancelled'
           AND check_in_date < $3 AND check_out_date > $2`,
        [roomId, checkIn, checkOut]
      );
      return r.rows;
    },
    async findRoomBlockOverlaps(roomId, checkIn, checkOut) {
      const r = await db.query<{ id: string }>(
        `SELECT id FROM room_blocks WHERE room_id = $1 AND start_date < $3 AND end_date > $2`,
        [roomId, checkIn, checkOut]
      );
      return r.rows;
    },
    async insertBooking(row) {
      try {
        const r = await db.query<Record<string, unknown>>(
          `INSERT INTO bookings (booking_code, room_id, user_id, guest_name, guest_email, guest_phone,
             check_in_date, check_out_date, guests, total_price, status, payment_method)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id, booking_code, room_id, check_in_date::text, check_out_date::text, status`,
          [
            row.booking_code, row.room_id ?? null, row.user_id ?? null, row.guest_name, row.guest_email,
            row.guest_phone ?? '', row.check_in_date, row.check_out_date, row.guests ?? 2,
            row.total_price, row.status ?? 'pending', row.payment_method ?? 'pix',
          ]
        );
        const b = r.rows[0];
        return {
          id: b.id, bookingCode: b.booking_code, roomId: b.room_id ?? '',
          checkIn: b.check_in_date, checkOut: b.check_out_date, status: b.status,
          guestName: row.guest_name, guestEmail: row.guest_email,
        } as unknown as Reservation;
      } catch (err) {
        throw new svc.BookingDbError(err instanceof Error ? err.message : 'db error', pgCode(err));
      }
    },
  };
}

function bookingInput(overrides: Partial<import('../lib/bookingService').CreateBookingInput> = {}) {
  return {
    roomId: 'room-001',
    checkIn: '2027-03-10',
    checkOut: '2027-03-13',
    guests: 2,
    totalPrice: 1950,
    roomPrice: 1950,
    addonsPrice: 0,
    discountPrice: 0,
    guestName: 'Hóspede Teste',
    guestEmail: 'teste@example.com',
    paymentMethod: 'pix' as const,
    ...overrides,
  };
}

function recordingDeps(repo: import('../lib/bookingService').BookingRepository | null) {
  const sent: Reservation[] = [];
  return {
    sent,
    deps: {
      repo,
      sendConfirmation: async (r: Reservation) => {
        sent.push(r);
      },
      logger: silentLogger,
    },
  };
}

async function activeCount(db: PGlite, roomId: string): Promise<number> {
  const r = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM bookings WHERE room_id = $1 AND status <> 'cancelled'
       AND check_in_date >= '2027-01-01'`,
    [roomId]
  );
  return r.rows[0].n;
}

async function rawInsert(db: PGlite, roomId: string, inDate: string, outDate: string, status = 'confirmed') {
  return db.query<{ id: string }>(
    `INSERT INTO bookings (room_id, guest_name, guest_email, check_in_date, check_out_date, total_price, status)
     VALUES ($1, 'Raw', 'raw@example.com', $2, $3, 100, $4) RETURNING id`,
    [roomId, inDate, outDate, status]
  );
}

async function expectPgError(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.equal(pgCode(err), code);
    return true;
  });
}

const tick = () => new Promise((r) => setImmediate(r));

before(async () => {
  svc = await import('../lib/bookingService');
  errs = await import('../lib/bookingErrors');
});

// ─────────────────────────────────────────────────────────────
describe('1. Concorrência — mesmo quarto, períodos conflitantes', () => {
  test('controle: SEM a migration, a corrida check-then-insert gera overbooking (bug original)', async () => {
    const db = await createTestDb(false);
    const { deps } = recordingDeps(pgliteRepo(db));
    const results = await Promise.all([
      svc.createBooking(bookingInput({ guestName: 'A' }), deps),
      svc.createBooking(bookingInput({ guestName: 'B', checkIn: '2027-03-11', checkOut: '2027-03-14' }), deps),
    ]);
    // Ambas as pré-checagens rodam antes dos INSERTs → as duas "passam".
    assert.equal(results.filter((r) => r.success).length, 2);
    assert.equal(await activeCount(db, 'room-001'), 2);
  });

  test('COM a migration: duas reservas simultâneas → apenas uma é confirmada', async () => {
    const db = await createTestDb();
    const { deps, sent } = recordingDeps(pgliteRepo(db));
    const results = await Promise.all([
      svc.createBooking(bookingInput({ guestName: 'A' }), deps),
      svc.createBooking(bookingInput({ guestName: 'B', checkIn: '2027-03-11', checkOut: '2027-03-14' }), deps),
    ]);
    await tick();
    const ok = results.filter((r) => r.success);
    const fail = results.filter((r) => !r.success);
    assert.equal(ok.length, 1);
    assert.equal(fail.length, 1);
    assert.equal(fail[0].error, errs.BOOKING_MESSAGES.roomConflict);
    assert.equal(await activeCount(db, 'room-001'), 1);
    assert.equal(sent.length, 1, 'somente a reserva persistida recebe e-mail');
    assert.equal(sent[0].id, ok[0].bookingId);
  });

  test('COM a migration: 10 reservas simultâneas idênticas → exatamente 1 persistida', async () => {
    const db = await createTestDb();
    const { deps, sent } = recordingDeps(pgliteRepo(db));
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => svc.createBooking(bookingInput({ guestName: `G${i}` }), deps))
    );
    await tick();
    assert.equal(results.filter((r) => r.success).length, 1);
    assert.equal(await activeCount(db, 'room-001'), 1);
    assert.equal(sent.length, 1);
  });

  test('banco rejeita INSERT sobreposto mesmo ignorando a aplicação (23P01)', async () => {
    const db = await createTestDb();
    await rawInsert(db, 'room-002', '2027-05-01', '2027-05-05');
    await expectPgError(rawInsert(db, 'room-002', '2027-05-04', '2027-05-06'), '23P01');
    await expectPgError(rawInsert(db, 'room-002', '2027-04-28', '2027-05-10'), '23P01'); // engloba
    await expectPgError(rawInsert(db, 'room-002', '2027-05-02', '2027-05-03'), '23P01'); // contida
  });

  test('banco rejeita UPDATE de datas que cria sobreposição', async () => {
    const db = await createTestDb();
    await rawInsert(db, 'room-002', '2027-05-01', '2027-05-05');
    const { rows } = await rawInsert(db, 'room-002', '2027-05-10', '2027-05-12');
    await expectPgError(
      db.query(`UPDATE bookings SET check_in_date = '2027-05-03' WHERE id = $1`, [rows[0].id]),
      '23P01'
    );
  });
});

// ─────────────────────────────────────────────────────────────
describe('2. Períodos não conflitantes continuam funcionando', () => {
  test('check-out de uma reserva no mesmo dia do check-in da próxima', async () => {
    const db = await createTestDb();
    const { deps } = recordingDeps(pgliteRepo(db));
    const a = await svc.createBooking(bookingInput({ checkIn: '2027-06-01', checkOut: '2027-06-04' }), deps);
    const b = await svc.createBooking(bookingInput({ checkIn: '2027-06-04', checkOut: '2027-06-07' }), deps);
    const c = await svc.createBooking(bookingInput({ checkIn: '2027-05-28', checkOut: '2027-06-01' }), deps);
    assert.ok(a.success && b.success && c.success, JSON.stringify([a, b, c]));
    assert.equal(await activeCount(db, 'room-001'), 3);
  });

  test('quartos diferentes no mesmo período, inclusive em paralelo', async () => {
    const db = await createTestDb();
    const { deps } = recordingDeps(pgliteRepo(db));
    const results = await Promise.all(
      ['room-001', 'room-002', 'room-003', 'room-004'].map((roomId) =>
        svc.createBooking(bookingInput({ roomId }), deps)
      )
    );
    assert.ok(results.every((r) => r.success), JSON.stringify(results));
  });

  test('datas inválidas são rejeitadas (app e banco)', async () => {
    const db = await createTestDb();
    const { deps } = recordingDeps(pgliteRepo(db));
    const r = await svc.createBooking(bookingInput({ checkIn: '2027-06-05', checkOut: '2027-06-05' }), deps);
    assert.equal(r.success, false);
    // check-in = check-out → CHECK constraint (23514)
    await expectPgError(rawInsert(db, 'room-001', '2027-06-05', '2027-06-05'), '23514');
    // datas invertidas → o próprio daterange() falha antes do CHECK (22000); ambos rejeitam
    await assert.rejects(rawInsert(db, 'room-001', '2027-06-05', '2027-06-03'), (err: unknown) => {
      assert.ok(['23514', '22000'].includes(pgCode(err) ?? ''), `código inesperado: ${pgCode(err)}`);
      return true;
    });
  });
});

// ─────────────────────────────────────────────────────────────
describe('3 e 4. Falha de persistência: sem sucesso e sem e-mail', () => {
  const okRepoBase = {
    findActiveBookingOverlaps: async () => [],
    findRoomBlockOverlaps: async () => [],
  };

  test('INSERT falha (erro genérico do banco) → success=false, sem reserva, sem e-mail', async () => {
    const { deps, sent } = recordingDeps({
      ...okRepoBase,
      insertBooking: async () => {
        throw new svc.BookingDbError('connection reset', '08006');
      },
    });
    const r = await svc.createBooking(bookingInput(), deps);
    await tick();
    assert.equal(r.success, false);
    assert.equal(r.reservation, undefined);
    assert.equal(r.bookingCode, undefined);
    assert.equal(r.error, errs.BOOKING_MESSAGES.persistenceFailed);
    assert.equal(sent.length, 0);
  });

  test('INSERT "sucesso" sem retorno de dados → tratado como falha, sem e-mail', async () => {
    const { deps, sent } = recordingDeps({
      ...okRepoBase,
      insertBooking: async () => null as unknown as Reservation,
    });
    const r = await svc.createBooking(bookingInput(), deps);
    await tick();
    assert.equal(r.success, false);
    assert.equal(sent.length, 0);
  });

  test('exceção inesperada (rede) no INSERT → sem sucesso, sem e-mail', async () => {
    const { deps, sent } = recordingDeps({
      ...okRepoBase,
      insertBooking: async () => {
        throw new TypeError('fetch failed');
      },
    });
    const r = await svc.createBooking(bookingInput(), deps);
    await tick();
    assert.equal(r.success, false);
    assert.equal(sent.length, 0);
  });

  test('falha na consulta de disponibilidade → bloqueia (fail-closed), INSERT nunca é chamado', async () => {
    let inserts = 0;
    const { deps, sent } = recordingDeps({
      findActiveBookingOverlaps: async () => {
        throw new svc.BookingDbError('timeout', '57014');
      },
      findRoomBlockOverlaps: async () => [],
      insertBooking: async () => {
        inserts++;
        return {} as Reservation;
      },
    });
    const r = await svc.createBooking(bookingInput(), deps);
    await tick();
    assert.equal(r.success, false);
    assert.equal(r.error, errs.BOOKING_MESSAGES.availabilityUnavailable);
    assert.equal(inserts, 0);
    assert.equal(sent.length, 0);
  });

  test('falha na consulta de bloqueios também bloqueia', async () => {
    const { deps } = recordingDeps({
      findActiveBookingOverlaps: async () => [],
      findRoomBlockOverlaps: async () => {
        throw new Error('room_blocks indisponível');
      },
      insertBooking: async () => ({}) as Reservation,
    });
    const r = await svc.createBooking(bookingInput(), deps);
    assert.equal(r.success, false);
  });

  test('sem repositório (produção sem Supabase) → erro, nunca mock', async () => {
    const { deps, sent } = recordingDeps(null);
    const r = await svc.createBooking(bookingInput(), deps);
    assert.equal(r.success, false);
    assert.equal(r.error, errs.BOOKING_MESSAGES.systemUnavailable);
    assert.equal(sent.length, 0);
  });

  test('colisão de booking_code (23505) → nova tentativa com outro código', async () => {
    const codes: string[] = [];
    const { deps, sent } = recordingDeps({
      ...okRepoBase,
      insertBooking: async (row) => {
        codes.push(row.booking_code!);
        if (codes.length === 1) throw new svc.BookingDbError('duplicate key', '23505');
        return { id: 'res-ok', bookingCode: row.booking_code } as Reservation;
      },
    });
    const r = await svc.createBooking(bookingInput(), deps);
    await tick();
    assert.equal(r.success, true);
    assert.equal(codes.length, 2);
    assert.equal(sent.length, 1);
  });

  test('falha no envio de e-mail não desfaz nem esconde a reserva persistida', async () => {
    const db = await createTestDb();
    const r = await svc.createBooking(bookingInput(), {
      repo: pgliteRepo(db),
      sendConfirmation: async () => {
        throw new Error('SMTP fora');
      },
      logger: silentLogger,
    });
    await tick();
    assert.equal(r.success, true);
    assert.equal(await activeCount(db, 'room-001'), 1);
  });
});

// ─────────────────────────────────────────────────────────────
describe('5. Bloqueios de quarto impedem reservas incompatíveis', () => {
  test('reserva sobre bloqueio → recusada pela aplicação com mensagem clara', async () => {
    const db = await createTestDb();
    await db.query(
      `INSERT INTO room_blocks (room_id, start_date, end_date, reason) VALUES ('room-003','2027-07-10','2027-07-15','maintenance')`
    );
    const { deps, sent } = recordingDeps(pgliteRepo(db));
    const r = await svc.createBooking(bookingInput({ roomId: 'room-003', checkIn: '2027-07-12', checkOut: '2027-07-16' }), deps);
    await tick();
    assert.equal(r.success, false);
    assert.equal(r.error, errs.BOOKING_MESSAGES.roomBlocked);
    assert.equal(sent.length, 0);
  });

  test('banco rejeita reserva sobre bloqueio mesmo ignorando a pré-checagem (AN001)', async () => {
    const db = await createTestDb();
    await db.query(
      `INSERT INTO room_blocks (room_id, start_date, end_date) VALUES ('room-003','2027-07-10','2027-07-15')`
    );
    await expectPgError(rawInsert(db, 'room-003', '2027-07-14', '2027-07-18'), 'AN001');
    // adjacente ao bloqueio é permitido
    await rawInsert(db, 'room-003', '2027-07-15', '2027-07-18');
  });

  test('corrida: pré-checagem passa, bloqueio é criado antes do INSERT → banco recusa (AN001)', async () => {
    const db = await createTestDb();
    const base = pgliteRepo(db);
    const repo = {
      ...base,
      // Simula o bloqueio sendo criado pelo admin entre a checagem e o INSERT
      insertBooking: async (row: Parameters<typeof base.insertBooking>[0]) => {
        await db.query(
          `INSERT INTO room_blocks (room_id, start_date, end_date) VALUES ('room-004','2027-08-01','2027-08-03')`
        );
        return base.insertBooking(row);
      },
    };
    const { deps, sent } = recordingDeps(repo);
    const r = await svc.createBooking(bookingInput({ roomId: 'room-004', checkIn: '2027-08-02', checkOut: '2027-08-05' }), deps);
    await tick();
    assert.equal(r.success, false);
    assert.equal(r.error, errs.BOOKING_MESSAGES.roomBlocked);
    assert.equal(sent.length, 0);
    assert.equal(await activeCount(db, 'room-004'), 0);
  });

  test('bloqueio sobre reserva ativa → banco recusa (AN002)', async () => {
    const db = await createTestDb();
    await rawInsert(db, 'room-001', '2027-09-01', '2027-09-05');
    await expectPgError(
      db.query(`INSERT INTO room_blocks (room_id, start_date, end_date) VALUES ('room-001','2027-09-04','2027-09-06')`),
      'AN002'
    );
  });

  test('erro AN002 é traduzido para mensagem amigável', () => {
    assert.equal(errs.classifyDbError({ code: 'AN002' }), 'block_conflicts_with_booking');
    assert.equal(errs.bookingErrorMessage('block_conflicts_with_booking'), errs.BOOKING_MESSAGES.blockConflictsWithBooking);
    assert.equal(errs.bookingErrorMessage(errs.classifyDbError({ code: '23P01' })), errs.BOOKING_MESSAGES.roomConflict);
    assert.equal(errs.bookingErrorMessage(errs.classifyDbError({ code: 'XX000' })), errs.BOOKING_MESSAGES.persistenceFailed);
  });
});

// ─────────────────────────────────────────────────────────────
describe('6. Reservas canceladas', () => {
  test('reserva cancelada não ocupa o quarto — nova reserva no período é aceita', async () => {
    const db = await createTestDb();
    await rawInsert(db, 'room-002', '2027-10-01', '2027-10-05', 'cancelled');
    const { deps } = recordingDeps(pgliteRepo(db));
    const r = await svc.createBooking(bookingInput({ roomId: 'room-002', checkIn: '2027-10-02', checkOut: '2027-10-04' }), deps);
    assert.equal(r.success, true, r.error);
  });

  test('cancelar libera o período para nova reserva', async () => {
    const db = await createTestDb();
    const { rows } = await rawInsert(db, 'room-002', '2027-10-01', '2027-10-05');
    await expectPgError(rawInsert(db, 'room-002', '2027-10-02', '2027-10-04'), '23P01');
    await db.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [rows[0].id]);
    await rawInsert(db, 'room-002', '2027-10-02', '2027-10-04');
  });

  test('reativar reserva cancelada sobre período já ocupado → banco recusa (23P01)', async () => {
    const db = await createTestDb();
    const { rows } = await rawInsert(db, 'room-002', '2027-11-01', '2027-11-05', 'cancelled');
    await rawInsert(db, 'room-002', '2027-11-03', '2027-11-06');
    await expectPgError(
      db.query(`UPDATE bookings SET status = 'confirmed' WHERE id = $1`, [rows[0].id]),
      '23P01'
    );
  });

  test('reativar reserva cancelada sobre bloqueio → banco recusa (AN001)', async () => {
    const db = await createTestDb();
    const { rows } = await rawInsert(db, 'room-002', '2027-12-01', '2027-12-05', 'cancelled');
    await db.query(
      `INSERT INTO room_blocks (room_id, start_date, end_date) VALUES ('room-002','2027-12-02','2027-12-03')`
    );
    await expectPgError(
      db.query(`UPDATE bookings SET status = 'pending' WHERE id = $1`, [rows[0].id]),
      'AN001'
    );
  });

  test('status checked_in / checked_out continuam ocupando o quarto (regra preexistente)', async () => {
    const db = await createTestDb();
    await rawInsert(db, 'room-003', '2027-12-10', '2027-12-12', 'checked_in');
    await rawInsert(db, 'room-003', '2027-12-12', '2027-12-14', 'checked_out');
    await expectPgError(rawInsert(db, 'room-003', '2027-12-11', '2027-12-13'), '23P01');
  });

  test('mudança de status sem mudar datas (pending → confirmed → checked_in) é permitida', async () => {
    const db = await createTestDb();
    await db.query(
      `INSERT INTO room_blocks (room_id, start_date, end_date) VALUES ('room-004','2028-01-10','2028-01-12')`
    );
    const { rows } = await rawInsert(db, 'room-004', '2028-01-01', '2028-01-05', 'pending');
    await db.query(`UPDATE bookings SET status = 'confirmed' WHERE id = $1`, [rows[0].id]);
    await db.query(`UPDATE bookings SET status = 'checked_in' WHERE id = $1`, [rows[0].id]);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Modo mock (somente desenvolvimento) e server action', () => {
  test('isMockDataAllowed: liberado em dev/test, proibido em produção', async () => {
    const { isMockDataAllowed } = await import('../lib/dataMode');
    assert.equal(isMockDataAllowed(), true);
    const env = process.env as Record<string, string>;
    env.NODE_ENV = 'production';
    try {
      assert.equal(isMockDataAllowed(), false);
      env.ANAUE_ALLOW_MOCK_DATA = 'true';
      assert.equal(isMockDataAllowed(), true, 'escape explícito para demo offline');
    } finally {
      delete env.ANAUE_ALLOW_MOCK_DATA;
      env.NODE_ENV = 'test';
    }
  });

  test('createBookingAction em produção sem Supabase → falha (não cria reserva mock)', async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const mock = await import('../lib/mockData');
    const before = mock.getAllReservations().length;
    const env = process.env as Record<string, string>;
    env.NODE_ENV = 'production';
    try {
      const r = await createBookingAction(bookingInput({ roomId: 'room-004', checkIn: '2030-01-01', checkOut: '2030-01-03' }));
      assert.equal(r.success, false);
      assert.equal(mock.getAllReservations().length, before);
    } finally {
      env.NODE_ENV = 'test';
    }
  });

  test('createBookingAction (mock dev): duas reservas paralelas conflitantes → só uma', async () => {
    const { createBookingAction } = await import('../app/actions/booking');
    const results = await Promise.all([
      createBookingAction(bookingInput({ roomId: 'room-004', checkIn: '2031-02-01', checkOut: '2031-02-04', guestName: 'A' })),
      createBookingAction(bookingInput({ roomId: 'room-004', checkIn: '2031-02-02', checkOut: '2031-02-05', guestName: 'B' })),
    ]);
    assert.equal(results.filter((r) => r.success).length, 1, JSON.stringify(results));
    assert.equal(results.find((r) => !r.success)?.error, errs.BOOKING_MESSAGES.roomConflict);
  });
});

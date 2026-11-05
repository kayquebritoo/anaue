// ============================================================
// scripts/test-payment-settings.ts
// Painel → Configurações → Pagamentos: diagnóstico, teste de conexão,
// permissões, histórico de eventos e garantia de que credenciais nunca
// aparecem em respostas. Ambiente isolado (modo mock, fetch simulado).
// ============================================================

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET',
  'MP_NOTIFICATION_URL', 'MP_ENVIRONMENT', 'ANAUE_ALLOW_MOCK_DATA', 'ANAUE_STAFF_EMAILS', 'VERCEL_ENV',
  'NEXT_PUBLIC_ONLINE_BOOKING_ENABLED', 'NEXT_PUBLIC_APP_URL', 'VERCEL_URL',
]) {
  delete process.env[key];
}
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = 'test';

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEST_TOKEN = 'TEST-1234567890123456-110500-abcdefabcdefabcdefabcdefabcdef12-987654321';
const PROD_TOKEN = 'APP_USR-1234567890123456-110500-fedcbafedcbafedcbafedcbafedcba98-123456789';
const WEBHOOK_SECRET = 'segredo-webhook-super-secreto-123';

const quiet = <T>(fn: () => Promise<T>) => async () => {
  const { error, warn, log } = console;
  console.error = console.warn = console.log = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { error, warn, log });
  }
};

function assertNoSecrets(value: unknown, label: string) {
  const json = JSON.stringify(value);
  for (const secret of [TEST_TOKEN, PROD_TOKEN, WEBHOOK_SECRET, 'abcdefabcdef', 'fedcbafedcba', '1234567890123456']) {
    assert.ok(!json.includes(secret), `${label}: resposta contém trecho de credencial`);
  }
}

type Authz = typeof import('../lib/authz');
let authz: Authz;
before(async () => {
  authz = await import('../lib/authz');
});
beforeEach(() => {
  delete env.MP_ACCESS_TOKEN;
  delete env.MP_ENVIRONMENT;
  delete env.MP_WEBHOOK_SECRET;
  delete env.MP_NOTIFICATION_URL;
  delete env.VERCEL_ENV;
  delete env.NEXT_PUBLIC_ONLINE_BOOKING_ENABLED;
  authz.__setStaffResolverForTests(async () => null);
});
after(() => authz.__setStaffResolverForTests(null));

// ─────────────────────────────────────────────────────────────
describe('Diagnóstico da integração', () => {
  test('tipo da credencial pelo prefixo', async () => {
    const { inferMpEnvironment } = await import('../lib/payments/diagnostics');
    assert.equal(inferMpEnvironment(TEST_TOKEN), 'test');
    assert.equal(inferMpEnvironment(PROD_TOKEN), 'production');
    assert.equal(inferMpEnvironment('qualquer'), 'unknown');
    assert.equal(inferMpEnvironment(undefined), 'unknown');
  });

  test('não configurado', async () => {
    const { getPaymentIntegrationStatus } = await import('../lib/payments/diagnostics');
    const s = getPaymentIntegrationStatus();
    assert.equal(s.configured, false);
    assert.equal(s.environment, 'unknown');
    assert.ok(s.warnings.some((w) => /não configurado/.test(w.message)));
  });

  test('credencial de PRODUÇÃO no staging gera alerta crítico', async () => {
    const { getPaymentIntegrationStatus } = await import('../lib/payments/diagnostics');
    env.MP_ACCESS_TOKEN = PROD_TOKEN;
    env.VERCEL_ENV = 'preview';
    const s = getPaymentIntegrationStatus();
    assert.equal(s.environment, 'production');
    assert.equal(s.deployEnvironment, 'preview');
    assert.ok(s.warnings.some((w) => w.level === 'critical' && /PRODUÇÃO fora do ambiente de produção/.test(w.message)));
  });

  test('declarado x credencial divergentes geram alerta crítico', async () => {
    const { getPaymentIntegrationStatus } = await import('../lib/payments/diagnostics');
    env.MP_ACCESS_TOKEN = TEST_TOKEN;
    env.MP_ENVIRONMENT = 'production';
    const s = getPaymentIntegrationStatus();
    assert.equal(s.environmentSource, 'declared');
    assert.ok(s.warnings.some((w) => w.level === 'critical' && /declara/.test(w.message)));
  });

  test('produção com credencial de TESTE e reservas ligadas avisa', async () => {
    const { getPaymentIntegrationStatus } = await import('../lib/payments/diagnostics');
    env.MP_ACCESS_TOKEN = TEST_TOKEN;
    env.VERCEL_ENV = 'production';
    env.NEXT_PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
    assert.ok(getPaymentIntegrationStatus().warnings.some((w) => /credencial de TESTE/.test(w.message)));
  });

  test('webhook: URL esperada, assinatura e override em produção', async () => {
    const { getPaymentIntegrationStatus } = await import('../lib/payments/diagnostics');
    env.MP_ACCESS_TOKEN = TEST_TOKEN;
    let s = getPaymentIntegrationStatus();
    assert.equal(s.webhook.expectedUrl, 'https://www.anaueamazonia.com.br/api/webhooks/mercadopago');
    assert.equal(s.webhook.secretConfigured, false);
    assert.ok(s.warnings.some((w) => /Assinatura secreta do webhook/.test(w.message)));
    env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;
    env.MP_NOTIFICATION_URL = 'https://outra.example.com/webhook';
    env.VERCEL_ENV = 'production';
    s = getPaymentIntegrationStatus();
    assert.equal(s.webhook.secretConfigured, true);
    assert.ok(s.warnings.some((w) => /MP_NOTIFICATION_URL definida em produção/.test(w.message)));
  });

  test('o diagnóstico nunca contém o token nem o segredo', async () => {
    const { getPaymentIntegrationStatus } = await import('../lib/payments/diagnostics');
    for (const token of [TEST_TOKEN, PROD_TOKEN]) {
      env.MP_ACCESS_TOKEN = token;
      env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;
      assertNoSecrets(getPaymentIntegrationStatus(), 'diagnóstico');
    }
  });

  test('reservas online desligadas aparecem como informação', async () => {
    const { getPaymentIntegrationStatus } = await import('../lib/payments/diagnostics');
    env.NEXT_PUBLIC_ONLINE_BOOKING_ENABLED = 'false';
    const s = getPaymentIntegrationStatus();
    assert.equal(s.onlineBookingEnabled, false);
    assert.ok(s.warnings.some((w) => /pré-lançamento/.test(w.message)));
  });
});

// ─────────────────────────────────────────────────────────────
describe('Teste de conexão (somente leitura)', () => {
  const realFetch = globalThis.fetch;
  let reply: () => Response | Promise<Response> = () => new Response('{}');
  const calls: { url: string; auth: string | null; method: string }[] = [];
  before(() => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith('https://api.mercadopago.com/')) throw new Error(`rede bloqueada: ${url}`);
      const headers = new Headers(init?.headers);
      calls.push({ url, auth: headers.get('authorization'), method: init?.method ?? 'GET' });
      return reply();
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
  });

  test('sem credencial: não chama a rede', async () => {
    const { testMercadoPagoConnection } = await import('../lib/payments/diagnostics');
    const before = calls.length;
    const r = await testMercadoPagoConnection();
    assert.equal(r.ok, false);
    assert.equal(r.errorKind, 'not_configured');
    assert.equal(calls.length, before);
  });

  test('conta brasileira válida → conectado (GET /users/me, apelido mascarado)', async () => {
    const { testMercadoPagoConnection } = await import('../lib/payments/diagnostics');
    env.MP_ACCESS_TOKEN = TEST_TOKEN;
    reply = () => new Response(JSON.stringify({ id: 99887766, nickname: 'TESTEANAUE123', site_id: 'MLB', tags: ['test_user'] }));
    const r = await testMercadoPagoConnection();
    assert.equal(r.ok, true, r.message);
    assert.equal(r.account!.siteId, 'MLB');
    assert.equal(r.account!.isTestUser, true);
    assert.ok(!r.account!.nickname.includes('ANAUE123'), 'apelido mascarado');
    const last = calls.at(-1)!;
    assert.equal(last.url, 'https://api.mercadopago.com/users/me');
    assert.equal(last.method, 'GET', 'somente leitura');
    assert.equal(last.auth, `Bearer ${TEST_TOKEN}`, 'token só vai no cabeçalho para o Mercado Pago');
    assertNoSecrets(r, 'resultado do teste');
  });

  test('credencial recusada, falha de rede e conta de outro país', async () => {
    const { testMercadoPagoConnection } = await import('../lib/payments/diagnostics');
    env.MP_ACCESS_TOKEN = PROD_TOKEN;
    reply = () => new Response('{"message":"invalid token"}', { status: 401 });
    assert.equal((await testMercadoPagoConnection()).errorKind, 'unauthorized');
    reply = () => {
      throw new TypeError('fetch failed');
    };
    assert.equal((await testMercadoPagoConnection()).errorKind, 'network');
    reply = () => new Response(JSON.stringify({ id: 1, nickname: 'x', site_id: 'MLA' }));
    const r = await testMercadoPagoConnection();
    assert.equal(r.errorKind, 'wrong_country');
    assertNoSecrets(r, 'erro');
  });
});

// ─────────────────────────────────────────────────────────────
describe('Ações do painel: permissão, sigilo e histórico', () => {
  const realFetch = globalThis.fetch;
  before(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/users/me')) return new Response(JSON.stringify({ id: 1, nickname: 'ANAUETESTE', site_id: 'MLB' }));
      if (url.includes('/v1/payments/')) {
        return new Response(JSON.stringify({ id: 4242, status: 'approved', transaction_amount: 1, currency_id: 'BRL', external_reference: 'res-001' }));
      }
      throw new Error(`rede bloqueada: ${url}`);
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
  });

  test('anônimo é recusado (status e teste de conexão)', async () => {
    const { getPaymentSettingsAction, testPaymentConnectionAction } = await import('../app/actions/paymentSettings');
    assert.equal((await getPaymentSettingsAction()).success, false);
    assert.equal((await testPaymentConnectionAction()).success, false);
  });

  test('equipe vê status sem credenciais; teste de conexão entra no histórico', quiet(async () => {
    authz.__setStaffResolverForTests(async () => ({ id: 'staff', email: null }));
    env.MP_ACCESS_TOKEN = TEST_TOKEN;
    env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const { getPaymentSettingsAction, testPaymentConnectionAction } = await import('../app/actions/paymentSettings');
    const t = await testPaymentConnectionAction();
    assert.equal(t.success, true);
    assertNoSecrets(t, 'testPaymentConnectionAction');
    const s = await getPaymentSettingsAction();
    assert.equal(s.success, true);
    assertNoSecrets(s, 'getPaymentSettingsAction');
    if (s.success) {
      assert.equal(s.status.environment, 'test');
      assert.equal(s.events.available, true);
      assert.ok(s.events.events.some((e) => e.type === 'connection_test' && e.outcome === 'ok'));
    }
  }));

  test('webhook recebido entra no histórico com o resultado (sem dados pessoais)', quiet(async () => {
    authz.__setStaffResolverForTests(async () => ({ id: 'staff', email: null }));
    env.MP_ACCESS_TOKEN = TEST_TOKEN;
    const { POST } = await import('../app/api/webhooks/mercadopago/route');
    await POST(new Request('http://localhost/api/webhooks/mercadopago?topic=payment&id=4242', { method: 'POST' }) as never);
    const { getPaymentSettingsAction } = await import('../app/actions/paymentSettings');
    const s = await getPaymentSettingsAction();
    assert.equal(s.success, true);
    if (s.success) {
      const ev = s.events.events.find((e) => e.type === 'webhook' && e.paymentId === '4242');
      assert.ok(ev, 'evento de webhook registrado');
      assert.equal(ev!.bookingId, 'res-001');
      assert.equal(ev!.outcome, 'amount_mismatch', 'valor pago (R$ 1) diverge do total da reserva');
      assert.ok(!JSON.stringify(ev).includes('@'), 'sem e-mail');
    }
  }));

  test('webhook com assinatura inválida é registrado como recusado', quiet(async () => {
    authz.__setStaffResolverForTests(async () => ({ id: 'staff', email: null }));
    env.MP_ACCESS_TOKEN = TEST_TOKEN;
    env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const { POST } = await import('../app/api/webhooks/mercadopago/route');
    const res = await POST(new Request('http://localhost/api/webhooks/mercadopago?topic=payment&id=5151', { method: 'POST' }) as never);
    assert.equal(res.status, 401);
    const { getPaymentSettingsAction } = await import('../app/actions/paymentSettings');
    const s = await getPaymentSettingsAction();
    if (s.success) assert.ok(s.events.events.some((e) => e.type === 'webhook_rejected' && e.paymentId === '5151'));
  }));

  test('a tela (código do navegador) não lê variáveis de ambiente nem credenciais', () => {
    const src = readFileSync(resolve(__dirname, '../app/admin/configuracoes/pagamentos/page.tsx'), 'utf8');
    assert.ok(!src.includes('process.env'), 'página client não deve ler process.env');
    assert.ok(!/MP_ACCESS_TOKEN\s*[}=]/.test(src));
    assert.match(src, /getPaymentSettingsAction/);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Migration payment_events (PGlite)', () => {
  test('somente equipe lê; anônimo não lê nem grava; servidor grava', async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    const { btree_gist } = await import('@electric-sql/pglite/contrib/btree_gist');
    const { uuid_ossp } = await import('@electric-sql/pglite/contrib/uuid_ossp');
    const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');
    const db = new PGlite({ extensions: { btree_gist, uuid_ossp } });
    await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`);
    await db.exec(read('supabase/schema.sql'));
    await db.exec(read('supabase/migrations/20261105000000_booking_integrity.sql'));
    await db.exec(read('supabase/migrations/20261105000100_rls_hardening.sql'));
    await db.exec(read('supabase/migrations/20261106000000_payment_events.sql'));
    await db.exec(read('supabase/migrations/20261106000000_payment_events.sql')); // idempotente
    const STAFF = '11111111-1111-1111-1111-111111111111';
    await db.exec(`INSERT INTO staff_members (user_id, email) VALUES ('${STAFF}', 'e@anaue.test');
      GRANT ALL ON payment_events TO service_role;`);

    await db.exec(`SET ROLE service_role;`);
    await db.query(`INSERT INTO payment_events (event_type, environment, payment_id, booking_id, outcome, amount) VALUES ('webhook','test','1','res-x','confirmed',10)`);
    await db.exec(`RESET ROLE;`);

    await db.exec(`SET ROLE anon;`);
    await assert.rejects(db.query(`SELECT * FROM payment_events`), (e: { code?: string }) => e.code === '42501');
    await assert.rejects(db.query(`INSERT INTO payment_events (event_type) VALUES ('webhook')`), (e: { code?: string }) => e.code === '42501');
    await db.exec(`RESET ROLE;`);

    await db.exec(`SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222'; SET ROLE authenticated;`);
    assert.equal((await db.query(`SELECT * FROM payment_events`)).rows.length, 0, 'autenticado fora da equipe não vê');
    await assert.rejects(db.query(`INSERT INTO payment_events (event_type) VALUES ('webhook')`));
    await db.exec(`RESET ROLE; SET request.jwt.claim.sub = '${STAFF}'; SET ROLE authenticated;`);
    assert.equal((await db.query(`SELECT * FROM payment_events`)).rows.length, 1, 'equipe vê');
    await db.exec(`RESET ROLE;`);

    await assert.rejects(db.query(`INSERT INTO payment_events (event_type) VALUES ('invalido')`), /check/i);
  });
});

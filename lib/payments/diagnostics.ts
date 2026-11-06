// ============================================================
// lib/payments/diagnostics.ts
// Diagnóstico da integração de pagamentos para o painel administrativo.
//
// SEGURANÇA: nada aqui devolve o Access Token, o segredo do webhook nem
// qualquer pedaço deles. Só presença/ausência, tipo da credencial
// (teste x produção) e avisos. Credenciais ficam em variáveis protegidas
// do servidor (Vercel) — não no banco, não no navegador.
// ============================================================

import { isOnlineBookingEnabled } from '@/lib/launchMode';

export type MpEnvironment = 'test' | 'production' | 'unknown';
export type DeployEnvironment = 'production' | 'preview' | 'development' | 'local';

export interface PaymentIntegrationStatus {
  provider: 'mercadopago';
  providerLabel: string;
  configured: boolean;
  /** Ambiente efetivo das credenciais. */
  environment: MpEnvironment;
  /** De onde veio o ambiente: declarado em MP_ENVIRONMENT ou inferido pelo prefixo do token. */
  environmentSource: 'declared' | 'inferred' | 'none';
  deployEnvironment: DeployEnvironment;
  onlineBookingEnabled: boolean;
  webhook: {
    secretConfigured: boolean;
    /** URL que deve ser cadastrada no painel do Mercado Pago. */
    expectedUrl: string;
    /** Há MP_NOTIFICATION_URL sobrescrevendo a URL por pagamento (uso em testes). */
    perPaymentOverride: boolean;
  };
  emailConfigured: boolean;
  warnings: { level: 'info' | 'warning' | 'critical'; message: string }[];
}

type Env = Record<string, string | undefined>;

/** TEST-… = credencial de teste; APP_USR-… = produção (ou conta de teste do MP). */
export function inferMpEnvironment(token: string | undefined): MpEnvironment {
  const t = (token || '').trim();
  if (!t) return 'unknown';
  if (t.startsWith('TEST-')) return 'test';
  if (t.startsWith('APP_USR-')) return 'production';
  return 'unknown';
}

function declaredEnvironment(env: Env): MpEnvironment | null {
  const v = (env.MP_ENVIRONMENT || '').trim().toLowerCase();
  if (v === 'test' || v === 'teste' || v === 'sandbox') return 'test';
  if (v === 'production' || v === 'producao' || v === 'produção') return 'production';
  return null;
}

function deployEnvironment(env: Env): DeployEnvironment {
  const v = env.VERCEL_ENV;
  if (v === 'production' || v === 'preview' || v === 'development') return v;
  return 'local';
}

function appUrl(env: Env): string {
  const raw = (env.NEXT_PUBLIC_APP_URL || env.APP_URL || '').trim().replace(/\/+$/, '');
  if (raw.startsWith('https://')) return raw;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return 'https://www.anaueamazonia.com.br';
}

export function getPaymentIntegrationStatus(env: Env = process.env): PaymentIntegrationStatus {
  const token = env.MP_ACCESS_TOKEN;
  const configured = Boolean(token && token.trim());
  const inferred = inferMpEnvironment(token);
  const declared = declaredEnvironment(env);
  const environment: MpEnvironment = declared ?? inferred;
  const deploy = deployEnvironment(env);
  const bookingsOn = isOnlineBookingEnabled();
  const warnings: PaymentIntegrationStatus['warnings'] = [];

  if (!configured) {
    warnings.push({ level: 'info', message: 'Mercado Pago ainda não configurado neste ambiente. Nenhuma cobrança PIX será gerada.' });
  } else {
    if (declared && inferred !== 'unknown' && declared !== inferred) {
      warnings.push({
        level: 'critical',
        message: `MP_ENVIRONMENT declara "${declared === 'test' ? 'teste' : 'produção'}", mas a credencial parece de ${inferred === 'test' ? 'teste' : 'produção'}. Corrija antes de usar.`,
      });
    }
    if (inferred === 'unknown') {
      warnings.push({ level: 'warning', message: 'Formato de Access Token não reconhecido (esperado TEST-… ou APP_USR-…).' });
    }
    if (deploy !== 'production' && environment === 'production') {
      warnings.push({
        level: 'critical',
        message: 'Credencial de PRODUÇÃO fora do ambiente de produção: cobranças feitas aqui serão reais. Use credenciais de teste no staging.',
      });
    }
    if (deploy === 'production' && environment === 'test' && bookingsOn) {
      warnings.push({ level: 'warning', message: 'Produção com credencial de TESTE e reservas online ligadas: hóspedes não conseguirão pagar de verdade.' });
    }
    if (!env.MP_WEBHOOK_SECRET) {
      warnings.push({ level: 'warning', message: 'Assinatura secreta do webhook não configurada: notificações do Mercado Pago não são autenticadas.' });
    }
  }

  if (!bookingsOn) {
    warnings.push({ level: 'info', message: 'Reservas online desligadas (pré-lançamento): o site público não cria reservas nem cobranças.' });
  }
  if (env.MP_NOTIFICATION_URL && deploy === 'production') {
    warnings.push({ level: 'warning', message: 'MP_NOTIFICATION_URL definida em produção: webhooks dos pagamentos estão sendo enviados para outra URL.' });
  }

  return {
    provider: 'mercadopago',
    providerLabel: 'Mercado Pago',
    configured,
    environment,
    environmentSource: declared ? 'declared' : configured ? 'inferred' : 'none',
    deployEnvironment: deploy,
    onlineBookingEnabled: bookingsOn,
    webhook: {
      secretConfigured: Boolean(env.MP_WEBHOOK_SECRET),
      expectedUrl: `${appUrl(env)}/api/webhooks/mercadopago`,
      perPaymentOverride: Boolean(env.MP_NOTIFICATION_URL),
    },
    emailConfigured: Boolean(env.RESEND_API_KEY || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)),
    warnings,
  };
}

// ─── Teste de conexão (somente leitura) ───────────────────────

export interface ConnectionTestResult {
  ok: boolean;
  checkedAt: string;
  /** Dados públicos da conta — nunca a credencial. */
  account?: { id: string; nickname: string; siteId: string; isTestUser: boolean };
  errorKind?: 'not_configured' | 'unauthorized' | 'network' | 'unexpected' | 'wrong_country';
  message: string;
}

function maskNickname(nickname: string): string {
  if (nickname.length <= 4) return nickname;
  return `${nickname.slice(0, 3)}${'•'.repeat(Math.min(6, nickname.length - 3))}`;
}

/**
 * Consulta GET /users/me no Mercado Pago com o token do servidor.
 * Operação somente leitura: não cria cobrança nem altera a conta.
 */
export async function testMercadoPagoConnection(env: Env = process.env): Promise<ConnectionTestResult> {
  const checkedAt = new Date().toISOString();
  const token = (env.MP_ACCESS_TOKEN || '').trim();
  if (!token) {
    return { ok: false, checkedAt, errorKind: 'not_configured', message: 'Access Token não configurado neste ambiente.' };
  }

  let res: Response;
  try {
    res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, checkedAt, errorKind: 'network', message: 'Não foi possível alcançar o Mercado Pago agora. Tente novamente em instantes.' };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, checkedAt, errorKind: 'unauthorized', message: 'O Mercado Pago recusou a credencial (inválida, revogada ou de outra aplicação).' };
  }
  if (!res.ok) {
    return { ok: false, checkedAt, errorKind: 'unexpected', message: `Resposta inesperada do Mercado Pago (HTTP ${res.status}).` };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: number | string; nickname?: string; site_id?: string; tags?: string[] };
  const account = {
    id: String(data.id ?? ''),
    nickname: maskNickname(String(data.nickname ?? '')),
    siteId: String(data.site_id ?? ''),
    isTestUser: Array.isArray(data.tags) && data.tags.includes('test_user'),
  };
  if (account.siteId && account.siteId !== 'MLB') {
    return { ok: false, checkedAt, account, errorKind: 'wrong_country', message: `Conta do Mercado Pago de outro país (${account.siteId}). O Anauê precisa de conta brasileira (MLB) para PIX.` };
  }
  return { ok: true, checkedAt, account, message: 'Conexão com o Mercado Pago funcionando.' };
}

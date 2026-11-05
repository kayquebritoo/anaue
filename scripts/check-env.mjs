// ============================================================
// scripts/check-env.mjs
// Verificação de variáveis antes do `next build`.
// Mostra APENAS nomes e status (nunca valores) e falha com mensagem clara
// quando falta algo obrigatório — em vez de um erro genérico no meio do build.
// Carrega .env* do mesmo jeito que o Next (via @next/env).
// ============================================================

import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

const vercelEnv = process.env.VERCEL_ENV || '(local)';
const allowMock = process.env.ANAUE_ALLOW_MOCK_DATA === 'true';
const isProdLike = process.env.VERCEL_ENV === 'production';

const status = (name) => {
  const v = (process.env[name] || '').trim();
  if (!v) return 'AUSENTE';
  if (v.includes('your-project') || v.includes('placeholder')) return 'PLACEHOLDER';
  return 'ok';
};

const serviceKeyStatus = () => {
  const v = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!v) return 'AUSENTE';
  if (/[^\x21-\x7E]/.test(v)) return 'INVÁLIDA (caracteres mascarados)';
  if (v.startsWith('sb_secret_')) return v.length >= 40 ? 'ok' : 'INCOMPLETA (truncada)';
  if (v.startsWith('eyJ')) return v.split('.').length === 3 && v.length >= 100 ? 'ok' : 'INCOMPLETA';
  return 'FORMATO DESCONHECIDO';
};

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const flag = (process.env.NEXT_PUBLIC_ONLINE_BOOKING_ENABLED || '').trim();
const rows = [
  ...required.map((n) => [n, status(n), 'obrigatória']),
  ['SUPABASE_SERVICE_ROLE_KEY', serviceKeyStatus(), 'obrigatória antes da migration de RLS'],
  ['MP_ACCESS_TOKEN', status('MP_ACCESS_TOKEN'), 'necessária para PIX'],
  ['MP_WEBHOOK_SECRET', status('MP_WEBHOOK_SECRET'), 'recomendada (autentica o webhook)'],
  ['RESEND_API_KEY', status('RESEND_API_KEY'), 'necessária para e-mails'],
  ['NEXT_PUBLIC_ONLINE_BOOKING_ENABLED', flag === 'true' ? 'ok' : (flag || '(ausente)'), flag === 'true' ? 'reservas online LIGADAS' : 'reservas online DESLIGADAS (pré-lançamento)'],
];

console.log(`\n[check-env] Ambiente Vercel: ${vercelEnv}`);
for (const [name, st, note] of rows) console.log(`[check-env]   ${st === 'ok' ? '✓' : '✗'} ${name.padEnd(30)} ${st.padEnd(28)} ${note}`);

// Preview/Development NUNCA podem apontar para o banco de produção
const PRODUCTION_REFS = ['yjtbwxjxhfkxrmdurgdu', ...(process.env.ANAUE_PRODUCTION_SUPABASE_REF || '').split(',').filter(Boolean)];
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' && PRODUCTION_REFS.some((r) => supaUrl.includes(r))) {
  console.error(
    `\n[check-env] ERRO: o ambiente "${vercelEnv}" está apontando para o Supabase de PRODUÇÃO.\n` +
      '[check-env] Troque as variáveis deste ambiente pelas do projeto de STAGING (Vercel → Settings → Environment Variables).\n'
  );
  process.exit(1);
}

const missing = required.filter((n) => status(n) !== 'ok');
if (missing.length && !allowMock) {
  console.error(
    `\n[check-env] ERRO: faltam variáveis obrigatórias no ambiente "${vercelEnv}": ${missing.join(', ')}.\n` +
      `[check-env] Vercel → Project → Settings → Environment Variables → adicione-as marcando "${vercelEnv === '(local)' ? 'Development' : vercelEnv}".\n` +
      `[check-env] Preview deve apontar para o Supabase de STAGING, nunca para produção.\n` +
      `[check-env] (Build de demonstração sem banco: ANAUE_ALLOW_MOCK_DATA=true — proibido em produção.)\n`
  );
  process.exit(1);
}
if (isProdLike && serviceKeyStatus() !== 'ok') {
  console.warn('[check-env] AVISO: chave secreta do Supabase ausente/incompleta em produção — o servidor usará a chave pública (não aplicar a migration de RLS ainda).');
}
console.log('[check-env] ok\n');

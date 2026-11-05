'use client';

// ============================================================
// app/admin/configuracoes/pagamentos/page.tsx
// Configurações → Pagamentos (Mercado Pago)
// Status, ambiente, teste de conexão, webhook, instruções e histórico.
// Credenciais NUNCA chegam ao navegador: ficam em variáveis protegidas
// da Vercel e esta tela só recebe presença/ausência e diagnósticos.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Webhook,
  XCircle,
  History,
  Mail,
  CalendarClock,
} from 'lucide-react';
import {
  getPaymentSettingsAction,
  testPaymentConnectionAction,
  type PaymentSettingsResult,
} from '@/app/actions/paymentSettings';
import type { ConnectionTestResult } from '@/lib/payments/diagnostics';

type Loaded = Extract<PaymentSettingsResult, { success: true }>;

const EVENT_LABEL: Record<string, string> = {
  webhook: 'Notificação recebida',
  webhook_rejected: 'Notificação recusada',
  pix_created: 'PIX gerado',
  manual_confirmation: 'Confirmação manual',
  connection_test: 'Teste de conexão',
};

const OUTCOME_LABEL: Record<string, string> = {
  confirmed: 'Reserva confirmada',
  already_confirmed: 'Já estava confirmada',
  amount_mismatch: 'Valor divergente — verificar',
  payment_reversed: 'Estorno/chargeback — verificar',
  payment_failed_cancelled: 'PIX expirado/recusado — reserva cancelada',
  payment_failed: 'Pagamento não concluído',
  not_approved: 'Aguardando pagamento',
  invalid_signature: 'Assinatura inválida',
  booking_not_found: 'Reserva não encontrada',
  invalid_reference: 'Referência inválida',
  currency_mismatch: 'Moeda inválida',
  not_pending: 'Reserva não estava pendente',
  ok: 'OK',
};

const ATTENTION = new Set(['amount_mismatch', 'payment_reversed', 'invalid_signature', 'currency_mismatch', 'unauthorized']);

function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'error' | 'neutral' | 'info'; children: React.ReactNode }) {
  const map = {
    ok: 'bg-forest-500/20 text-forest-200 border-forest-400/30',
    warn: 'bg-gold-500/15 text-gold-200 border-gold-400/30',
    error: 'bg-red-500/15 text-red-200 border-red-400/30',
    neutral: 'bg-white/5 text-white/70 border-white/15',
    info: 'bg-agua-500/15 text-agua-200 border-agua-400/30',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${map[tone]}`}>{children}</span>
  );
}

function Card({ icon: Icon, title, children, aside }: { icon: typeof Info; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="glass-dark rounded-3xl p-5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-sm font-bold text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-forest-300" aria-hidden />
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmtBRL = (v: number | null) =>
  v === null || v === undefined ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function PaymentSettingsPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<ConnectionTestResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  // Carrega os dados (setState só nos callbacks da promise)
  useEffect(() => {
    let active = true;
    getPaymentSettingsAction()
      .then((res) => {
        if (!active) return;
        if (res.success) {
          setData(res);
          setError(null);
        } else {
          setError(res.error);
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar as configurações de pagamento.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const load = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const runTest = async () => {
    setTesting(true);
    try {
      const res = await testPaymentConnectionAction();
      setTest(res.success ? res.result : { ok: false, checkedAt: new Date().toISOString(), message: res.error });
      load(); // atualiza histórico
    } finally {
      setTesting(false);
    }
  };

  const copyWebhook = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.status.webhook.expectedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  };

  const s = data?.status;
  const integrationTone: 'ok' | 'warn' | 'error' | 'neutral' = !s?.configured
    ? 'neutral'
    : test
      ? test.ok
        ? 'ok'
        : 'error'
      : 'warn';
  const integrationLabel = !s?.configured ? 'Não configurado' : test ? (test.ok ? 'Conectado' : 'Erro') : 'Configurado — teste a conexão';

  return (
    <div className="min-h-screen gradient-admin pb-32 md:pb-8">
      <header className="sticky top-0 z-30 glass-dark border-b border-white/8 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
          <h1 className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-forest-300" aria-hidden />
            Configurações · Pagamentos
          </h1>
          <button
            onClick={load}
            title="Atualizar"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {loading && !data && (
          <div className="flex items-center justify-center py-20 text-white/60 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> Carregando…
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {s && (
          <>
            {/* ── Mercado Pago ── */}
            <Card icon={PlugZap} title="Mercado Pago" aside={<Badge tone={integrationTone}>{integrationLabel}</Badge>}>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-black/20 border border-white/5 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-white/40">Provedor</dt>
                  <dd className="text-white font-medium mt-1">{s.providerLabel}</dd>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/5 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-white/40">Ambiente das credenciais</dt>
                  <dd className="mt-1">
                    {s.environment === 'test' && <Badge tone="info">Testes</Badge>}
                    {s.environment === 'production' && <Badge tone="warn">Produção (cobranças reais)</Badge>}
                    {s.environment === 'unknown' && <Badge tone="neutral">{s.configured ? 'Não identificado' : '—'}</Badge>}
                    {s.environmentSource === 'inferred' && <span className="block text-[11px] text-white/40 mt-1">identificado pelo tipo da credencial</span>}
                  </dd>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/5 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-white/40">Este site</dt>
                  <dd className="text-white font-medium mt-1">
                    {{ production: 'Produção', preview: 'Staging (Preview)', development: 'Desenvolvimento', local: 'Local' }[s.deployEnvironment]}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={runTest}
                  disabled={testing || !s.configured}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-500 hover:bg-forest-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <ShieldCheck className="w-4 h-4" aria-hidden />}
                  Testar conexão
                </button>
                <p className="text-xs text-white/45">Consulta somente leitura da conta no Mercado Pago. Não gera cobrança.</p>
              </div>

              {test && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${test.ok ? 'border-forest-400/30 bg-forest-500/10 text-forest-100' : 'border-red-400/30 bg-red-500/10 text-red-100'}`}>
                  <div className="flex items-center gap-2 font-medium">
                    {test.ok ? <CheckCircle2 className="w-4 h-4" aria-hidden /> : <XCircle className="w-4 h-4" aria-hidden />}
                    {test.message}
                  </div>
                  {test.account && (
                    <p className="text-xs mt-1 opacity-80">
                      Conta {test.account.nickname || test.account.id} · {test.account.siteId}
                      {test.account.isTestUser ? ' · usuário de teste' : ''} · verificado {fmtDate(test.checkedAt)}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* ── Avisos ── */}
            {s.warnings.length > 0 && (
              <Card icon={AlertTriangle} title="Avisos">
                <ul className="space-y-2">
                  {s.warnings.map((w, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 text-sm rounded-2xl px-3 py-2 border ${
                        w.level === 'critical'
                          ? 'border-red-400/30 bg-red-500/10 text-red-100'
                          : w.level === 'warning'
                            ? 'border-gold-400/30 bg-gold-500/10 text-gold-100'
                            : 'border-white/10 bg-white/5 text-white/70'
                      }`}
                    >
                      {w.level === 'info' ? <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />}
                      {w.message}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Webhook ── */}
              <Card
                icon={Webhook}
                title="Notificações (webhook)"
                aside={s.webhook.secretConfigured ? <Badge tone="ok">Assinatura configurada</Badge> : <Badge tone="warn">Sem assinatura</Badge>}
              >
                <p className="text-xs text-white/55">Cadastre esta URL no Mercado Pago (evento “Pagamentos”). É por ela que o pagamento confirma a reserva.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white/80">
                    {s.webhook.expectedUrl}
                  </code>
                  <button
                    onClick={copyWebhook}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-white/10 text-white/80 hover:text-white text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden />
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                {s.webhook.perPaymentOverride && (
                  <p className="text-xs text-gold-200/80">Há uma URL de notificação de teste ativa (MP_NOTIFICATION_URL).</p>
                )}
              </Card>

              {/* ── Reservas e e-mail ── */}
              <Card icon={CalendarClock} title="Reservas online e e-mails">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Reservas e PIX pelo site</span>
                  {s.onlineBookingEnabled ? <Badge tone="ok">Ligadas</Badge> : <Badge tone="neutral">Desligadas (pré-lançamento)</Badge>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" aria-hidden /> E-mails de confirmação</span>
                  {s.emailConfigured ? <Badge tone="ok">Configurado</Badge> : <Badge tone="warn">Não configurado</Badge>}
                </div>
                <p className="text-xs text-white/45">
                  Ligar as reservas online é uma decisão de lançamento: feita na Vercel (variável NEXT_PUBLIC_ONLINE_BOOKING_ENABLED) e publicada com novo deploy.
                </p>
              </Card>
            </div>

            {/* ── Como configurar ── */}
            <Card icon={Info} title="Como conectar o Mercado Pago">
              <ol className="space-y-3 text-sm text-white/70 list-decimal list-inside">
                <li>
                  No <a className="text-forest-300 underline inline-flex items-center gap-1" href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer">painel de desenvolvedores do Mercado Pago <ExternalLink className="w-3 h-3" aria-hidden /></a>, abra a aplicação do Anauê.
                  Para testes use <strong>Credenciais de teste</strong> (Access Token começa com <code>TEST-</code>); para o lançamento, <strong>Credenciais de produção</strong>.
                </li>
                <li>
                  Na <a className="text-forest-300 underline inline-flex items-center gap-1" href="https://vercel.com/kayquebritoos-projects/pms/settings/environment-variables" target="_blank" rel="noopener noreferrer">Vercel → Environment Variables <ExternalLink className="w-3 h-3" aria-hidden /></a>, salve como <em>Sensitive</em>:
                  <code className="mx-1">MP_ACCESS_TOKEN</code> e <code className="mx-1">MP_ENVIRONMENT</code> (<code>test</code> ou <code>production</code>).
                  Credencial de teste só em <strong>Preview</strong>; de produção só em <strong>Production</strong>.
                </li>
                <li>
                  No Mercado Pago, em <strong>Webhooks</strong>, cadastre a URL acima com o evento “Pagamentos” e copie a <strong>assinatura secreta</strong> para a variável <code>MP_WEBHOOK_SECRET</code> na Vercel.
                </li>
                <li>Faça <strong>Redeploy</strong> na Vercel e volte aqui: clique em <strong>Testar conexão</strong>.</li>
              </ol>
              <p className="text-xs text-white/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                Por segurança, credenciais não são digitadas nem exibidas neste painel.
              </p>
            </Card>

            {/* ── Histórico ── */}
            <Card icon={History} title="Histórico de eventos de pagamento">
              {!data.events.available ? (
                <p className="text-sm text-white/50">{data.events.reason}</p>
              ) : data.events.events.length === 0 ? (
                <p className="text-sm text-white/50">Nenhum evento registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-white/40 uppercase tracking-wider">
                        <th className="px-2 py-2 font-medium">Quando</th>
                        <th className="px-2 py-2 font-medium">Evento</th>
                        <th className="px-2 py-2 font-medium">Resultado</th>
                        <th className="px-2 py-2 font-medium">Reserva</th>
                        <th className="px-2 py-2 font-medium text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.events.events.map((e) => (
                        <tr key={e.id} className={ATTENTION.has(e.outcome ?? '') ? 'bg-red-500/5' : ''}>
                          <td className="px-2 py-2 text-white/60 whitespace-nowrap">{fmtDate(e.createdAt)}</td>
                          <td className="px-2 py-2 text-white/80 whitespace-nowrap">
                            {EVENT_LABEL[e.type] ?? e.type}
                            {e.environment === 'test' && <span className="ml-1 text-agua-300/80">(teste)</span>}
                          </td>
                          <td className={`px-2 py-2 ${ATTENTION.has(e.outcome ?? '') ? 'text-red-200 font-semibold' : 'text-white/70'}`}>
                            {(e.outcome && OUTCOME_LABEL[e.outcome]) || e.outcome || '—'}
                          </td>
                          <td className="px-2 py-2 text-white/60 font-mono">{e.bookingId || '—'}</td>
                          <td className="px-2 py-2 text-white/70 text-right whitespace-nowrap">{fmtBRL(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

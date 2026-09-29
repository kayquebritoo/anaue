'use client';

// ============================================================
// components/admin/LoginForm.tsx
// Formulário de Autenticação do Painel (Login & Recuperação)
// - Suporte a visualização de senha ("olho") com Eye / EyeOff
// - Fluxo de "Esqueci minha senha" com envio de link Supabase
// - Estados de loading/erro via useActionState (React 19)
// ============================================================

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  loginAction,
  requestPasswordResetAction,
  type AuthActionResult,
} from '@/app/actions/auth';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = '/admin' }: LoginFormProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Action do Login
  const [loginState, loginFormAction, loginPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(loginAction, null);

  // Action de Recuperação de Senha
  const [resetState, resetFormAction, resetPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(requestPasswordResetAction, null);

  // Em caso de login com sucesso, navega para o painel
  useEffect(() => {
    if (loginState?.success) {
      const safeTarget = redirectTo.startsWith('/admin') ? redirectTo : '/admin';
      router.replace(safeTarget);
      router.refresh();
    }
  }, [loginState, redirectTo, router]);

  return (
    <div className="glass-dark w-full max-w-sm rounded-4xl p-8 border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {viewMode === 'login' ? (
          /* ── MODO 1: LOGIN ── */
          <motion.form
            key="login-form"
            action={loginFormAction}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-5"
          >
            {/* Cabeçalho */}
            <div className="flex flex-col items-center text-center gap-3 pb-2">
              <div className="w-14 h-14 rounded-3xl glass-gold flex items-center justify-center shadow-lg shadow-gold-400/10">
                <ShieldCheck className="w-7 h-7 text-gold-400" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
                  Área Restrita
                </h1>
                <p className="text-white/40 text-xs mt-1">
                  Anauê PMS — Acesso exclusivo da equipe
                </p>
              </div>
            </div>

            {/* Mensagem de erro amigável */}
            {loginState && !loginState.success && loginState.error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/25 px-4 py-3"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs leading-relaxed">{loginState.error}</p>
              </motion.div>
            )}

            {/* E-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-white/50 text-[11px] uppercase tracking-widest font-semibold"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@anaue.com.br"
                  className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-forest-500/50 focus:bg-white/10 transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-white/50 text-[11px] uppercase tracking-widest font-semibold"
                >
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setViewMode('forgot')}
                  className="text-gold-400/80 hover:text-gold-300 text-xs font-medium transition-colors hover:underline cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-11 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={loginPending}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-forest-950/50 transition-all cursor-pointer"
            >
              {loginPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>
        ) : (
          /* ── MODO 2: ESQUECI MINHA SENHA ── */
          <motion.form
            key="forgot-form"
            action={resetFormAction}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-5"
          >
            {/* Cabeçalho */}
            <div className="flex flex-col items-center text-center gap-3 pb-2">
              <div className="w-14 h-14 rounded-3xl glass-gold flex items-center justify-center shadow-lg shadow-gold-400/10">
                <KeyRound className="w-7 h-7 text-gold-400" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
                  Recuperar Senha
                </h1>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">
                  Informe o e-mail cadastrado para receber o link de redefinição de acesso.
                </p>
              </div>
            </div>

            {/* Feedback de Erro */}
            {resetState && !resetState.success && resetState.error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/25 px-4 py-3"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs leading-relaxed">{resetState.error}</p>
              </motion.div>
            )}

            {/* Feedback de Sucesso */}
            {resetState?.success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-2.5 rounded-2xl bg-forest-500/15 border border-forest-500/30 px-4 py-3"
              >
                <CheckCircle2 className="w-4 h-4 text-forest-400 shrink-0 mt-0.5" />
                <p className="text-forest-200 text-xs leading-relaxed">
                  {resetState.message ||
                    'Instruções enviadas! Verifique sua caixa de entrada e spam.'}
                </p>
              </motion.div>
            )}

            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="text-white/50 text-[11px] uppercase tracking-widest font-semibold"
              >
                E-mail do Administrador
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@anaue.com.br"
                  className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
                />
              </div>
            </div>

            {/* Botão Enviar Link */}
            <button
              type="submit"
              disabled={resetPending}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-stone-950 font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-gold-950/40 transition-all cursor-pointer"
            >
              {resetPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Enviando link...</span>
                </>
              ) : (
                <>
                  <span>Enviar Link de Recuperação</span>
                  <ArrowRight className="w-4 h-4 text-stone-950" />
                </>
              )}
            </button>

            {/* Botão Voltar */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para o login</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

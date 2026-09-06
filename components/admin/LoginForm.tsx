'use client';

// ============================================================
// components/admin/LoginForm.tsx
// Formulário de Login do Painel — consome loginAction (Server Action)
// Estados de loading/erro tratados via useActionState (React 19)
// ============================================================

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { loginAction, type AuthActionResult } from '@/app/actions/auth';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = '/admin' }: LoginFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  );

  // Em caso de sucesso, navega para o painel (middleware já validou cookies)
  useEffect(() => {
    if (state?.success) {
      const safeTarget = redirectTo.startsWith('/admin') ? redirectTo : '/admin';
      router.replace(safeTarget);
      router.refresh();
    }
  }, [state, redirectTo, router]);

  return (
    <motion.form
      action={formAction}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass-dark w-full max-w-sm rounded-4xl p-8 border border-white/10 shadow-2xl shadow-black/50 space-y-5"
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
      {state && !state.success && state.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/25 px-4 py-3"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs leading-relaxed">{state.error}</p>
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
        <label
          htmlFor="password"
          className="text-white/50 text-[11px] uppercase tracking-widest font-semibold"
        >
          Senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
          />
        </div>
      </div>

      {/* Botão de Entrar */}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-forest-950/50 transition-all cursor-pointer"
      >
        {pending ? (
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
  );
}

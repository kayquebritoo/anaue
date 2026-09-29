'use client';

// ============================================================
// components/admin/ResetPasswordForm.tsx
// Formulário para Definição de Nova Senha após Link de Recuperação
// - Campos com visualização de senha ("olho")
// - Validação de requisitos de senha e confirmação
// ============================================================

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Lock,
  Loader2,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { updatePasswordAction, type AuthActionResult } from '@/app/actions/auth';
import { createClientBrowser } from '@/lib/supabaseClient';
import { useMemo } from 'react';

export function ResetPasswordForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const supabase = useMemo(() => createClientBrowser(), []);

  const [state, formAction, pending] = useActionState<AuthActionResult | null, FormData>(
    updatePasswordAction,
    null
  );

  // Escuta troca de estado de auth pelo cliente caso o Supabase entregue sessão via hash
  useEffect(() => {
    // Se o Supabase redirecionou erro para cá via query (?error=...), exibe direto.
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      setLinkError(
        params.get('message') ||
          'Link de recuperação inválido ou expirado. Solicite um novo link abaixo.'
      );
      setIsVerifyingSession(false);
      return;
    }
    // Erro via hash (#error=access_denied&error_code=otp_expired) acontece quando
    // o link expirou, já foi usado ou o redirect não está na allowlist do Supabase.
    if (window.location.hash.includes('error=')) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const code = hash.get('error_code');
      setLinkError(
        code === 'otp_expired'
          ? 'Este link expirou ou já foi usado. Cada link só vale uma vez (cerca de 1h). Solicite um novo.'
          : hash.get('error_description')?.replaceAll('+', ' ') ||
              'Link de recuperação inválido ou expirado. Solicite um novo.'
      );
      setIsVerifyingSession(false);
      return;
    }

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setIsVerifyingSession(false);
        } else {
          // Aguarda evento de auth se estiver recebendo hash fragment
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
              if (session) {
                setIsVerifyingSession(false);
              }
            }
          );
          // Sem sessão após timeout = link inválido/expirado ou acesso direto.
          setTimeout(() => setIsVerifyingSession(false), 2000);
          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch {
        setIsVerifyingSession(false);
      }
    };

    checkSession();
  }, [supabase]);

  // Redireciona ao ter sucesso
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.replace('/admin');
        router.refresh();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <motion.form
      action={formAction}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass-dark w-full max-w-sm rounded-4xl p-8 border border-white/10 shadow-2xl shadow-black/50 space-y-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col items-center text-center gap-3 pb-2">
        <div className="w-14 h-14 rounded-3xl glass-gold flex items-center justify-center shadow-lg shadow-gold-400/10">
          <KeyRound className="w-7 h-7 text-gold-400" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
            Nova Senha
          </h1>
          <p className="text-white/40 text-xs mt-1">
            Crie uma nova senha segura para o seu usuário administrador
          </p>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {(linkError || (state && !state.success && state.error)) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/25 px-4 py-3"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-red-300 text-xs leading-relaxed">
              {linkError || (state && !state.success && state.error)}
            </p>
            {linkError && (
              <button
                type="button"
                onClick={() => router.replace('/admin/login')}
                className="text-gold-400 hover:text-gold-300 text-xs font-semibold underline underline-offset-2 cursor-pointer"
              >
                Solicitar um novo link
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Mensagem de Sucesso */}
      {state?.success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-2.5 rounded-2xl bg-forest-500/15 border border-forest-500/30 px-4 py-3"
        >
          <CheckCircle2 className="w-4 h-4 text-forest-400 shrink-0 mt-0.5" />
          <p className="text-forest-200 text-xs leading-relaxed">
            {state.message || 'Senha atualizada com sucesso! Redirecionando para o painel...'}
          </p>
        </motion.div>
      )}

      {/* Campo Nova Senha */}
      <div className="space-y-1.5">
        <label
          htmlFor="new-password"
          className="text-white/50 text-[11px] uppercase tracking-widest font-semibold"
        >
          Nova Senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            id="new-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Mínimo de 6 caracteres"
            className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-11 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Campo Confirmar Nova Senha */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="text-white/50 text-[11px] uppercase tracking-widest font-semibold"
        >
          Confirmar Nova Senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            id="confirm-password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Repita a nova senha"
            className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-11 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Botão de Salvar Senha */}
      <button
        type="submit"
        disabled={pending || isVerifyingSession || state?.success}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-forest-950/50 transition-all cursor-pointer"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Salvando nova senha...</span>
          </>
        ) : (
          <>
            <span>Redefinir Senha</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.form>
  );
}

'use client';

// ============================================================
// components/auth/SupabaseLinkErrorAlert.tsx
// Banner global para erros de link do Supabase Auth (?error=... ou #error=...).
// Quando a verificação falha no Supabase (link expirado, já usado,
// redirect fora da allowlist), ele redireciona para a Site URL com
// ?error=access_denied&error_code=otp_expired — sem isso o usuário
// cai numa página normal sem entender o que houve.
// ============================================================

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';

function parseHashError(): { code: string | null; description: string | null } {
  if (typeof window === 'undefined') return { code: null, description: null };
  const hash = window.location.hash;
  if (!hash.includes('error=')) return { code: null, description: null };
  const params = new URLSearchParams(hash.slice(1));
  return {
    code: params.get('error_code'),
    description: params.get('error_description')?.replaceAll('+', ' ') ?? null,
  };
}

function SupabaseLinkErrorAlertInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [isExpiredLink, setIsExpiredLink] = useState(false);

  useEffect(() => {
    const queryError = searchParams.get('error');
    const queryCode = searchParams.get('error_code');
    const { code: hashCode } = parseHashError();
    const hasAuthError =
      queryError === 'access_denied' || queryError === 'auth_callback_error';
    const expired = queryCode === 'otp_expired' || hashCode === 'otp_expired';
    if (hasAuthError || expired || hashCode) {
      setIsExpiredLink(expired || hasAuthError);
      setVisible(true);
    }
  }, [searchParams]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    // Limpa query + hash da URL sem recarregar
    router.replace(pathname, { scroll: false });
    if (typeof window !== 'undefined' && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[100] flex justify-center px-4 pt-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-lg flex items-start gap-3 rounded-2xl border border-red-500/30 bg-[#1a0b0b]/95 backdrop-blur px-4 py-3.5 shadow-2xl shadow-black/50">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <p className="text-white text-sm font-semibold">
            {isExpiredLink
              ? 'Link de recuperação expirado ou já usado'
              : 'Link de acesso inválido'}
          </p>
          <p className="text-white/60 text-xs leading-relaxed">
            Cada link de redefinição vale uma única vez. Solicite um novo link
            e abra o e-mail mais recente.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/admin/login')}
              className="text-gold-400 hover:text-gold-300 text-xs font-semibold underline underline-offset-2 cursor-pointer"
            >
              Solicitar novo link
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-white/40 hover:text-white/70 text-xs cursor-pointer"
            >
              Dispensar
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso"
          className="p-1 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function SupabaseLinkErrorAlert() {
  return (
    <Suspense fallback={null}>
      <SupabaseLinkErrorAlertInner />
    </Suspense>
  );
}

// ============================================================
// app/admin/redefinir-senha/page.tsx
// Página de Redefinição de Senha do Painel Administrativo
// ============================================================

import Link from 'next/link';
import { ResetPasswordForm } from '@/components/admin/ResetPasswordForm';

export const metadata = {
  title: 'Redefinir Senha — Anauê PMS',
};

export default function AdminResetPasswordPage() {
  return (
    <main className="relative min-h-screen bg-[#060f0a] text-white flex flex-col items-center justify-center p-5 overflow-hidden">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-forest-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gold-400/8 blur-3xl" />
      </div>

      {/* Formulário */}
      <div className="relative z-10 w-full flex justify-center">
        <ResetPasswordForm />
      </div>

      {/* Links de navegação */}
      <div className="relative z-10 mt-6 flex items-center gap-4 text-xs font-medium text-white/35">
        <Link href="/admin/login" className="hover:text-white/70 transition-colors">
          ← Ir para o login
        </Link>
        <span>•</span>
        <Link href="/" className="hover:text-white/70 transition-colors">
          Voltar ao site público
        </Link>
      </div>
    </main>
  );
}

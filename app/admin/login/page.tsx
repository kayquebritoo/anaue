// ============================================================
// app/admin/login/page.tsx
// Página de Login do Painel Administrativo — Anauê PMS Manager
// A proteção de rota (redirect de logados/não-logados) é feita
// pelo middleware.ts — esta página apenas renderiza o formulário.
// ============================================================

import Link from 'next/link';
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata = {
  title: 'Login — Anauê PMS',
};

interface AdminLoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  // Aceita ?redirectTo=/admin/... (injetado pelo middleware), com fallback seguro
  const { redirectTo } = await searchParams;

  return (
    <main className="relative min-h-screen bg-[#060f0a] text-white flex flex-col items-center justify-center p-5 overflow-hidden">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-forest-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gold-400/8 blur-3xl" />
      </div>

      {/* Formulário */}
      <div className="relative z-10 w-full flex justify-center">
        <LoginForm redirectTo={redirectTo} />
      </div>

      {/* Voltar ao site público */}
      <Link
        href="/"
        className="relative z-10 mt-6 text-white/35 hover:text-white/70 text-xs font-medium transition-colors"
      >
        ← Voltar ao site público
      </Link>
    </main>
  );
}

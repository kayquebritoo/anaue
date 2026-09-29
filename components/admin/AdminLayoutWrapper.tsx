'use client';

// ============================================================
// components/admin/AdminLayoutWrapper.tsx
// Wrapper do Layout Administrativo com Detecção da Rota de Login
// ============================================================

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';
import { AdminHeader } from '@/components/admin/AdminHeader';

export function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/admin/login' || pathname.startsWith('/admin/redefinir-senha');

  // Nas páginas de autenticação, renderiza apenas o formulário em tela cheia
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Nas páginas autenticadas do dashboard, renderiza o layout completo do PMS
  return (
    <div className="min-h-screen gradient-amazon text-white flex flex-col md:flex-row antialiased">
      {/* ── Sidebar Desktop ── */}
      <AdminSidebar />

      {/* ── Conteúdo Principal ── */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Header Superior Padrão */}
        <AdminHeader />

        {/* Corpo da Página */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ── Bottom Navigation Mobile ── */}
      <AdminBottomNav />
    </div>
  );
}

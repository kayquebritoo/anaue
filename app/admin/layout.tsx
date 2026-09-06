// ============================================================
// app/admin/layout.tsx
// Layout Base do Painel Administrativo Anauê PMS
// ============================================================

import type { Metadata } from 'next';
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';

export const metadata: Metadata = {
  title: 'Anauê PMS — Painel de Gestão',
  description: 'Sistema Integrado de Gestão Hoteleira e Governança do Anauê Amazônia',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}

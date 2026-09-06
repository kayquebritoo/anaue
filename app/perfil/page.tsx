// ============================================================
// app/perfil/page.tsx
// Redirecionamento da rota /perfil para o painel /admin/login
// ============================================================

import { redirect } from 'next/navigation';

export default function PerfilPage() {
  redirect('/admin/login');
}

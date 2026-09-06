// ============================================================
// app/reservas/page.tsx
// Redirecionamento da rota /reservas para a página de busca (/busca)
// ============================================================

import { redirect } from 'next/navigation';

export default function ReservasPage() {
  redirect('/busca');
}

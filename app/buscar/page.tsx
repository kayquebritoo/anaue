// ============================================================
// app/buscar/page.tsx
// Redirecionamento da rota /buscar para /busca
// ============================================================

import { redirect } from 'next/navigation';

export default function BuscarPage() {
  redirect('/busca');
}

// ============================================================
// lib/supabaseClient.ts
// Cliente Supabase para Browser (Client Components) com @supabase/ssr
// Usa cookies — mesma sessão que as Server Actions / Middleware enxergam.
// O cliente antigo (lib/supabase.ts) usa localStorage e NÃO compartilha
// sessão com o servidor, o que quebra o fluxo de recovery.
// ============================================================

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClientBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

// ============================================================
// middleware.ts
// Middleware Global do Next.js — Proteção de Rotas /admin
// ============================================================

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabaseMiddleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas administrativas em /admin
     * e ignora arquivos estáticos (_next, imagens, favicon)
     */
    '/admin/:path*',
  ],
};

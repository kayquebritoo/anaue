// ============================================================
// lib/supabase.ts
// Cliente Supabase compartilhado (browser e servidor)
//
//  - Browser: createBrowserClient (@supabase/ssr) — usa a MESMA sessão em
//    cookie do login da equipe. Assim, consultas feitas pelo painel admin
//    rodam como `authenticated` e podem ser restringidas por RLS.
//  - Servidor: usa a chave secreta (service role) SOMENTE se ela parecer
//    completa; caso contrário, cai na chave pública (comportamento antigo).
//    A chave secreta nunca vai para o bundle do browser: ela não tem o
//    prefixo NEXT_PUBLIC_ e este ramo só executa no servidor.
//
// ATENÇÃO: com a chave secreta, o servidor ignora RLS. Toda Server Action
// que lê/escreve dados sensíveis DEVE checar autorização (lib/authz.ts).
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validação se o Supabase está propriamente configurado com uma URL válida
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseUrl.includes('your-project')
  );
};

/**
 * Retorna a chave secreta apenas se tiver formato de chave completa.
 * Chaves truncadas/mascaradas (ex.: copiadas do painel com "••••") são
 * rejeitadas — usá-las derrubaria todas as consultas com 401.
 */
export function getValidServiceRoleKey(raw = process.env.SUPABASE_SERVICE_ROLE_KEY): string | null {
  const key = (raw || '').trim();
  if (!key || /[^\x21-\x7E]/.test(key)) return null; // vazio ou com caracteres não-ASCII (ex.: •)
  if (key.startsWith('sb_secret_')) return key.length >= 40 ? key : null;
  if (key.startsWith('eyJ')) return key.split('.').length === 3 && key.length >= 100 ? key : null;
  return null;
}

const PRODUCTION_SUPABASE_REFS = ['yjtbwxjxhfkxrmdurgdu', ...(process.env.ANAUE_PRODUCTION_SUPABASE_REF || '').split(',').filter(Boolean)];

export function isProductionSupabaseUrl(url: string): boolean {
  return PRODUCTION_SUPABASE_REFS.some((ref) => url.includes(ref));
}

function createSupabaseClient(): SupabaseClient<Database> {
  const url = supabaseUrl || 'https://placeholder.supabase.co';

  if (typeof window !== 'undefined') {
    return createBrowserClient<Database>(url, supabaseAnonKey || 'placeholder-key');
  }

  // Preview/Development da Vercel jamais podem usar o banco de produção
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' && isProductionSupabaseUrl(url)) {
    throw new Error(`[supabase] Ambiente "${process.env.VERCEL_ENV}" configurado com o banco de PRODUÇÃO. Use o projeto de staging.`);
  }

  const serviceKey = getValidServiceRoleKey();
  if (!serviceKey && process.env.SUPABASE_SERVICE_ROLE_KEY && isSupabaseConfigured()) {
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY ignorada: formato incompleto. Usando chave pública.');
  }

  return createClient<Database>(url, serviceKey || supabaseAnonKey || 'placeholder-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Cliente Supabase tipado
export const supabase = createSupabaseClient();

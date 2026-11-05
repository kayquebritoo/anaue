// ============================================================
// lib/authz.ts
// Autorização da equipe para Server Actions.
//
// Server Actions são endpoints HTTP públicos: qualquer pessoa pode chamá-las
// pelo ID, de qualquer rota. O middleware só protege PÁGINAS em /admin.
// Por isso toda action administrativa chama requireStaff().
//
// Equipe = usuário autenticado no Supabase Auth. Se ANAUE_STAFF_EMAILS
// estiver definida (lista separada por vírgula), apenas esses e-mails.
// Recomendado: desabilitar cadastro público no Supabase Auth.
// ============================================================

import { isSupabaseConfigured } from '@/lib/supabase';
import { isMockDataAllowed } from '@/lib/dataMode';

export interface StaffUser {
  id: string;
  email: string | null;
}

export type StaffResolver = () => Promise<StaffUser | null>;

export const UNAUTHORIZED_MESSAGE = 'Acesso não autorizado. Faça login na área administrativa.';

export function isAllowedStaffEmail(email: string | null | undefined, allowList = process.env.ANAUE_STAFF_EMAILS): boolean {
  const list = (allowList || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true; // sem allowlist: qualquer usuário autenticado
  return Boolean(email && list.includes(email.trim().toLowerCase()));
}

const defaultResolver: StaffResolver = async () => {
  if (!isSupabaseConfigured()) {
    // Desenvolvimento/demo local sem Supabase: não há login possível.
    return isMockDataAllowed() ? { id: 'dev-staff', email: null } : null;
  }

  const { createClientServer } = await import('@/lib/supabaseServer');
  const client = await createClientServer();
  const { data, error } = await client.auth.getUser(); // valida o JWT no servidor do Supabase
  if (error || !data.user) return null;
  if (!isAllowedStaffEmail(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email ?? null };
};

let resolver: StaffResolver = defaultResolver;

/** Somente para testes automatizados. */
export function __setStaffResolverForTests(fn: StaffResolver | null): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__setStaffResolverForTests só pode ser usado em NODE_ENV=test');
  }
  resolver = fn ?? defaultResolver;
}

export async function getStaffUser(): Promise<StaffUser | null> {
  try {
    return await resolver();
  } catch (err) {
    console.error('[authz] Falha ao validar sessão:', err);
    return null; // fail-closed
  }
}

export async function isStaff(): Promise<boolean> {
  return (await getStaffUser()) !== null;
}

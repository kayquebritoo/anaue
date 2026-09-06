'use server';

// ============================================================
// app/actions/auth.ts
// Server Actions para Autenticação de Equipe (Supabase Auth)
// ============================================================

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabaseServer';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Ação de Login com E-mail e Senha no Supabase Auth
 */
export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Por favor, preencha o e-mail e a senha.',
    };
  }

  const supabase = await createClientServer();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

  if (error) {
    console.error('[Supabase Auth] Erro no login:', error.message);
    return {
      success: false,
      error: 'Credenciais inválidas. Verifique seu e-mail e senha.',
    };
  }

  if (!data.user) {
    return {
      success: false,
      error: 'Usuário não encontrado ou não autorizado.',
    };
  }

  revalidatePath('/admin', 'layout');
  return { success: true };
}

/**
 * Ação de Logout / Encerramento de Sessão (Robusta)
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClientServer();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/admin/login');
}

/**
 * Obter usuário atualmente autenticado
 */
export async function getCurrentUserAction() {
  const supabase = await createClientServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

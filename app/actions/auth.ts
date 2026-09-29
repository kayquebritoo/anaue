'use server';

// ============================================================
// app/actions/auth.ts
// Server Actions para Autenticação de Equipe (Supabase Auth)
// ============================================================

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClientServer } from '@/lib/supabaseServer';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
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
 * Ação de Solicitação de Redefinição de Senha (Esqueci Minha Senha)
 */
export async function requestPasswordResetAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email') as string;

  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: 'Por favor, informe um endereço de e-mail válido.',
    };
  }

  try {
    const supabase = await createClientServer();
    const headerList = await headers();
    const host = headerList.get('host') || 'localhost:3000';
    const protocol = headerList.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    // Em dev (localhost) sempre usar o host da requisição, senão o link aponta
    // para produção e o Supabase rejeita / cai em otp_expired no domínio errado.
    // Em produção, usa NEXT_PUBLIC_APP_URL.
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const appUrl = isLocalhost
      ? `${protocol}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    // IMPORTANTE: passar pelo /auth/callback para trocar `code` por sessão (PKCE).
    // Apontar direto para /admin/redefinir-senha nunca cria sessão nos cookies
    // e causa "Auth session missing" no updateUser.
    const redirectTo = `${appUrl}/auth/callback?next=/admin/redefinir-senha`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      console.error('[Supabase Auth] Erro na recuperação de senha:', error.message);
      return {
        success: false,
        error: error.message || 'Erro ao processar solicitação. Tente novamente mais tarde.',
      };
    }

    return {
      success: true,
      message: 'Instruções enviadas! Verifique sua caixa de entrada e spam para redefinir sua senha.',
    };
  } catch (err) {
    console.error('[Supabase Auth] Exceção ao redefinir senha:', err);
    return {
      success: false,
      error: 'Ocorreu um erro inesperado. Tente novamente.',
    };
  }
}

/**
 * Ação de Atualização de Senha com Nova Senha
 */
export async function updatePasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || password.length < 6) {
    return {
      success: false,
      error: 'A nova senha deve ter no mínimo 6 caracteres.',
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'As senhas informadas não coincidem.',
    };
  }

  try {
    const supabase = await createClientServer();
    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    if (error) {
      console.error('[Supabase Auth] Erro ao atualizar senha:', error.message);
      return {
        success: false,
        error: error.message || 'Sua sessão de redefinição expirou. Solicite um novo link.',
      };
    }

    revalidatePath('/admin', 'layout');
    return {
      success: true,
      message: 'Senha atualizada com sucesso! Redirecionando...',
    };
  } catch (err) {
    console.error('[Supabase Auth] Exceção ao salvar nova senha:', err);
    return {
      success: false,
      error: 'Erro inesperado ao salvar a nova senha.',
    };
  }
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

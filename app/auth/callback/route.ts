// ============================================================
// app/auth/callback/route.ts
// Callback de Autenticação Supabase (troca de code por sessão)
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/admin/redefinir-senha';

  // Supabase pode retornar erro direto na query (?error=access_denied&error_code=otp_expired)
  // quando o link expirou, já foi usado, ou o redirect não está na allowlist.
  const errorCode = searchParams.get('error_code');
  const errorDescription =
    searchParams.get('error_description') || searchParams.get('error');
  if (errorCode || errorDescription) {
    const loginUrl = new URL('/admin/login', origin);
    loginUrl.searchParams.set('error', 'recovery_link_expired');
    loginUrl.searchParams.set(
      'message',
      'Link de recuperação inválido ou expirado. Solicite um novo link.'
    );
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Contexto de Route Handler
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fluxo legado com token_hash (ex: ?token_hash=...&type=recovery)
  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Contexto de Route Handler
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email',
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Em caso de falha ou código inválido
  return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_error`);
}

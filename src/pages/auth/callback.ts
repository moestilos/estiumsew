/**
 * auth/callback.ts – Endpoint que procesa el callback de OAuth de Google/Supabase
 *
 * Flujo:
 *  1. Supabase redirige aquí tras el login con Google con un `code`
 *  2. Intercambiamos el code por una sesión
 *  3. Redirigimos a /admin (o a la URL original solicitada)
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, cookies, redirect, url }) => {
  const code        = url.searchParams.get('code');
  const redirectTo  = url.searchParams.get('redirect') ?? '/admin';
  const next        = redirectTo.startsWith('/') ? redirectTo : '/admin';

  if (!code) {
    return redirect('/login?error=no-code');
  }

  const supabase = createServerClient(request, cookies);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Error exchanging code:', error.message);
    return redirect('/login?error=' + encodeURIComponent(error.message));
  }

  return redirect(next);
};

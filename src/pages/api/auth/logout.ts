/**
 * api/auth/logout.ts – Cierra la sesión del usuario
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createServerClient(request, cookies);
  await supabase.auth.signOut();
  return redirect('/');
};

// ─────────────────────────────────────────────────────────────
//  Clientes Supabase
//
//  · supabase          → cliente público (browser / SSR sin cookies)
//  · createServerClient → cliente SSR que lee/escribe cookies de sesión
//  · createAdminClient  → cliente con service_role (solo servidor)
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import {
  createServerClient as createSSRServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { Database } from './types';

const SUPABASE_URL      = import.meta.env.PUBLIC_SUPABASE_URL  as string;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

// ── Cliente del navegador (public anon key) ───────────────────
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
});

// ── Cliente SSR con cookies (para SSR + middleware) ───────────
export function createServerClient(
  request: Request,
  cookies: AstroCookies
) {
  return createSSRServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, {
            ...options,
            sameSite: 'lax',
            httpOnly: true,
            secure: import.meta.env.PROD,
          });
        });
      },
    },
  });
}

// ── Cliente con service_role (SOLO en servidor, nunca en cliente) ─
export function createAdminClient() {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Helper: obtener usuario autenticado desde SSR ─────────────
export async function getUser(request: Request, cookies: AstroCookies) {
  const client = createServerClient(request, cookies);
  const {
    data: { user },
  } = await client.auth.getUser();
  return { user, client };
}

// ── Helper: comprobar si el usuario es admin ──────────────────
export async function isAdmin(userId: string): Promise<boolean> {
  // Usamos el cliente admin (service_role) para bypassar RLS
  const admin = createAdminClient();
  const { data } = await admin
    .from('admin_usuarios')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

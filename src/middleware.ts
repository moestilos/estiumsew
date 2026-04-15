// ─────────────────────────────────────────────────────────────
//  Middleware de Astro
//
//  Protege las rutas /admin/* verificando:
//    1. Que el usuario esté autenticado (sesión Supabase válida)
//    2. Que el usuario esté en la tabla admin_usuarios
// ─────────────────────────────────────────────────────────────

import { defineMiddleware } from 'astro:middleware';
import { createServerClient, isAdmin } from '@/lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect, url } = context;

  // Protegemos rutas de admin (páginas y API)
  const isAdminPage = url.pathname.startsWith('/admin');
  const isAdminApi  = url.pathname.startsWith('/api/admin');
  if (!isAdminPage && !isAdminApi) {
    return next();
  }

  const supabase = createServerClient(request, cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión → en API devolver 401, en páginas redirigir a login
  if (!user) {
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set('redirect', url.pathname);
    return redirect(loginUrl.toString());
  }

  // Verificar permisos de admin
  const admin = await isAdmin(user.id);
  if (!admin) {
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/?error=no-autorizado');
  }

  // Todo OK: inyectar usuario en locals
  context.locals.user     = user;
  context.locals.isAdmin  = true;

  return next();
});

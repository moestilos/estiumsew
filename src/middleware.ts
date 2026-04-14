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

  // Solo protegemos las rutas de admin
  if (!url.pathname.startsWith('/admin')) {
    return next();
  }

  const supabase = createServerClient(request, cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión → redirigir a login
  if (!user) {
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set('redirect', url.pathname);
    return redirect(loginUrl.toString());
  }

  // Con sesión pero sin permisos de admin → redirigir a inicio
  const admin = await isAdmin(user.id);
  if (!admin) {
    return redirect('/?error=no-autorizado');
  }

  // Todo OK: inyectar usuario en locals para que las páginas lo usen
  context.locals.user  = user;
  context.locals.isAdmin = true;

  return next();
});

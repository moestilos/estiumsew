// ─────────────────────────────────────────────────────────────
//  Middleware: protege /admin/* y /api/admin/*
//  Verifica sesión por cookie contra tabla sesiones.
// ─────────────────────────────────────────────────────────────
import { defineMiddleware } from 'astro:middleware';
import { getAdminFromCookies } from '@/lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, redirect, url } = context;

  const isAdminPage = url.pathname.startsWith('/admin');
  const isAdminApi  = url.pathname.startsWith('/api/admin');
  if (!isAdminPage && !isAdminApi) return next();

  const user = await getAdminFromCookies(cookies);

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

  context.locals.user    = user;
  context.locals.isAdmin = true;
  return next();
});

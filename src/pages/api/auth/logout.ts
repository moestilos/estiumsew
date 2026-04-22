/**
 * POST /api/auth/logout — cierra la sesión actual
 */
import type { APIRoute } from 'astro';
import { SESSION_COOKIE, clearSessionCookie, destroySession } from '@/lib/auth';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  clearSessionCookie(cookies);
  return redirect('/', 303);
};

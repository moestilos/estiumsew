/**
 * POST /api/auth/login
 *  body: x-www-form-urlencoded → email, password, redirect
 *  Éxito → 303 redirect a `redirect` (default /admin) con cookie de sesión.
 *  Fallo  → 303 redirect a /login?error=credentials
 */
import type { APIRoute } from 'astro';
import { authenticate, createSession, setSessionCookie } from '@/lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email    = String(form.get('email')    ?? '').trim();
  const password = String(form.get('password') ?? '');
  const nextRaw  = String(form.get('redirect') ?? '/admin');
  const next     = nextRaw.startsWith('/') ? nextRaw : '/admin';

  if (!email || !password) {
    return redirect('/login?error=credentials', 303);
  }

  const admin = await authenticate(email, password);
  if (!admin) {
    return redirect('/login?error=credentials', 303);
  }

  const token = await createSession(admin.id);
  setSessionCookie(cookies, token);

  return redirect(next, 303);
};

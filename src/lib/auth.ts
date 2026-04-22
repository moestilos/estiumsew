// ─────────────────────────────────────────────────────────────
//  Auth: sesiones por cookie httpOnly, password bcrypt.
//  Solo los registros de admin_usuarios con password_hash pueden
//  iniciar sesión. No hay registro público — la cuenta se crea
//  por el administrador (seed).
// ─────────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import type { AstroCookies } from 'astro';
import { sql } from './db';

export const SESSION_COOKIE = 'estium_session';
const SESSION_TTL_DAYS = 30;

export interface AdminUser {
  id: string;
  email: string;
  nombre: string | null;
  avatar_url: string | null;
}

// ── Helpers ───────────────────────────────────────────────────
function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Password ──────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Sesiones ──────────────────────────────────────────────────
export async function createSession(adminId: string): Promise<string> {
  const token = randomToken();
  const expira = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await sql`insert into sesiones (id, admin_id, expira_en) values (${token}, ${adminId}, ${expira.toISOString()})`;
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await sql`delete from sesiones where id = ${token}`;
}

export async function getAdminFromToken(token: string): Promise<AdminUser | null> {
  const rows = (await sql`
    select a.id, a.email, a.nombre, a.avatar_url
    from sesiones s
    join admin_usuarios a on a.id = s.admin_id
    where s.id = ${token} and s.expira_en > now()
    limit 1
  `) as AdminUser[];
  return rows[0] ?? null;
}

// ── Credentials login ─────────────────────────────────────────
export async function authenticate(email: string, password: string): Promise<AdminUser | null> {
  const rows = (await sql`
    select id, email, nombre, avatar_url, password_hash
    from admin_usuarios
    where lower(email) = lower(${email})
    limit 1
  `) as (AdminUser & { password_hash: string | null })[];
  const row = rows[0];
  if (!row || !row.password_hash) return null;
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return null;
  return { id: row.id, email: row.email, nombre: row.nombre, avatar_url: row.avatar_url };
}

// ── Cookie helpers ────────────────────────────────────────────
export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function getAdminFromCookies(cookies: AstroCookies): Promise<AdminUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAdminFromToken(token);
}

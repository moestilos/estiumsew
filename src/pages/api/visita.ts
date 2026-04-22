/**
 * api/visita.ts – Registra una visita a la tienda pública.
 * Se llama desde BaseLayout con fetch POST.
 */
import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const pagina = (body as any).pagina ?? '/';
    await sql`insert into visitas(pagina) values (${pagina})`;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};

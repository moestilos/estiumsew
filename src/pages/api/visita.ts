/**
 * api/visita.ts – Registra una visita a la tienda pública
 * Se llama desde el BaseLayout con fetch POST
 */
import type { APIRoute } from 'astro';
import { createAdminClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const pagina = (body as any).pagina ?? '/';

    const supabase = createAdminClient();
    await supabase.from('visitas').insert({ pagina });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};

/**
 * /api/admin/products – GET (listar) + POST (crear)
 * Usa service_role para bypassar RLS.
 * Verifica sesión admin via cookies antes de operar.
 */
import type { APIRoute } from 'astro';
import { createServerClient, createAdminClient, isAdmin } from '@/lib/supabase';

async function verifyAdmin(request: Request, cookies: any): Promise<boolean> {
  try {
    const client = createServerClient(request, cookies);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return false;
    return await isAdmin(user.id);
  } catch {
    return false;
  }
}

export const GET: APIRoute = async ({ request, cookies }) => {
  if (!(await verifyAdmin(request, cookies))) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('productos')
    .select('*')
    .order('orden')
    .order('creado_en');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await verifyAdmin(request, cookies))) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 }); }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('productos')
    .insert(body)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201 });
};

/**
 * /api/admin/products/[id] – PATCH (actualizar) + DELETE (eliminar)
 * Usa service_role para bypassar RLS.
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

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  if (!(await verifyAdmin(request, cookies))) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  let body: any;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 }); }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('productos')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  if (!(await verifyAdmin(request, cookies))) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const admin = createAdminClient();

  // Obtener la imagen antes de borrar para limpiar storage
  const { data: prod } = await admin
    .from('productos')
    .select('imagen_url')
    .eq('id', id)
    .single();

  const { error } = await admin
    .from('productos')
    .delete()
    .eq('id', id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Intentar borrar la imagen del storage (no crítico si falla)
  if (prod?.imagen_url) {
    try {
      const url = new URL(prod.imagen_url);
      const parts = url.pathname.split('/productos/');
      if (parts[1]) {
        await admin.storage.from('productos').remove([parts[1]]);
      }
    } catch { /* ignorar */ }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

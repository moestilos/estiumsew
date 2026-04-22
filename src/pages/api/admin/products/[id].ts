/**
 * /api/admin/products/[id] – PATCH (actualizar) + DELETE (eliminar)
 */
import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';
import { del as blobDel } from '@vercel/blob';

const FIELDS = ['nombre','descripcion','precio','categoria','imagen_url','activo','wide','orden'] as const;

export const PATCH: APIRoute = async ({ request, params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  let body: any;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 }); }

  const entries = FIELDS.filter(f => f in body).map(f => [f, body[f]] as const);
  if (entries.length === 0) {
    return new Response(JSON.stringify({ error: 'sin cambios' }), { status: 400 });
  }

  // Build dynamic UPDATE: @neondatabase/serverless tagged sql supports only static params.
  // Use a loop of 1-field updates to keep it safe & simple.
  for (const [col, val] of entries) {
    await sql.query(`update productos set ${col} = $1 where id = $2`, [val, id]);
  }
  const rows = await sql`select * from productos where id = ${id} limit 1`;
  if (!rows[0]) return new Response(JSON.stringify({ error: 'no existe' }), { status: 404 });
  return new Response(JSON.stringify(rows[0]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const rows = await sql`select imagen_url from productos where id = ${id} limit 1`;
  const prev = rows[0] as { imagen_url: string | null } | undefined;

  await sql`delete from productos where id = ${id}`;

  // Si la imagen estaba en Vercel Blob, borrarla (no crítico si falla).
  if (prev?.imagen_url && prev.imagen_url.includes('.public.blob.vercel-storage.com')) {
    try { await blobDel(prev.imagen_url); } catch { /* ignore */ }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

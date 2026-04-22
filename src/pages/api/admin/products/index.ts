/**
 * /api/admin/products – GET (listar) + POST (crear)
 * El middleware garantiza autenticación admin.
 */
import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';

export const GET: APIRoute = async () => {
  const rows = await sql`
    select * from productos
    order by orden asc, creado_en asc
  `;
  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 }); }

  const {
    nombre,
    descripcion = null,
    precio = null,
    categoria = null,
    imagen_url = null,
    activo = true,
    wide = false,
    orden = 0,
  } = body ?? {};

  if (!nombre) {
    return new Response(JSON.stringify({ error: 'nombre es obligatorio' }), { status: 400 });
  }

  const rows = await sql`
    insert into productos(nombre, descripcion, precio, categoria, imagen_url, activo, wide, orden)
    values (${nombre}, ${descripcion}, ${precio}, ${categoria}, ${imagen_url}, ${activo}, ${wide}, ${orden})
    returning *
  `;
  return new Response(JSON.stringify(rows[0]), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * /api/admin/orders/[id] – PATCH (cambiar estado / notas internas)
 */
import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';

const ESTADOS = ['pendiente','confirmado','en_proceso','enviado','entregado','cancelado'] as const;
type Estado = typeof ESTADOS[number];

export const PATCH: APIRoute = async ({ request, params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  let body: any;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 }); }

  const estado         = body?.estado as Estado | undefined;
  const notas_internas = body?.notas_internas as string | undefined;

  if (estado && !ESTADOS.includes(estado)) {
    return new Response(JSON.stringify({ error: 'estado inválido' }), { status: 400 });
  }

  if (estado) {
    await sql`update pedidos set estado = ${estado}::estado_pedido where id = ${id}`;
  }
  if (typeof notas_internas === 'string') {
    await sql`update pedidos set notas_internas = ${notas_internas} where id = ${id}`;
  }

  const rows = await sql`select * from pedidos where id = ${id} limit 1`;
  if (!rows[0]) return new Response(JSON.stringify({ error: 'no existe' }), { status: 404 });
  return new Response(JSON.stringify(rows[0]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

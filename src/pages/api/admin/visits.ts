/**
 * /api/admin/visits – Visitas agrupadas por día (últimos 30 días)
 */
import type { APIRoute } from 'astro';
import { sql } from '@/lib/db';

export const GET: APIRoute = async () => {
  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  desde.setHours(0, 0, 0, 0);

  const rows = await sql`
    select creado_en, pagina from visitas
    where creado_en >= ${desde.toISOString()}
    order by creado_en asc
  ` as { creado_en: string; pagina: string }[];

  const days: { fecha: string; visitas: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ fecha: d.toISOString().split('T')[0], visitas: 0 });
  }

  for (const v of rows) {
    const fecha = (typeof v.creado_en === 'string' ? v.creado_en : new Date(v.creado_en).toISOString()).split('T')[0];
    const entry = days.find(d => d.fecha === fecha);
    if (entry) entry.visitas++;
  }

  const total = days.reduce((s, d) => s + d.visitas, 0);
  const hoy   = days[days.length - 1]?.visitas ?? 0;
  const ayer  = days[days.length - 2]?.visitas ?? 0;

  return new Response(
    JSON.stringify({ days, total, hoy, ayer }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

/**
 * /api/admin/visits – Devuelve visitas agrupadas por día (últimos 30 días)
 * Usa service_role para bypassar RLS de la tabla visitas.
 */
import type { APIRoute } from 'astro';
import { createAdminClient } from '@/lib/supabase';

export const GET: APIRoute = async () => {
  const admin = createAdminClient();

  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  desde.setHours(0, 0, 0, 0);

  const { data, error } = await admin
    .from('visitas')
    .select('creado_en, pagina')
    .gte('creado_en', desde.toISOString())
    .order('creado_en', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Generar array de los últimos 30 días (incluye días sin visitas = 0)
  const days: { fecha: string; visitas: number; pagina?: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ fecha: d.toISOString().split('T')[0], visitas: 0 });
  }

  // Agrupar por día
  (data ?? []).forEach(v => {
    const fecha = v.creado_en.split('T')[0];
    const entry = days.find(d => d.fecha === fecha);
    if (entry) entry.visitas++;
  });

  // Total
  const total = days.reduce((s, d) => s + d.visitas, 0);
  const hoy   = days[days.length - 1]?.visitas ?? 0;
  const ayer  = days[days.length - 2]?.visitas ?? 0;

  return new Response(
    JSON.stringify({ days, total, hoy, ayer }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

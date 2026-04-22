/**
 * migration/seed.mjs
 * Inserta datos extraídos de Supabase en Neon.
 *  - productos (reescribe imagen_url de Supabase Storage → /productos/…)
 *  - perfiles
 *  - admin_usuarios
 *  - visitas (se cargan desde SQL generado en tiempo de ejecución)
 *  - pedidos / pedido_items (0 filas en origen, se omiten)
 *
 * Uso: DATABASE_URL=... node migration/seed.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }

const data = JSON.parse(readFileSync(new URL('./export/data.json', import.meta.url), 'utf8'));

function rewriteImg(url) {
  if (!url) return null;
  const m = url.match(/\/productos\/productos\/([^?]+)$/);
  return m ? `/productos/${m[1]}` : url;
}

const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query('begin');

  // productos
  for (const p of data.productos) {
    await c.query(
      `insert into productos(id,nombre,descripcion,precio,categoria,imagen_url,activo,wide,orden,creado_en,actualizado_en)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do update set
         nombre=excluded.nombre, descripcion=excluded.descripcion, precio=excluded.precio,
         categoria=excluded.categoria, imagen_url=excluded.imagen_url, activo=excluded.activo,
         wide=excluded.wide, orden=excluded.orden, actualizado_en=excluded.actualizado_en`,
      [p.id, p.nombre, p.descripcion, p.precio, p.categoria, rewriteImg(p.imagen_url),
       p.activo, p.wide, p.orden, p.creado_en, p.actualizado_en]
    );
  }
  console.log(`productos: ${data.productos.length}`);

  // perfiles
  for (const p of data.perfiles) {
    await c.query(
      `insert into perfiles(id,email,nombre,avatar_url,creado_en)
       values($1,$2,$3,$4,$5) on conflict (id) do nothing`,
      [p.id, p.email ?? null, p.nombre, p.avatar_url, p.creado_en]
    );
  }
  console.log(`perfiles: ${data.perfiles.length}`);

  // admin_usuarios: mantener email + crear registro independiente (sin user_id Supabase)
  for (const a of data.admin_usuarios) {
    // reutilizar datos de perfiles si los hay
    const perfil = data.perfiles.find(p => p.id === a.user_id);
    await c.query(
      `insert into admin_usuarios(email,nombre,avatar_url,creado_en)
       values($1,$2,$3,$4) on conflict (email) do nothing`,
      [a.email, perfil?.nombre ?? null, perfil?.avatar_url ?? null, a.creado_en]
    );
  }
  console.log(`admin_usuarios: ${data.admin_usuarios.length}`);

  // visitas
  if (data.visitas?.length) {
    // Batch insert
    const vals = [];
    const params = [];
    data.visitas.forEach((v, i) => {
      vals.push(`($${i*2+1}, $${i*2+2})`);
      params.push(v.pagina, v.creado_en);
    });
    // Split en chunks de 500 para evitar limits
    const chunk = 500;
    for (let i = 0; i < data.visitas.length; i += chunk) {
      const slice = data.visitas.slice(i, i + chunk);
      const rows = slice.map((_, j) => `($${j*2+1},$${j*2+2})`).join(',');
      const args = slice.flatMap(v => [v.pagina, v.creado_en]);
      await c.query(`insert into visitas(pagina,creado_en) values ${rows}`, args);
    }
    console.log(`visitas: ${data.visitas.length}`);
  }

  await c.query('commit');
  console.log('seed ok');
} catch (e) {
  await c.query('rollback').catch(() => {});
  console.error('ERROR:', e.message);
  process.exit(1);
} finally {
  await c.end();
}

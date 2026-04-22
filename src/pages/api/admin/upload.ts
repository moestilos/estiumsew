/**
 * /api/admin/upload – Sube una imagen a Vercel Blob.
 * Requiere `BLOB_READ_WRITE_TOKEN` (lo inyecta Vercel automáticamente al crear el Blob store).
 * El middleware ya garantiza autenticación admin.
 */
import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return new Response(JSON.stringify({ error: 'FormData inválido' }), { status: 400 }); }

  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'No se recibió ningún archivo' }), { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'La imagen no puede superar 5 MB' }), { status: 400 });
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const name = `productos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const blob = await put(name, file, {
      access: 'public',
      contentType: file.type || 'image/jpeg',
      addRandomSuffix: false,
    });
    return new Response(JSON.stringify({ url: blob.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? 'Error subiendo imagen' }),
      { status: 500 }
    );
  }
};

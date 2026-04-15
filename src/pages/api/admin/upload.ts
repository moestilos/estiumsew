/**
 * /api/admin/upload – Sube una imagen al bucket "productos" de Storage
 * Recibe multipart/form-data con campo "file".
 * Usa service_role para bypassar las políticas RLS del storage.
 */
import type { APIRoute } from 'astro';
import { createServerClient, createAdminClient, isAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verificar sesión admin
  try {
    const client = createServerClient(request, cookies);
    const { data: { user } } = await client.auth.getUser();
    if (!user || !(await isAdmin(user.id))) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'FormData inválido' }), { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'No se recibió ningún archivo' }), { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'La imagen no puede superar 5 MB' }), { status: 400 });
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `productos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer      = new Uint8Array(arrayBuffer);

  const { error: upErr } = await admin.storage
    .from('productos')
    .upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });

  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
  }

  const { data } = admin.storage.from('productos').getPublicUrl(path);

  return new Response(JSON.stringify({ url: data.publicUrl }), { status: 200 });
};

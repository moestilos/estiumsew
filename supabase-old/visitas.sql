-- ============================================================
--  estiumsew · Tabla de visitas
--  Ejecuta en Supabase SQL Editor
-- ============================================================

create table if not exists public.visitas (
  id         bigint      generated always as identity primary key,
  pagina     text        not null default '/',
  creado_en  timestamptz not null default now()
);

alter table public.visitas enable row level security;

-- Cualquiera puede insertar una visita (se llama desde el servidor)
create policy "Visitas: insertar"
  on public.visitas for insert
  with check (true);

-- Solo admins pueden leer
create policy "Visitas: admin leer"
  on public.visitas for select
  using (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

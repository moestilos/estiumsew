-- ============================================================
--  estiumsew · Supabase Schema
--  Ejecuta este script en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────
--  EXTENSIONES
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ─────────────────────────────────────────────
--  TABLA: perfiles
--  Se crea automáticamente cuando un usuario
--  se registra (via trigger en auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.perfiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  nombre     text,
  avatar_url text,
  creado_en  timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Cada usuario sólo ve y edita su propio perfil
create policy "Perfil: leer propio"
  on public.perfiles for select
  using (auth.uid() = id);

create policy "Perfil: actualizar propio"
  on public.perfiles for update
  using (auth.uid() = id);


-- ─────────────────────────────────────────────
--  TABLA: admin_usuarios
--  Lista blanca de correos con acceso admin
-- ─────────────────────────────────────────────
create table if not exists public.admin_usuarios (
  id         bigint      generated always as identity primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  email      text        not null,
  creado_en  timestamptz not null default now(),
  constraint admin_usuarios_user_id_uq unique (user_id)
);

alter table public.admin_usuarios enable row level security;

-- Solo los propios admins pueden leer la tabla
create policy "Admin: leer admins"
  on public.admin_usuarios for select
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────
--  TABLA: productos
-- ─────────────────────────────────────────────
create table if not exists public.productos (
  id          uuid        primary key default uuid_generate_v4(),
  nombre      text        not null,
  descripcion text,
  precio      numeric(10,2),
  categoria   text,
  imagen_url  text,
  activo      boolean     not null default true,
  wide        boolean     not null default false,   -- ocupa 2 columnas en grid
  orden       integer     not null default 0,
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.productos enable row level security;

-- Todos pueden leer productos activos (tienda pública)
create policy "Productos: leer activos"
  on public.productos for select
  using (activo = true);

-- Solo los admins pueden insertar / actualizar / borrar
-- (el service_role de Supabase bypassa RLS; usamos eso desde el servidor)
-- Para operaciones desde el cliente admin (con anon key) añadimos:
create policy "Productos: admin insert"
  on public.productos for insert
  with check (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

create policy "Productos: admin update"
  on public.productos for update
  using (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

create policy "Productos: admin delete"
  on public.productos for delete
  using (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

-- También necesitamos que los admins puedan leer productos inactivos
create policy "Productos: admin leer todos"
  on public.productos for select
  using (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────
--  TABLA: pedidos
--  Una consulta/pedido del cliente
-- ─────────────────────────────────────────────
create type public.estado_pedido as enum (
  'pendiente',
  'confirmado',
  'en_proceso',
  'enviado',
  'entregado',
  'cancelado'
);

create table if not exists public.pedidos (
  id              uuid              primary key default uuid_generate_v4(),
  nombre_cliente  text              not null,
  email_cliente   text,
  telefono        text,
  mensaje         text,
  estado          public.estado_pedido not null default 'pendiente',
  notas_internas  text,
  creado_en       timestamptz       not null default now(),
  actualizado_en  timestamptz       not null default now()
);

alter table public.pedidos enable row level security;

-- Cualquiera puede crear un pedido (formulario público)
create policy "Pedidos: insertar público"
  on public.pedidos for insert
  with check (true);

-- Solo admins pueden leer / actualizar pedidos
create policy "Pedidos: admin leer"
  on public.pedidos for select
  using (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

create policy "Pedidos: admin actualizar"
  on public.pedidos for update
  using (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────
--  TABLA: pedido_items
--  Líneas de un pedido (qué productos y cuántos)
-- ─────────────────────────────────────────────
create table if not exists public.pedido_items (
  id          bigint      generated always as identity primary key,
  pedido_id   uuid        not null references public.pedidos(id) on delete cascade,
  producto_id uuid        references public.productos(id) on delete set null,
  nombre      text        not null,   -- snapshot del nombre en el momento del pedido
  cantidad    integer     not null default 1,
  precio      numeric(10,2)
);

alter table public.pedido_items enable row level security;

-- Cualquiera puede insertar (mismo formulario)
create policy "PedidoItems: insertar público"
  on public.pedido_items for insert
  with check (true);

-- Solo admins pueden leer
create policy "PedidoItems: admin leer"
  on public.pedido_items for select
  using (
    exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────
--  TRIGGER: crear perfil al registrarse
-- ─────────────────────────────────────────────
create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.on_auth_user_created();


-- ─────────────────────────────────────────────
--  TRIGGER: actualizar updated_at automáticamente
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger productos_updated_at
  before update on public.productos
  for each row execute procedure public.set_updated_at();

create trigger pedidos_updated_at
  before update on public.pedidos
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────────
--  STORAGE: bucket para imágenes de productos
-- ─────────────────────────────────────────────
-- Ejecutar en SQL Editor o desde el dashboard de Storage:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,          -- público: las URLs son accesibles sin auth
  5242880,       -- 5 MB máximo por imagen
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Cualquiera puede leer imágenes (bucket público)
create policy "Storage productos: leer público"
  on storage.objects for select
  using (bucket_id = 'productos');

-- Solo admins pueden subir / actualizar / borrar imágenes
create policy "Storage productos: admin upload"
  on storage.objects for insert
  with check (
    bucket_id = 'productos'
    and exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

create policy "Storage productos: admin update"
  on storage.objects for update
  using (
    bucket_id = 'productos'
    and exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

create policy "Storage productos: admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'productos'
    and exists (
      select 1 from public.admin_usuarios
      where user_id = auth.uid()
    )
  );

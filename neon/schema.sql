-- ============================================================
--  estiumsew · Neon schema (post-Supabase migration)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── admin_usuarios: usuarios con acceso al panel ─────────────
create table if not exists public.admin_usuarios (
  id             uuid        primary key default uuid_generate_v4(),
  email          text        not null unique,
  nombre         text,
  avatar_url     text,
  password_hash  text,                             -- null => aún no ha fijado contraseña
  creado_en      timestamptz not null default now()
);

-- ── sesiones: cookie → admin ────────────────────────────────
create table if not exists public.sesiones (
  id          text        primary key,             -- token opaco (32+ bytes base64url)
  admin_id    uuid        not null references public.admin_usuarios(id) on delete cascade,
  expira_en   timestamptz not null,
  creado_en   timestamptz not null default now()
);
create index if not exists sesiones_admin_idx on public.sesiones(admin_id);
create index if not exists sesiones_expira_idx on public.sesiones(expira_en);

-- ── perfiles: snapshot histórico de usuarios ex-Supabase ────
create table if not exists public.perfiles (
  id          uuid        primary key,
  email       text,
  nombre      text,
  avatar_url  text,
  creado_en   timestamptz not null default now()
);

-- ── productos ───────────────────────────────────────────────
create type estado_pedido as enum (
  'pendiente','confirmado','en_proceso','enviado','entregado','cancelado'
);

create table if not exists public.productos (
  id             uuid        primary key default uuid_generate_v4(),
  nombre         text        not null,
  descripcion    text,
  precio         numeric(10,2),
  categoria      text,
  imagen_url     text,
  activo         boolean     not null default true,
  wide           boolean     not null default false,
  orden          integer     not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ── pedidos ─────────────────────────────────────────────────
create table if not exists public.pedidos (
  id              uuid               primary key default uuid_generate_v4(),
  nombre_cliente  text               not null,
  email_cliente   text,
  telefono        text,
  mensaje         text,
  estado          estado_pedido      not null default 'pendiente',
  notas_internas  text,
  creado_en       timestamptz        not null default now(),
  actualizado_en  timestamptz        not null default now()
);

-- ── pedido_items ────────────────────────────────────────────
create table if not exists public.pedido_items (
  id          bigint         generated always as identity primary key,
  pedido_id   uuid           not null references public.pedidos(id) on delete cascade,
  producto_id uuid           references public.productos(id) on delete set null,
  nombre      text           not null,
  cantidad    integer        not null default 1,
  precio      numeric(10,2)
);

-- ── visitas ─────────────────────────────────────────────────
create table if not exists public.visitas (
  id         bigint      generated always as identity primary key,
  pagina     text        not null default '/',
  creado_en  timestamptz not null default now()
);
create index if not exists visitas_creado_en_idx on public.visitas(creado_en);

-- ── trigger: updated_at ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.actualizado_en := now(); return new; end;
$$;

drop trigger if exists productos_updated_at on public.productos;
create trigger productos_updated_at
  before update on public.productos
  for each row execute procedure public.set_updated_at();

drop trigger if exists pedidos_updated_at on public.pedidos;
create trigger pedidos_updated_at
  before update on public.pedidos
  for each row execute procedure public.set_updated_at();

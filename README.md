# estiumsew

> Tienda artesanal online para [@estiumsew](https://instagram.com/estiumsew) — costura hecha a mano desde Sevilla, España.

Diseñada para mostrar y vender productos artesanales únicos, con un panel de administración privado para gestionar el catálogo y los pedidos.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | [Astro](https://astro.build) SSR (`output: 'server'`) |
| Componentes interactivos | React (`@astrojs/react`) |
| Autenticación | Supabase Auth + Google OAuth (PKCE) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Almacenamiento de imágenes | Supabase Storage |
| Despliegue | Netlify (con adaptador `@astrojs/netlify`) |

---

## Arquitectura de seguridad

- Las rutas `/admin/*` y `/api/admin/*` están protegidas por middleware Astro.
- Las mutaciones de datos usan un cliente `service_role` en el servidor, nunca en el cliente.
- El cliente del navegador usa únicamente la clave `anon` y está sujeto a las políticas RLS de Supabase.

---

## Puesta en marcha local

### 1. Variables de entorno

Crea un `.env` en la raíz (copia `.env.example`):

```env
PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
PUBLIC_SITE_URL=http://localhost:4321
```

> Nunca subas `.env` a Git — está en `.gitignore`.

### 2. Base de datos

En el **SQL Editor** de Supabase, ejecuta en orden:

```
supabase/schema.sql   — tablas, RLS, triggers y bucket de storage
supabase/seed.sql     — datos de ejemplo (opcional)
```

### 3. Google OAuth

1. [console.cloud.google.com](https://console.cloud.google.com) → *APIs & Services → Credentials → Create OAuth 2.0 Client ID*
2. Authorized redirect URI: `https://<proyecto>.supabase.co/auth/v1/callback`
3. En Supabase: *Authentication → Providers → Google* → pega Client ID y Secret

### 4. Instalar y arrancar

```bash
npm install
npm run dev
# → http://localhost:4321
```

---

## Despliegue en Netlify

1. Conecta el repositorio a Netlify.
2. La configuración de build ya está en `netlify.toml`.
3. Añade las variables de entorno en *Site settings → Environment variables*.
4. En Supabase (*Authentication → URL Configuration*):
   - **Site URL**: `https://<tu-sitio>.netlify.app`
   - **Redirect URLs**: `https://<tu-sitio>.netlify.app/auth/callback`

Cualquier push a `main` despliega automáticamente.

---

## Estructura del proyecto

```
estiumsew/
├── public/
│   └── favicon.svg
├── supabase/
│   ├── schema.sql
│   └── seed.sql
└── src/
    ├── middleware.ts              # Protección de rutas admin
    ├── styles/global.css          # Variables CSS, animaciones
    ├── lib/
    │   ├── supabase.ts            # Clientes (browser, SSR, admin)
    │   └── types.ts               # Interfaces TypeScript
    ├── layouts/
    │   ├── BaseLayout.astro       # Shell HTML + canvas animado
    │   └── AdminLayout.astro      # Sidebar del panel admin
    ├── components/
    │   ├── layout/Nav.astro       # Nav fija con glass effect + hamburguesa
    │   ├── layout/Footer.astro
    │   ├── shop/ProductCard.astro # Tarjeta de producto
    │   └── admin/
    │       ├── ProductTable.tsx   # CRUD de productos
    │       ├── ProductForm.tsx    # Formulario crear/editar
    │       └── VisitsChart.tsx    # Gráfica de visitas (donut)
    └── pages/
        ├── index.astro            # Tienda pública
        ├── login.astro
        ├── auth/callback.ts       # Callback OAuth
        ├── api/
        │   ├── visita.ts          # Tracker de visitas
        │   ├── auth/logout.ts
        │   └── admin/             # Endpoints protegidos (service_role)
        │       ├── products/
        │       ├── upload.ts
        │       └── visits.ts
        └── admin/
            ├── index.astro        # Dashboard
            ├── productos.astro
            └── pedidos.astro
```

---

## Panel de administración

| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard: estadísticas, gráfica de visitas, pedidos recientes |
| `/admin/productos` | Crear, editar, reordenar y eliminar productos con subida de imagen |
| `/admin/pedidos` | Gestionar estados de pedidos y responder por WhatsApp |

### Añadir una cuenta de administrador

1. El usuario hace login con Google en `/login` (crea su cuenta en Supabase Auth).
2. En Supabase → *Authentication → Users*, copia su UUID.
3. En *Table Editor → `admin_usuarios`*, inserta una fila con ese UUID.

---

## Licencia

Proyecto privado — todos los derechos reservados.

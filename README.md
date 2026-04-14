# estiumsew · Tienda de Fani

Tienda artesanal online para [@estiumsew](https://instagram.com/estiumsew) — costura a mano desde Sevilla, España.

Construida con **Astro SSR**, **Supabase** (auth + base de datos + storage) y desplegada en **Netlify**.

---

## Tecnologías

| Capa | Herramienta |
|---|---|
| Framework | [Astro](https://astro.build) con SSR (`output: 'server'`) |
| UI interactiva | React (`@astrojs/react`) |
| Auth | Supabase Auth con Google OAuth |
| Base de datos | Supabase (PostgreSQL) |
| Imágenes | Supabase Storage |
| Hosting | Netlify |

---

## Puesta en marcha

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. Guarda la **URL** y la **anon key** del proyecto (las encontrarás en *Settings → API*).
3. Copia también la **service_role key** (en el mismo sitio, un poco más abajo).

### 2. Ejecutar el esquema SQL

En el **SQL Editor** de Supabase, ejecuta en orden:

```bash
# Primero el esquema (tablas, RLS, triggers, storage)
supabase/schema.sql

# Luego los datos de ejemplo (opcional pero recomendado)
supabase/seed.sql
```

Puedes copiar y pegar el contenido directamente en el editor SQL del dashboard.

### 3. Configurar Google OAuth

1. Ve a [console.cloud.google.com](https://console.cloud.google.com).
2. Crea un proyecto → *APIs & Services → Credentials → Create OAuth 2.0 Client ID*.
3. En *Authorized redirect URIs* añade:
   ```
   https://<tu-proyecto>.supabase.co/auth/v1/callback
   ```
4. Copia el **Client ID** y **Client Secret**.
5. En Supabase: *Authentication → Providers → Google* → pega las credenciales y activa el provider.

### 4. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto (copia `.env.example`):

```env
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_SITE_URL=http://localhost:4321
```

> ⚠️ Nunca subas el `.env` a Git. Está incluido en `.gitignore`.

### 5. Instalar dependencias y arrancar en local

```bash
npm install
npm run dev
```

La tienda estará disponible en `http://localhost:4321`.

---

## Añadir a Fani como administradora

Después de hacer login con Google por primera vez:

1. Ve al **SQL Editor** en Supabase.
2. Ejecuta:

```sql
insert into public.admin_usuarios (user_id, email)
select id, email
from auth.users
where email = 'fani@gmail.com';   -- ← cambia por el email real
```

A partir de ahí Fani podrá acceder a `/admin` y gestionar todos los productos y pedidos.

---

## Despliegue en Netlify

### Configuración inicial (una sola vez)

1. Conecta el repositorio de GitHub a Netlify.
2. La configuración de build ya está en `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. En *Site settings → Environment variables* añade las mismas variables del `.env`:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PUBLIC_SITE_URL` → la URL final de tu Netlify (p. ej. `https://estiumsew.netlify.app`)

4. Actualiza la **Authorized redirect URI** de Google con la URL de producción:
   ```
   https://<tu-proyecto>.supabase.co/auth/v1/callback
   ```

5. En Supabase (*Authentication → URL Configuration*) añade:
   - **Site URL**: `https://estiumsew.netlify.app`
   - **Redirect URLs**: `https://estiumsew.netlify.app/auth/callback`

### Desplegar

Cualquier push a la rama `main` desplegará automáticamente en Netlify.

```bash
git add .
git commit -m "feat: nueva versión"
git push origin main
```

---

## Estructura del proyecto

```
estiumsew/
├── astro.config.mjs          # Config de Astro (SSR + Netlify + React)
├── package.json
├── tsconfig.json
├── netlify.toml              # Config de despliegue
├── .env.example              # Variables de entorno de ejemplo
│
├── public/
│   └── favicon.svg
│
├── supabase/
│   ├── schema.sql            # Tablas, RLS, triggers, storage
│   └── seed.sql              # Productos iniciales
│
└── src/
    ├── env.d.ts              # Tipos globales de Astro (locals)
    ├── middleware.ts         # Protección de rutas /admin/*
    ├── styles/
    │   └── global.css        # Variables CSS, animaciones, componentes base
    ├── lib/
    │   ├── supabase.ts       # Clientes de Supabase (browser, SSR, admin)
    │   └── types.ts          # Interfaces TypeScript
    ├── layouts/
    │   ├── BaseLayout.astro  # Shell HTML + canvas animado + fuentes
    │   └── AdminLayout.astro # Layout del panel admin con sidebar
    ├── components/
    │   ├── layout/
    │   │   ├── Nav.astro     # Navegación pública fija
    │   │   └── Footer.astro  # Pie de página
    │   ├── shop/
    │   │   └── ProductCard.astro  # Tarjeta de producto
    │   └── admin/
    │       ├── ProductTable.tsx   # Tabla de productos con CRUD
    │       ├── ProductForm.tsx    # Formulario crear/editar producto
    │       └── OrderTable.tsx     # Tabla de pedidos con filtros
    └── pages/
        ├── index.astro            # Tienda pública
        ├── login.astro            # Login con Google
        ├── auth/
        │   └── callback.ts        # Callback OAuth de Supabase
        ├── api/auth/
        │   └── logout.ts          # Endpoint de logout
        └── admin/
            ├── index.astro        # Dashboard admin
            ├── productos.astro    # Gestión de productos
            └── pedidos.astro      # Gestión de pedidos
```

---

## Panel de administración

Una vez logueada como admin, Fani puede acceder a:

| Ruta | Descripción |
|---|---|
| `/admin` | Dashboard con stats y últimas consultas |
| `/admin/productos` | Crear, editar, reordenar y eliminar productos |
| `/admin/pedidos` | Ver y actualizar el estado de los pedidos |

### Gestión de productos

- **Crear**: botón "Nuevo producto" en el dashboard o en la página de productos.
- **Editar**: botón de edición en cada fila de la tabla.
- **Imagen**: subir directamente desde el formulario (se sube a Supabase Storage).
- **Eliminar**: botón de borrado con confirmación.
- **Activar/desactivar**: switch para ocultar productos sin borrarlos.

### Gestión de pedidos

Los estados disponibles son:
- `pendiente` → `confirmado` → `en_proceso` → `enviado` → `entregado`
- `cancelado` (disponible en cualquier momento)

Desde el modal de detalle se puede responder directamente por WhatsApp al cliente.

---

## Contacto

- Instagram: [@estiumsew](https://instagram.com/estiumsew)
- WhatsApp: +34 695 25 41 87
- Sevilla, España 🇪🇸

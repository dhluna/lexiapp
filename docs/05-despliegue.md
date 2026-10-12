# 05 · Configurar cuentas y desplegar

Guía para activar las cuentas y la sincronización (Fase 3) y publicar Lexi en Vercel. Sin
estos pasos la app funciona igual, solo que sin cuentas.

Los nombres de los menús de Supabase, Google Cloud y Vercel pueden cambiar con el tiempo; la
idea de cada paso se mantiene.

## 1. Proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com). Elige una región cercana a tus
   usuarios y guarda la contraseña de la base de datos en un gestor de contraseñas.
2. Abre **SQL Editor**, pega el contenido de
   [`supabase/migrations/0001_lexi_sync.sql`](../supabase/migrations/0001_lexi_sync.sql) y
   ejecútalo. Crea las tablas, las reglas de acceso (RLS) y las funciones `sync_push` y
   `delete_my_account`.
   - Alternativa con [Supabase CLI](https://supabase.com/docs/guides/cli):
     `supabase link --project-ref <ref>` y después `supabase db push`.
3. Comprueba en **Table Editor** que las cuatro tablas muestran el candado de RLS activado.

## 2. Inicio de sesión con email y contraseña

En **Authentication › Sign In / Providers › Email**:
- Activa el proveedor de email y **Confirm email**.
- Longitud mínima de contraseña: **8**.
- Si tu plan lo permite, activa la protección contra contraseñas filtradas.

Para producción configura un SMTP propio (**Authentication › Emails › SMTP**). El servidor
de correo incluido sirve para pruebas, pero envía muy pocos correos por hora.

## 3. Inicio de sesión con Google

1. En [Google Cloud Console](https://console.cloud.google.com), crea (o elige) un proyecto.
2. **Google Auth Platform › Branding**: nombre de la app (Lexi), email de soporte y dominio.
3. **Clients › Create client › Web application**:
   - Authorized redirect URI: la **Callback URL** que muestra Supabase en
     **Authentication › Sign In / Providers › Google** (tiene la forma
     `https://<ref>.supabase.co/auth/v1/callback`).
4. Copia el **Client ID** y el **Client secret** en el proveedor de Google de Supabase y
   actívalo. El secreto se pega directamente en Supabase; no va en el código ni en Vercel.

## 4. URL permitidas

En **Authentication › URL Configuration**:
- **Site URL**: la URL de producción, por ejemplo `https://lexi.vercel.app`.
- **Redirect URLs** (añade todas las que uses):
  - `http://localhost:3000/**`
  - `https://lexi.vercel.app/**`
  - Si usas despliegues de vista previa de Vercel:
    `https://*-<tu-equipo>.vercel.app/**`

Lexi redirige a `/auth/callback` (Google y confirmación de email) y a
`/restablecer-contrasena` (recuperar contraseña).

## 5. Variables de entorno

En **Project Settings › API** copia la URL del proyecto y la clave **pública**
(*publishable* o *anon*).

En local, dentro de `apps/web`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Rellena `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave pública>
```

> Nunca uses la clave `service_role` en Lexi: daría acceso completo a la base de datos
> desde el navegador. Lexi no la necesita.

## 6. Desplegar en Vercel

1. Sube el repositorio a GitHub, GitLab o Bitbucket.
2. En [vercel.com](https://vercel.com), **Add New › Project** e importa el repositorio.
   En **Root Directory** elige **`apps/web`** (el repositorio es un monorepo); Vercel
   detecta Next.js e instala las dependencias del workspace.
3. En **Environment Variables** añade las dos variables del paso 5 para *Production* y
   *Preview*.
4. Despliega. Después vuelve al paso 4 y añade la URL definitiva si aún no estaba.

## 7. Comprobaciones tras configurar

1. `npm run dev`; en **Ajustes** aparece el grupo **Cuenta**.
2. Crear cuenta con email → llega el correo → el enlace inicia sesión.
3. **Continuar con Google** vuelve a Lexi con la sesión iniciada.
4. **¿Olvidaste tu contraseña?** → correo → nueva contraseña.
5. Practica en un navegador y abre Lexi con la misma cuenta en otro (o en una ventana de
   incógnito): tras sincronizar, el progreso coincide.
6. **Aislamiento entre usuarios:** con un segundo usuario, ejecuta en la consola del
   navegador una lectura de las tablas; solo debe devolver sus propias filas.
7. **Eliminar cuenta** en Ajustes y comprueba en **Table Editor** que sus filas
   desaparecieron.

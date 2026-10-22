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
   `delete_my_account`. Después haz lo mismo, en orden, con el resto de archivos de
   `supabase/migrations/` (`0002_active_packs.sql` añade los paquetes activos a los ajustes).
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
- **Site URL**: la URL de producción (la de Lexi es `https://lexiapp.app`).
- **Redirect URLs** (añade todas las que uses):
  - `http://localhost:3000/**`
  - `https://lexiapp.app/**`
  - `https://lexiapp-es.vercel.app/**` (dominio anterior, redirige a `lexiapp.app`)
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

> Nunca uses la clave `service_role` (o la secreta, `sb_secret_…`) en el navegador ni en una
> variable `NEXT_PUBLIC_*`: daría acceso completo a la base de datos. La única excepción es el
> envío del recordatorio diario, que se ejecuta en el servidor de Vercel
> (`SUPABASE_SECRET_KEY`, ver `docs/15-recordatorios.md`).

## 6. Desplegar en Vercel

1. Sube el repositorio a GitHub, GitLab o Bitbucket.
2. En [vercel.com](https://vercel.com), **Add New › Project** e importa el repositorio.
   En **Root Directory** elige **`apps/web`** (el repositorio es un monorepo); Vercel
   detecta Next.js e instala las dependencias del workspace.
3. En **Environment Variables** añade las dos variables del paso 5 para *Production* y
   *Preview*.
   No añadas la integración de Supabase que ofrece Vercel: crearía un proyecto nuevo y vacío.
4. Despliega. Usa el dominio de producción (**Domains**, sin el nombre del equipo); las
   direcciones con código de despliegue o con el nombre del equipo piden iniciar sesión en
   Vercel. Después vuelve al paso 4 y pon esa URL en Supabase.
5. Cada `git push` a `master` publica una versión nueva; las demás ramas generan vistas previas.

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

## 8. Antes de abrir Lexi al público

- **Política de privacidad** en `/privacidad` (`apps/web/src/features/legal/privacy-policy.tsx`).
  El responsable y el email de contacto están en constantes al principio del archivo; si
  cambian el tratamiento de datos o los proveedores, actualiza el texto y la fecha.
- **Icono y vista previa al compartir:** `apps/web/src/app/icon.svg`, `apple-icon.tsx`,
  `opengraph-image.tsx` (con las fuentes de `apps/web/assets/fonts`, licencia OFL) y
  `manifest.ts`.
- Correo propio en Supabase (SMTP), Google en modo producción (Google Auth Platform ›
  Audience › **Publish app**) y, si quieres, CAPTCHA en el registro.

## 9. Dominio `lexiapp.app` (Cloudflare)

- Registrado en Cloudflare. DNS: un **CNAME** en la raíz hacia Vercel (con la nube **gris,
  «DNS only»**: si va por el proxy de Cloudflare, Vercel avisa de «Proxy Detected»).
- Correo: Cloudflare Email Routing reenvía `hola@lexiapp.app` al Gmail del responsable (MX y SPF
  de Cloudflare; no toques esos registros). Es el contacto de la política de privacidad.
- En Vercel, `lexiapp-es.vercel.app` y `www.lexiapp.app` redirigen a `lexiapp.app`.

## 10. Buscadores

- `apps/web/src/app/robots.ts` y `sitemap.ts` (inicio, Vocabulario, Practicar, privacidad y una
  entrada por palabra). Las pantallas de cuenta y personales (`/entrar`, `/auth/`, `/ajustes`,
  `/progreso`) quedan fuera. Las fichas declaran su URL canónica.
- El dominio está verificado en Google Search Console (registro TXT `google-site-verification`
  en Cloudflare: no lo borres). Envía allí `https://lexiapp.app/sitemap.xml` en **Sitemaps**.

## 11. Correo de autenticación con Resend

El SMTP incluido en Supabase solo envía a los miembros del equipo y muy pocos correos por hora.
Lexi usa Resend sobre su dominio:

1. Resend › **Domains**: `lexiapp.app` verificado. Sus registros DNS (DKIM en
   `resend._domainkey`, SPF y MX en `send`) están en Cloudflare con **DNS only** y no chocan con
   los del reenvío de `hola@`. Recomendado: TXT `_dmarc` = `v=DMARC1; p=none;`.
2. Resend › **API Keys**: una clave con *Sending access* limitada a `lexiapp.app`. Se pega solo
   en Supabase; nunca en el código ni en Vercel.
3. Supabase › **Authentication › Emails › SMTP Settings**: host `smtp.resend.com`, puerto
   `465`, usuario `resend`, contraseña = la API key; remitente `Lexi <no-responder@lexiapp.app>`.
4. Supabase › **Authentication › Rate Limits**: sube el límite de correos por hora (p. ej. 100).
5. Plantillas en español: `supabase/templates/` (asuntos e instrucciones en su README).

## 12. Estadísticas de visitas (Vercel Web Analytics)

- **Activar:** en Vercel, proyecto lexiapp › **Analytics** › **Enable**. Los datos aparecen
  en esa misma pestaña unos minutos después del siguiente despliegue.
- **En el código:** `<SiteAnalytics />` en `app/layout.tsx` (`components/site-analytics.tsx`).
  Solo envía datos en producción, no en `next dev` ni en las pruebas.
- **Sin parámetros:** `beforeSend` quita la query y el hash de cada URL antes de enviarla. Los
  enlaces de correo llevan tokens de un solo uso
  (`/auth/callback?token_hash=…`, `/restablecer-contrasena?token_hash=…`) y no deben acabar
  en las estadísticas. La prueba `components/site-analytics.test.ts` lo comprueba.
- **Privacidad:** sin cookies y sin datos personales. Está declarado en la política de
  privacidad, en el apartado «Estadísticas de visitas».
- **Límite:** el plan gratuito de Vercel incluye un número limitado de eventos al mes. Si se
  supera, hay que pasar a Pro o cambiar a Cloudflare Web Analytics, que también funciona sin
  cookies.

## 13. Recordatorio diario (opcional)

Las notificaciones push necesitan una migración, claves VAPID, variables en Vercel y una tarea
programada en Supabase. Los pasos están en
[`docs/15-recordatorios.md`](15-recordatorios.md#configuración-una-vez). Sin ellos, Ajustes no
muestra el recordatorio y todo lo demás funciona igual.

## 14. Si Vercel no despliega tras fusionar

Vercel despliega producción cuando GitHub le avisa de un push a `master` (webhook). Si ese
aviso se pierde (por ejemplo, durante una incidencia de GitHub; ver githubstatus.com), la
fusión queda en `master` pero **no aparece ninguna fila «Production» nueva** en Vercel ›
Deployments, y lexiapp.app sigue sirviendo la versión anterior.

- **Comprobarlo:** `gh api "repos/dhluna/lexiapp/deployments?sha=<commit>"` devuelve una lista
  vacía para el commit fusionado.
- **Opción 1 (panel):** Vercel › Deployments › menú **⋯** › **Create Deployment** con `master`.
  No uses «Redeploy» sobre la fila de producción actual: repetiría el commit anterior.
- **Opción 2 (Git):** fusiona cualquier PR nuevo; su push a `master` vuelve a avisar a Vercel y
  el despliegue incluye todo lo anterior.

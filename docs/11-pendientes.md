# 11 · Pendientes

Lo que queda por hacer, con lo ya analizado para no repetirlo. Ordenado por prioridad.

## 1. CAPTCHA en el registro (Cloudflare Turnstile)

**Por qué:** cada registro con email envía un correo por Resend (plan gratis: 100 al día y 3.000 al
mes). Un bot podría agotar ese límite y dejar sin correo de confirmación a los usuarios reales.

**Cómo funcionaría:**
- **Turnstile:** el CAPTCHA de Cloudflare, gratis y casi siempre invisible (no hay que resolver
  imágenes). Entrega un token que demuestra que hay una persona en un navegador real.
- **Supabase lo verifica en su servidor:** se activa en Authentication › Attack Protection › Enable
  CAPTCHA (proveedor Turnstile), con la **clave secreta**. Desde entonces exige el token en
  registro, entrada con contraseña, cambio de contraseña y reenvío de la confirmación.
  «Continuar con Google» no lo necesita.

**Qué tocar:**
- Crear el widget en Cloudflare › Turnstile con los hostnames `lexiapp.app` y `localhost`.
  La **clave de sitio** es pública; la **secreta** solo va en Supabase.
- `packages/core/src/services/auth.ts`: parámetro `captchaToken` en `signUp`,
  `signInWithPassword`, `sendPasswordReset` y `resendConfirmation` (opción
  `options.captchaToken` de supabase-js). Actualizar `FakeAuth` (`testing/fakes.ts`).
- Web: widget en `apps/web/src/features/account/sign-in-view.tsx`, cargado desde
  `https://challenges.cloudflare.com/turnstile/v0/api.js`; variable
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en Vercel y `.env.local`. Sin la variable, sin widget.
- Pruebas: claves de prueba de Cloudflare (siempre aceptan) y token simulado en `FakeAuth`.

**Privacidad:** Turnstile procesa datos técnicos del navegador (IP y señales del dispositivo).
Añadir Cloudflare a «Quién más interviene» en `/privacidad` y actualizar la fecha.

**Orden para no romper nada:**
1. Código en la web que obtiene y envía el token (Supabase aún no lo exige, así que no cambia
   nada para los usuarios).
2. Política de privacidad actualizada.
3. Activar el CAPTCHA en Supabase y probar registro, entrada y cambio de contraseña.

## 2. Antes de anunciar Lexi

- [x] **Sugerencias y errores** (2026-10-23): Ajustes › Sugerencias (correo a `hola@lexiapp.app` o
      GitHub) y, en la ficha de cada palabra y en la práctica, «¿Ves un error en esta palabra?
      Avísanos», con un correo ya rellenado (`apps/web/src/lib/feedback.ts`).
- [ ] **Revisión humana de las 330 transcripciones fonéticas** (pasan las comprobaciones
      automáticas, pero las escribió una IA).
- [ ] **Probar en iPhone (Safari) y Firefox**: la voz en inglés cambia según el navegador.
- [ ] **Vercel › Domains**: `lexiapp-es.vercel.app` → redirigir a `lexiapp.app`; añadir
      `www.lexiapp.app` con redirección (CNAME en Cloudflare con la nube gris).
- [ ] **Borrar las cuentas de prueba** en Supabase › Users.

## 3. Limpieza tras retirar la app móvil

La app móvil (Expo) se retiró el 2026-10-21; su código está en la etiqueta `movil-final`.

- [ ] **Supabase › Authentication › URL Configuration:** quitar las Redirect URLs `lexi://**` y
      `exp://**`.
- [ ] **Expo (expo.dev):** borrar el proyecto de EAS si ya no se va a usar (no tiene coste).
- [ ] **Desinstalar el APK de prueba:** dejará de sincronizar bien si cambia el formato.

## 4. Opcional

- [ ] **Condiciones de uso** (`/condiciones`): no son obligatorias para una app gratuita, pero dan
      seguridad jurídica y Google las muestra en su pantalla de acceso.
- [ ] **Avisos de errores** (p. ej. Sentry, plan gratuito); habría que mencionarlo en la política
      de privacidad.
- [ ] **Dominio propio para Supabase** (`auth.lexiapp.app`, plan Pro): quitaría el dominio de
      Supabase de la pantalla de consentimiento de Google.
- [ ] **Celebración tranquila** con «reducir movimiento» (un destello sin movimiento en lugar de
      nada).
- [ ] **Repetición espaciada** (la antigua Fase 2) y objetivo diario con logros.

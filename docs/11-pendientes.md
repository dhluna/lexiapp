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

**Riesgo: la app móvil.** Al activarlo en Supabase, cualquier cliente que no envíe el token deja de
poder registrarse o entrar con contraseña, **incluido el APK ya instalado** (Google seguiría
funcionando). Opciones, sin decidir:
- **Turnstile también en el móvil** mediante `react-native-webview` (incluido en Expo Go), cargando
  el widget con `baseUrl` `https://lexiapp.app`. Recomendada.
- **Solo Google en el móvil**: quitar el formulario de email de la app y dejar el registro con
  email para la web.

**Privacidad:** Turnstile procesa datos técnicos del navegador (IP y señales del dispositivo).
Añadir Cloudflare a «Quién más interviene» en `/privacidad` y actualizar la fecha.

**Orden para no romper nada:**
1. Código en web y móvil que obtiene y envía el token (Supabase aún no lo exige, así que no
   cambia nada para los usuarios).
2. Política de privacidad actualizada.
3. APK nuevo instalado.
4. Activar el CAPTCHA en Supabase y probar registro, entrada y cambio de contraseña en web y móvil.

## 2. Antes de anunciar Lexi

- [ ] **Enlace de sugerencias** en Ajustes: «¿Sugerencias? Escríbenos» a `hola@lexiapp.app`.
- [ ] **Revisión humana de las 330 transcripciones fonéticas** (pasan las comprobaciones
      automáticas, pero las escribió una IA).
- [ ] **Probar en iPhone (Safari) y Firefox**: la voz en inglés cambia según el navegador.
- [ ] **Vercel › Domains**: `lexiapp-es.vercel.app` → redirigir a `lexiapp.app`; añadir
      `www.lexiapp.app` con redirección (CNAME en Cloudflare con la nube gris).
- [ ] **Borrar las cuentas de prueba** en Supabase › Users.

## 3. App móvil

- [ ] **APK nuevo** con el icono nuevo y los últimos cambios (mensaje de cuenta existente,
      enlace de privacidad): `npx eas-cli@latest build --profile preview --platform android`.
- [ ] **Google Play**: cuenta de desarrollador (25 USD), prueba cerrada con al menos 12 testers
      durante 14 días, ficha (textos, capturas, icono 512×512 en `brand/`), formulario de
      seguridad de los datos y AAB con el perfil `production`. Ver la conversación de lanzamiento
      resumida en `docs/05-despliegue.md` y `docs/07-movil-pruebas.md`.
- [ ] **iOS / TestFlight**: cuenta de Apple Developer e «Iniciar sesión con Apple» (obligatorio en
      la App Store si se ofrece Google).

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

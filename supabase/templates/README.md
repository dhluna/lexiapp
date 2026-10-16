# Plantillas de correo (Supabase Auth)

Se pegan en Supabase › **Authentication › Emails › Templates**. Los correos salen por Resend
(SMTP propio, remitente `Lexi <no-responder@lexiapp.app>`, ver `docs/05-despliegue.md`).

| Plantilla de Supabase | Asunto | Archivo |
| --- | --- | --- |
| Confirm signup | `Confirma tu cuenta de Lexi` | `confirmar-cuenta.html` |
| Reset Password | `Cambia tu contraseña de Lexi` | `restablecer-contrasena.html` |

- Los enlaces usan `{{ .SiteURL }}` + `token_hash={{ .TokenHash }}` (no `{{ .ConfirmationURL }}`):
  la web verifica ese código de un solo uso, así que el enlace funciona en **cualquier navegador o
  dispositivo**. Con `ConfirmationURL` (flujo PKCE) solo funcionaría en el navegador donde se pidió
  el correo. Requiere que la **Site URL** de Supabase sea `https://lexiapp.app`.
  - Confirmar cuenta → `/auth/callback?token_hash=…&type=email`.
  - Cambiar contraseña → `/restablecer-contrasena?token_hash=…&type=recovery`.
  - Desde la app móvil, el enlace abre la web; después se entra en la app con la contraseña.
- No muestran el email (Gmail lo convertiría en enlace).
- Fondo blanco, tarjeta con borde, estilos en línea y tablas, para que se vean bien en Gmail (también con tema oscuro), Outlook y Apple Mail; sin imágenes,
  así no dependen de que el cliente las cargue.
- Lexi no usa enlace mágico ni cambio de email, así que esas plantillas no hace falta tocarlas.

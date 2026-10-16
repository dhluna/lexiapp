# Plantillas de correo (Supabase Auth)

Se pegan en Supabase › **Authentication › Emails › Templates**. Los correos salen por Resend
(SMTP propio, remitente `Lexi <no-responder@lexiapp.app>`, ver `docs/05-despliegue.md`).

| Plantilla de Supabase | Asunto | Archivo |
| --- | --- | --- |
| Confirm signup | `Confirma tu cuenta de Lexi` | `confirmar-cuenta.html` |
| Reset Password | `Cambia tu contraseña de Lexi` | `restablecer-contrasena.html` |

- Usan `{{ .ConfirmationURL }}` y `{{ .Email }}`. El enlace ya lleva la vuelta a la web
  (`/auth/callback`) o a la app (`lexi://`), según desde dónde se pidió.
- Estilos en línea y tablas, para que se vean bien en Gmail, Outlook y Apple Mail; sin imágenes,
  así no dependen de que el cliente las cargue.
- Lexi no usa enlace mágico ni cambio de email, así que esas plantillas no hace falta tocarlas.

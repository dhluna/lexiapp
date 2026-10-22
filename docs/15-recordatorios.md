# 15 · Recordatorio diario (notificaciones push)

Estado: **implementado**. Necesita configuración (claves y tarea programada) para funcionar.

## Objetivo

Que Lexi avise cada día de que toca practicar, a la hora que cada persona elija, como una app
instalada. Solo con cuenta: el servidor necesita los días de práctica para no avisar a quien ya
practicó ese día y para mencionar la racha.

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-63 | Ajustes › **Recordatorio** aparece solo con la sesión iniciada (y con el recordatorio configurado en el despliegue). |
| RF-64 | Interruptor «Recordatorio diario» y selector de **hora**: cada media hora de 07:00 a 23:00, por defecto 20:00. Es por dispositivo: cada móvil u ordenador tiene su propio permiso y su hora. |
| RF-65 | Al activarlo se pide el permiso de notificaciones. Si se rechaza, Ajustes explica que están bloqueadas y cómo permitirlas. |
| RF-66 | En iPhone y iPad, si Lexi no está en la pantalla de inicio, se explica cómo añadirla (las notificaciones solo funcionan así, desde iOS 16.4). En navegadores sin soporte, se indica. |
| RF-67 | Se avisa como mucho una vez al día, a partir de la hora elegida y durante las 2 horas siguientes (si una ejecución se pierde, se recupera; nunca de madrugada). |
| RF-68 | No se avisa si ese día (en la zona horaria del dispositivo) ya se practicó. |
| RF-69 | Texto: con racha, «🔥 Llevas N días de racha · Practica hoy para no perderla. Son 5 minutos.»; sin racha, «¿5 minutos de inglés? · Tus palabras te esperan en Lexi.». Al tocarlo se abre `/practicar`. |
| RF-70 | Cerrar sesión o eliminar la cuenta desactiva el recordatorio del dispositivo. Otra cuenta en el mismo navegador empieza con él desactivado. |

## Diseño

```
Navegador                          Supabase                         Vercel
─────────                          ────────                         ──────
Ajustes › Recordatorio
  ReminderService.enable(hora)
    PushPlatform.subscribe ──────► (permiso + suscripción del navegador)
    register_reminder(...)  ─────► reminder_devices
                                   pg_cron cada 15 min
                                     pg_net POST ─────────────────► /api/recordatorios
                                                                     sendDueReminders
                                   ◄── reminder_devices, practice_days (clave secreta)
public/sw.js ◄────────────── servicio de push del navegador ◄────── web-push (VAPID)
  muestra el aviso; al tocarlo abre /practicar
```

- **`packages/core/src/domain/reminders.ts`** (puro): `reminderDueDay` (ventana de 2 h, un aviso al
  día, por zona horaria) y `reminderMessage` (con `calculateStreak`).
- **`services/reminder-service.ts`**: estado del dispositivo (`on`, `off`, `blocked`,
  `needs-install`, `unsupported`). Guarda en `lexi:reminder` de quién es y a qué hora; no forma
  parte del estado sincronizado, así que no hay migración del formato guardado.
  `SyncService` llama a `forgetDevice` (opción `beforeSignOut`) antes de cerrar sesión o eliminar
  la cuenta.
- **Contrato `PushPlatform`** (`platform.ts`), con su adaptador web en
  `apps/web/src/platform/push.ts`, y el service worker `apps/web/public/sw.js` (solo muestra
  avisos; no hay caché offline).
- **`supabase/migrations/0003_reminders.sql`**: tabla `reminder_devices` (una fila por
  suscripción, con RLS) y `register_reminder`. Si el endpoint estaba a nombre de otra cuenta (otra
  sesión en el mismo navegador), pasa a la cuenta actual. Máximo 10 dispositivos por cuenta.
- **Envío**: `apps/web/src/app/api/recordatorios/route.ts` (fina) y `apps/web/src/server/reminders.ts`.
  Solo acepta `POST` con `Authorization: Bearer <REMINDERS_SECRET>`. Es el único código con la
  **clave secreta de Supabase**, que solo existe en Vercel y nunca llega al navegador
  (`import "server-only"`). Si el servicio de push responde 404/410, borra la suscripción.
  Sin configuración responde 503 y el resto de Lexi funciona igual.
- **Por qué pg_cron y no Vercel Cron**: el plan gratuito de Vercel solo ejecuta un cron al día.

## Configuración (una vez)

1. **Base de datos**: en Supabase › SQL Editor, ejecuta
   [`supabase/migrations/0003_reminders.sql`](../supabase/migrations/0003_reminders.sql).
2. **Claves**: en la raíz del repo, `npm run vapid`. Crea `.env.push.local` (ignorado por git) con
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `REMINDERS_SECRET`. No los pegues en
   ningún chat. **No regeneres las claves después**: las suscripciones existentes dejarían de
   funcionar.
3. **Vercel** › Settings › Environment Variables (Production): las tres variables anteriores y
   `SUPABASE_SECRET_KEY` (Supabase › Project Settings › API Keys › **Secret keys**; también vale la
   antigua `service_role`). Después, vuelve a desplegar.
4. **Tarea programada en Supabase**:
   - Database › Extensions: activa **pg_cron** y **pg_net**.
   - Integrations › Vault (o SQL): guarda el valor de `REMINDERS_SECRET` con el nombre
     `reminders_secret`:
     ```sql
     select vault.create_secret('<valor de REMINDERS_SECRET>', 'reminders_secret');
     ```
   - Programa la llamada cada 15 minutos:
     ```sql
     select cron.schedule(
       'lexi-recordatorios',
       '*/15 * * * *',
       $$
       select net.http_post(
         url := 'https://lexiapp.app/api/recordatorios',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_secret')
         ),
         body := '{}'::jsonb,
         timeout_milliseconds := 30000
       );
       $$
     );
     ```
   - Comprueba las ejecuciones en Integrations › Cron (o `select * from net._http_response order by created desc limit 5;`):
     deben responder 200 con un resumen `{"due":…,"sent":…}`.
5. **Local** (opcional): copia `NEXT_PUBLIC_VAPID_PUBLIC_KEY` a `.env.local` para ver el ajuste en
   `localhost` (los avisos solo los envía producción).

## Probarlo

1. En el móvil, abre lexiapp.app (en iPhone, desde el icono de la pantalla de inicio), inicia
   sesión y activa el recordatorio con una hora que esté a menos de 15 minutos.
2. No practiques ese día: el aviso llega en la siguiente ejecución de la tarea. Al tocarlo se abre
   la práctica.

## Límites

- iPhone/iPad: solo desde iOS 16.4 y con Lexi en la pantalla de inicio.
- El aviso llega en un margen de hasta 15 minutos tras la hora elegida (frecuencia de la tarea).
- Si alguien practica en un dispositivo que todavía no ha sincronizado, puede recibir el aviso.
- Si el navegador borra la suscripción (por ejemplo, al borrar los datos del sitio), Ajustes lo
  muestra desactivado; el servidor borra la fila cuando el servicio de push la rechaza.

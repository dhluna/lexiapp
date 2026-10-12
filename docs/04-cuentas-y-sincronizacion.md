# 04 · Fase 3: cuentas y sincronización

Estado: **implementado** en la rama `fase-3`. Configuración externa: [05 · Despliegue](05-despliegue.md).

## Objetivo

Que un usuario tenga el mismo progreso (palabras, racha, sesiones y ajustes) en todos sus
dispositivos, sin perder lo que ya hace hoy: practicar sin cuenta y sin conexión.

Decisiones tomadas:

| Tema | Decisión |
| --- | --- |
| Servidor y base de datos | Supabase (Postgres + Auth + RLS) |
| Inicio de sesión | Google y email con contraseña |
| Cuenta | Opcional: sin cuenta todo funciona como en la Fase 1 |
| Despliegue | Vercel |

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-16 | Crear cuenta con email y contraseña (mínimo 8 caracteres), con confirmación por correo. |
| RF-17 | Iniciar sesión con email y contraseña o con Google. |
| RF-18 | Recuperar la contraseña con un enlace por correo y fijar una nueva. |
| RF-19 | Al iniciar sesión, el progreso local sin dueño se fusiona con el de la cuenta; nada se pierde. |
| RF-20 | Sincronizar automáticamente entre dispositivos, también tras practicar sin conexión. |
| RF-21 | Ver el estado de la sincronización y forzarla («Sincronizar ahora»). |
| RF-22 | Cerrar sesión (borra el progreso de este dispositivo; queda en la cuenta) y eliminar la cuenta con todos sus datos, con confirmación. |

## Principios

1. **Local primero.** La interfaz siempre lee de LocalStorage. La red nunca bloquea practicar.
2. **Todo en el cliente.** Autenticación y datos con `@supabase/supabase-js` desde el navegador.
   La seguridad la impone Postgres con RLS; las páginas siguen siendo estáticas y no hace falta
   `proxy.ts` ni leer `cookies()` en el servidor (que con `cacheComponents` exigiría
   `Suspense` en cada página con sesión).
3. **Sin Supabase configurado, la app es la de la Fase 1.** Si faltan las variables de entorno,
   la sección «Cuenta» no aparece. Las pruebas no dependen del servicio.
4. **Fusión determinista y sin pérdidas silenciosas.** Mismo resultado en cualquier orden y
   aunque se repita.

## Flujos

### Crear cuenta (email)

```
Ajustes › Cuenta › «Iniciar sesión» → /entrar › pestaña «Crear cuenta»
  email + contraseña → «Revisa tu correo para confirmar la cuenta»
  enlace del correo → /auth/callback → sesión iniciada → fusión + sincronización → vuelve a Ajustes
```

### Iniciar sesión

```
/entrar › «Continuar con Google»  → Google → /auth/callback → sesión
/entrar › email + contraseña      → sesión
después: fusión del progreso local + primera sincronización
```

### Recuperar contraseña

```
/entrar › «¿Olvidaste tu contraseña?» → email → «Te enviamos un enlace»
enlace → /restablecer-contrasena → nueva contraseña → sesión iniciada
```

### Cerrar sesión

Se sincroniza una última vez (si hay conexión), se cierra la sesión y se borra el progreso
local. Aviso: «Tu progreso sigue guardado en tu cuenta». Sin conexión, se avisa de que los
cambios no sincronizados se perderán y se pide confirmación.

### Eliminar cuenta

Confirmación explícita («Eliminar mi cuenta y todo mi progreso»). Borra el usuario y, en
cascada, todas sus filas. Después se comporta como cerrar sesión.

## Dueño de los datos locales

Clave `lexi:sync` en LocalStorage: `{ ownerId: string | null, lastSyncedAt: string | null }`.

| Situación al iniciar sesión | Qué se hace |
| --- | --- |
| `ownerId` vacío (uso sin cuenta) | Fusionar el progreso local con el de la cuenta y fijar `ownerId`. |
| `ownerId` igual al usuario | Sincronización normal. |
| `ownerId` de otro usuario | Descartar el progreso local (no mezclar cuentas) y descargar el de la cuenta. |

## Modelo de datos local: versión 4

Se añaden tres campos a `UserProgressState` (migración v3 → v4 sin tocar el progreso):

| Campo | Para qué | Valor inicial en la migración |
| --- | --- | --- |
| `removedWords: Record<WordId, string>` | Marca de borrado con fecha al «reiniciar palabra», para que otro dispositivo no la resucite | `{}` |
| `resetAt: string \| null` | Fecha del último «borrar progreso»; lo anterior se descarta al fusionar | `null` |
| `preferencesUpdatedAt: string` | Resolver conflictos de ajustes | `updatedAt` del documento |

Cambios de comportamiento en `ProgressStore`:

- `setWordStatus(id, "new")` elimina la entrada **y** registra `removedWords[id] = ahora`.
  Responder o marcar una palabra después elimina su marca de borrado.
- `resetProgress()` vacía palabras, días y sesiones, y fija `resetAt = ahora`.
- `updatePreferences()` actualiza `preferencesUpdatedAt`.
- `replaceState(state)` (nuevo) aplica el resultado de una fusión. Notifica a la interfaz,
  pero no cuenta como cambio local, para no provocar otra subida.

## Reglas de fusión (`mergeStates(local, remote)`)

Función pura en `src/domain/merge.ts`. Sea `resetAt = max(local.resetAt, remote.resetAt)`.

| Dato | Regla |
| --- | --- |
| Palabras | Por id, gana el `updatedAt` más reciente. Si hay marca de borrado más reciente que la entrada, la palabra queda eliminada. Se descartan entradas con `updatedAt ≤ resetAt`. |
| Marcas de borrado | Por id, la fecha más reciente. Se descartan las que ya no tapan ninguna entrada y son anteriores a `resetAt`. |
| Días de práctica | Unión, sin repetidos y ordenada. Se descartan los días anteriores al día de `resetAt`. |
| Sesiones | Unión por `id`. Se descartan las completadas antes de `resetAt`. Máximo 365 (las más recientes). |
| Preferencias | Gana el `preferencesUpdatedAt` más reciente (en bloque). |
| `updatedAt` | El máximo de los dos. |

Empates (misma fecha en ambos lados): gana el valor «mayor» según una comparación fija del
contenido (p. ej. `learned` antes que `review`; en preferencias, la serialización JSON
ordenada). Así el resultado no depende de qué lado sea el local.

Propiedades que deben cumplir las pruebas:
- **Idempotente:** `merge(a, merge(a, b)) = merge(a, b)`.
- **Conmutativa** en el resultado: `merge(a, b) = merge(b, a)`.
- **Sin pérdidas:** nada que exista en uno de los lados desaparece salvo por una marca de
  borrado o un `resetAt` posteriores.

Limitación conocida: las fechas vienen del reloj de cada dispositivo. Si un reloj está muy
desajustado, un cambio antiguo podría ganar a uno nuevo. Es aceptable para progreso personal.

## Modelo de datos remoto (Postgres)

Migración `supabase/migrations/0001_lexi_sync.sql`. Todas las tablas llevan
`user_id uuid not null references auth.users on delete cascade` y **RLS activado**, con una
política para `select`, `insert`, `update` y `delete` limitada a `auth.uid() = user_id`.

| Tabla | Columnas | Clave |
| --- | --- | --- |
| `word_progress` | `word_id text`, `status text` (`review`/`learned`), `times_seen`, `times_learned`, `times_review int`, `first_seen_at`, `last_reviewed_at`, `updated_at timestamptz`, `deleted boolean` | `(user_id, word_id)` |
| `practice_days` | `day date` | `(user_id, day)` |
| `practice_sessions` | `id text`, `started_at`, `completed_at timestamptz`, `day date`, `category_id text null`, `total`, `learned`, `review int` | `(user_id, id)` |
| `user_settings` | `session_size int`, `speech_rate real`, `auto_pronounce boolean`, `preferences_updated_at timestamptz`, `reset_at timestamptz null` | `user_id` |

`word_progress.deleted = true` representa una marca de borrado (sustituye a `removedWords`).

### Funciones

**`sync_push(payload jsonb)`** (`security invoker`, por tanto sujeta a RLS). Aplica en una sola
transacción el estado ya fusionado por el cliente:
- `user_settings`: upsert; las preferencias solo si `preferences_updated_at` es más reciente;
  `reset_at` se queda con el mayor.
- Si `reset_at` avanza: borra días, sesiones y palabras anteriores a esa fecha.
- `word_progress`: upsert con `on conflict (user_id, word_id) do update … where
  word_progress.updated_at < excluded.updated_at`. Así, si otro dispositivo subió algo más
  nuevo entre la descarga y la subida, no se pisa (la siguiente sincronización lo traerá).
- `practice_days` y `practice_sessions`: `insert … on conflict do nothing`.

**`delete_my_account()`** (`security definer`, `search_path` fijo): `delete from auth.users where
id = auth.uid()`. El borrado en cascada elimina sus filas. Solo puede borrar a quien la llama.

**Descarga:** cuatro `select` simples (RLS filtra por usuario). Con 88 palabras y hasta 365
sesiones el volumen es pequeño, así que siempre se descarga todo; no hay sincronización
incremental.

## Sincronización (`SyncService`)

```
        ┌──────── disparadores ─────────┐
        │ inicio de sesión              │
        │ cambio local (espera de 3 s)  │
        │ evento online                 │──► sync():  pull ─► mergeStates ─► store.replaceState ─► sync_push
        │ volver a la pestaña           │
        │ cada 5 min                    │
        │ «Sincronizar ahora»           │
        └───────────────────────────────┘
```

- Una sola sincronización a la vez; si llega otro disparador, se encola una más.
- Errores de red: reintento con espera creciente (5 s, 15 s, 60 s, luego cada 5 min).
- Sesión caducada o RLS rechazada: estado `error` con mensaje «Vuelve a iniciar sesión».

Estados expuestos a la interfaz:

| Estado | Texto en Ajustes |
| --- | --- |
| `idle` | «Sincronizado hace 2 min» |
| `syncing` | «Sincronizando…» |
| `offline` | «Sin conexión: se sincronizará al volver» |
| `error` | «No se pudo sincronizar» + motivo + «Reintentar» |

## Arquitectura

```
src/
├── lib/supabase.ts                 Cliente único del navegador (null sin variables de entorno)
├── domain/merge.ts                 mergeStates, puro
├── persistence/remote-progress.ts  RemoteProgressSource + SupabaseRemoteProgress (filas ⇄ dominio)
├── services/auth.ts                AuthService: Supabase Auth + errores en español
├── services/sync-service.ts        SyncService: disparadores, cola, reintentos, estado
├── hooks/use-auth.ts               useAuth, useSyncStatus (useSyncExternalStore)
├── features/account/               Formularios de inicio de sesión, registro y contraseña
└── app/entrar · app/auth/callback · app/restablecer-contrasena
```

Contratos (independientes de React):

```ts
interface RemoteProgressSource {
  pull(): Promise<UserProgressState>;
  push(state: UserProgressState): Promise<void>;
}

interface AuthSnapshot {
  status: "loading" | "signed-out" | "signed-in";
  user: { id: string; email: string | null; provider: "google" | "email" } | null;
}
```

`ServicesProvider` acepta también `auth` y `sync`, para inyectar versiones falsas en pruebas.

## Interfaz

### Ajustes › Cuenta (primer grupo)

```
Sin sesión                                Con sesión
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│ Cuenta                           │      │ Cuenta                           │
│ Guarda tu progreso y úsalo en    │      │ diego@ejemplo.com                │
│ todos tus dispositivos.          │      │ ✓ Sincronizado hace 2 min        │
│ [ Iniciar sesión ]               │      │ [ Sincronizar ahora ]            │
└──────────────────────────────────┘      │ Cerrar sesión                    │
                                          │ Eliminar cuenta                  │
                                          └──────────────────────────────────┘
```

### /entrar

```
┌──────────────────────────────────┐
│ Entra en Lexi                    │
│ [ G  Continuar con Google ]      │
│ ─────────── o ───────────        │
│ ( Iniciar sesión | Crear cuenta )│
│ Email      [________________]    │
│ Contraseña [________________]    │
│ [ Iniciar sesión ]               │
│ ¿Olvidaste tu contraseña?        │
│ Puedes seguir sin cuenta.        │
└──────────────────────────────────┘
```

- Mismo estilo que la Fase 1: tarjetas `bg-surface`, botón principal índigo, 44 px de alto
  mínimo, foco visible, `autocomplete` correcto (`email`, `current-password`, `new-password`).
- El ⚙ de la cabecera muestra un punto solo si la sincronización está en `error`.

### Mensajes de error (en español, sin culpar al usuario)

| Caso | Mensaje |
| --- | --- |
| Credenciales incorrectas | «El email o la contraseña no son correctos.» |
| Email sin confirmar | «Confirma tu email con el enlace que te enviamos.» + «Reenviar» |
| Email ya registrado | «Ya hay una cuenta con este email. Inicia sesión.» |
| Contraseña corta | «La contraseña necesita al menos 8 caracteres.» |
| Demasiados intentos | «Demasiados intentos. Espera un momento y vuelve a probar.» |
| Sin conexión | «No hay conexión. Inténtalo cuando vuelvas a estar en línea.» |

## Seguridad

- Solo la clave pública (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) llega al cliente. La clave
  `service_role` no se usa en la app.
- RLS en todas las tablas. `sync_push` es `security invoker`, así que también respeta RLS.
- `delete_my_account` es la única función `security definer`, con `search_path` fijo y
  limitada a `auth.uid()`.
- Flujo PKCE para Google y para los enlaces de correo. Las URL de redirección permitidas se
  limitan en Supabase a localhost y al dominio de Vercel.
- Contraseñas: mínimo 8 caracteres y protección de Supabase contra contraseñas filtradas.

## Configuración externa (la hace el usuario)

No puedo crear cuentas ni introducir credenciales, así que la configuración será manual. Al
implementar se documentará paso a paso en `docs/05-despliegue.md`:
1. Proyecto en Supabase y aplicar la migración SQL.
2. Cliente OAuth en Google Cloud, conectado al proveedor de Google de Supabase.
3. URL del sitio y URL de redirección en Supabase Auth; confirmación de email activada.
4. Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en
   `.env.local` y en Vercel (se incluirá un `.env.example` sin valores).

## Criterios de aceptación

1. Sin variables de Supabase, la app funciona igual que en la Fase 1 y pasan sus pruebas.
2. Registro, confirmación por correo, inicio de sesión con email y con Google, y recuperación
   de contraseña funcionan contra un proyecto real.
3. Practicar sin cuenta y después iniciar sesión conserva todo el progreso local en la cuenta.
4. Dos navegadores con la misma cuenta ven el mismo progreso tras sincronizar; reiniciar una
   palabra en uno no la hace reaparecer; practicar sin conexión se fusiona al reconectar.
5. Un usuario no puede leer ni escribir datos de otro (comprobado con dos cuentas).
6. Eliminar la cuenta borra todas sus filas.
7. `mergeStates` pasa las pruebas de idempotencia, conmutatividad y no pérdida.

## Fuera de alcance

- Sincronización en tiempo real (cambios que aparecen al instante en otro dispositivo
  abierto); basta con sincronizar al volver a la pestaña.
- Compartir progreso, perfiles públicos, modo profesor o clases.
- Otros proveedores de inicio de sesión (Apple, Microsoft) y enlace mágico.
- Panel de administración.

# 02 · Arquitectura y decisiones

## Capas

```
src/
├── domain/        Modelos y reglas de negocio puras (sin React, sin navegador)
├── data/          Catálogo inicial de palabras (datos estáticos tipados)
├── persistence/   Contratos de repositorio + implementación LocalStorage + migraciones
├── services/      Servicios de aplicación: ProgressStore (casos de uso), SpeechService
├── features/      UI por funcionalidad: home, practice, vocabulary, progress, settings
├── components/    UI reutilizable (ui/) y estructura (layout/)
├── hooks/         Adaptadores React → servicios (useProgress, useSpeech)
└── app/           Rutas de Next.js (finas: solo componen features)
```

Dirección de dependencias: `app → features → hooks/components → services → domain/persistence → domain`.
`domain` no importa nada del resto. `data` solo importa tipos de `domain`.

## Decisiones (ADR resumidas)

**ADR-1 · Next.js 16 (App Router) + TypeScript estricto + Tailwind 4.**
Stack propuesto, sin cambios. Las rutas se prerenderizan de forma estática
(las fichas usan `generateStaticParams`) y el estado del usuario se hidrata en el cliente.

**ADR-2 · shadcn/ui no se instala en la Fase 1.**
Solo se necesitan botón, barra de progreso, insignia y estado vacío: componentes
de pocas líneas. Instalar el CLI añadiría Radix y archivos generados sin aportar valor
todavía. Los componentes de `components/ui` siguen sus convenciones (`cn()` con
`clsx` + `tailwind-merge`, variantes por props), así que shadcn puede incorporarse
después (diálogos, menús) sin reescribir nada.

**ADR-3 · Repositorio como contrato (`ProgressRepository`).**
`load(): UserProgressState` y `save(state)`. La implementación actual es
`LocalStorageProgressRepository` sobre un `KeyValueStorage` abstracto (con adaptador en
memoria para pruebas y como fallback). Una API remota futura implementará el mismo
contrato (versión asíncrona prevista en el documento de datos).

**ADR-4 · `ProgressStore` como fachada de casos de uso, independiente de React.**
Expone `getState`, `subscribe`, `recordAnswer`, `setWordStatus`, `completeSession`,
`updatePreferences`. React lo consume con `useSyncExternalStore`; otro cliente podría
reutilizarlo con su propio `KeyValueStorage`.

**ADR-5 · Hidratación sin parpadeos incorrectos.**
El servidor no conoce LocalStorage: `getServerSnapshot` devuelve `null` y las vistas
muestran un esqueleto hasta montar en el cliente. Se evitan desajustes de hidratación y
números falsos.

**ADR-6 · Ids estables legibles** (`travel-luggage`, `business-deadline`). El progreso se
guarda por id, separado del catálogo: editar o ampliar el catálogo nunca sobrescribe el
progreso, y los ids huérfanos se ignoran en las estadísticas sin borrarse.

**ADR-7 · Fechas como claves locales `YYYY-MM-DD`.** La racha se calcula sobre claves de
día, con aritmética en UTC sobre esas claves para evitar errores por cambio de horario.
El reloj se inyecta (`now: () => Date`) para poder probarlo.

**ADR-8 · Síntesis de voz detrás de `SpeechService`.** Detecta soporte, espera
`voiceschanged`, elige primero voces de alta calidad (Google, «Natural»/«Online» de Edge,
«Premium» de Apple), luego `en-US` → `en-GB` → cualquier `en-*`. Velocidad 1 por defecto
(otras velocidades se remuestrean y pueden sonar granuladas) y solo llama a `cancel()` si
algo está sonando (cancelar un motor inactivo puede producir chasquidos). Si no hay voz en
inglés lo avisa en la interfaz, y si no hay voces en
inglés habla igualmente con `lang = "en-US"`. Nunca lanza excepciones a la UI. El
servicio guarda qué texto suena ahora (`speakingText`) para que la reproducción
automática y los botones compartan estado. Los navegadores solo permiten voz tras una
interacción del usuario; en la práctica siempre la hay (pulsar «Empezar» o responder), y
si se bloquea, falla en silencio y el botón sigue disponible.

**ADR-9 · Sesión de práctica como máquina de estados pura** (`domain/session.ts`):
`createSession`, `answerCurrent`, `goNext`, `goPrevious`, `summarize` (sin paso de «revelar»: el significado se muestra siempre). La UI solo la dibuja.
Cada respuesta se persiste en el momento (RF-07); el estado de la sesión en curso no se
persiste (abandonar = salir, sin perder lo confirmado).

## Decisiones de la Fase 3 (ver `docs/04-cuentas-y-sincronizacion.md`)

**ADR-10 · Supabase con autenticación y datos solo en el cliente.** `@supabase/supabase-js`
desde el navegador y seguridad con RLS en Postgres. Las páginas siguen siendo estáticas: sin
`proxy.ts` ni lectura de `cookies()` en el servidor, que con `cacheComponents` obligaría a
envolver en `Suspense` toda página con sesión.

**ADR-11 · Local primero con sincronización por fusión.** La interfaz sigue leyendo
LocalStorage; `SyncService` descarga, fusiona con `mergeStates` (función pura) y sube con la
función `sync_push`, que solo acepta cambios más recientes. Se descarta la sincronización en
tiempo real y la incremental: los volúmenes por usuario son pequeños.

**ADR-12 · Borrados explícitos (datos v4).** Reiniciar una palabra deja una marca con fecha y
«borrar progreso» fija `resetAt`, para que otro dispositivo no resucite datos borrados.

## Núcleo y web

**ADR-13 · Monorepo con npm workspaces.** `packages/core` (`@lexi/core`) contiene el dominio,
el catálogo, la persistencia y los servicios; `apps/web` lo consume como código TypeScript
(Turbopack lo compila). Se importa por ruta (`@lexi/core/domain/merge`) en lugar de un índice
único, para cargar solo lo que se usa.

**ADR-14 · Contratos de plataforma (puertos y adaptadores).** El núcleo se compila sin
`lib: dom` y sus pruebas corren en Node. Lo que depende de la plataforma entra por contratos
(`platform.ts`): `KeyValueStorage`, `SpeechEngine`, `AudioClipPlayer`, `SyncTriggers` y
`AuthPlatform`. La lógica (elegir voz, fusionar, reintentar, completar el inicio de sesión) se
queda en el núcleo; la web aporta solo el adaptador mínimo (`apps/web/src/platform/`).

**ADR-15 · Solo web (2026-10-21).** Hubo una app móvil con Expo (Android e iOS) que compartía
el núcleo. Se retiró para centrar el proyecto en la web: su código está en la etiqueta de git
`movil-final`. Si vuelve, será en un repositorio aparte que reutilice `@lexi/core` (por ejemplo,
publicado como paquete) y el mismo backend; por eso el núcleo sigue sin depender de la web.

*ADR-16 (inicio de sesión con Google en el móvil) se retiró junto con la app móvil.*

**ADR-17 · Recordatorio diario desde el servidor (2026-10-22).** Las notificaciones programadas
desde el propio navegador no son fiables (las APIs que lo permitían se abandonaron), así que el
aviso lo envía el servidor con Web Push: Supabase `pg_cron` llama cada 15 minutos a
`/api/recordatorios` (Vercel), que decide con `domain/reminders.ts` y los días de práctica. Es
la única pieza con la clave secreta de Supabase, y vive solo en `apps/web/src/server/`
(`server-only`); el navegador sigue usando la clave pública y RLS. Solo con cuenta. El ajuste es
por dispositivo y no entra en el estado sincronizado. Detalle en `docs/15-recordatorios.md`.

## Decisiones de los paquetes (ver `docs/08-paquetes.md`)

**ADR-17 · Paquetes incluidos en la app.** El catálogo sigue siendo código (`data/words`,
un archivo por paquete) y no hay descargas: funciona sin conexión y las pruebas validan todo
el contenido. Lo que cambia por usuario es qué paquetes están activos, que se guarda en las
preferencias (formato v5) y se sincroniza con ellas. `getActiveWords(state)` es la única
puerta de la práctica y de las estadísticas; Vocabulario sigue usando `WORDS` completo.

**ADR-18 · Celebración con efectos inyectables.** `Celebrator` (núcleo) decide qué celebrar y
en qué orden; la web aporta el confeti y el sonido. El sonido es una partitura en el núcleo
(`CHIME`) que la web sintetiza con Web Audio, así que no hay archivos con licencia. Ver
`docs/09-celebracion.md`.

## Preparación para el futuro (no implementado)

- **Cuentas / BD remota:** `UserProgressState` ya es un documento serializable con
  `version` y `updatedAt`; un `RemoteProgressRepository` puede enviarlo tal cual.
- **Sincronización:** `WordProgress.updatedAt` por palabra permite resolver conflictos
  "último cambio gana" por id.
- **Estadísticas históricas:** `sessions[]` guarda fecha, tamaño y resultado de cada
  sesión completada (limitado a las 365 últimas).
- **Otra app (por ejemplo, nativa):** `domain`, `data`, `persistence` y `services` no
  dependen del DOM; bastaría con aportar sus adaptadores de `platform.ts`.

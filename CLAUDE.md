# Lexi: convenciones de desarrollo

@apps/web/AGENTS.md

Las especificaciones están en `docs/`: léelas antes de cambiar comportamiento y actualízalas
si cambian requisitos, reglas o el formato guardado.

## Comandos

Monorepo con npm workspaces; los comandos de la raíz se ejecutan en todos los paquetes.

- `npm test`: Vitest (una pasada) en `@lexi/core` y en la web. Ejecútalo antes de dar algo
  por terminado.
- `npm run typecheck`, `npm run lint`, `npm run build`: también deben pasar.
- `npm run test:sql`: si cambias `supabase/migrations/`, añade la regla a
  `supabase/tests/10_sync_rules.sql` y ejecútalo (necesita Docker).
- No ejecutes `npm run build` con un servidor de Next en marcha: comparten `.next`.

## Estructura

```
packages/core   @lexi/core: dominio, catálogo, persistencia, servicios y contratos de plataforma
apps/web        Next.js (Fases 1 y 3)
apps/mobile     Expo (Fase 4)
```

- **`@lexi/core` no puede usar React ni APIs del navegador ni nativas.** Se compila sin
  `lib: dom` y sus pruebas corren en Node: cualquier uso de `window` falla. Lo que depende
  de la plataforma entra por los contratos de `packages/core/src/platform.ts`
  (`KeyValueStorage`, `SpeechEngine`, `SyncTriggers`, `AuthPlatform`), y cada app aporta su
  implementación en `src/platform/`.
- Se importa por ruta: `@lexi/core/domain/progress`, `@lexi/core/services/sync-service`…
  Dentro del paquete, los imports son relativos.

## Arquitectura (dependencias en un solo sentido)

`app → features → hooks/components → services → persistence → domain`, y `data` solo importa tipos de `domain`.

- `core/src/domain`: TypeScript puro. Sin `Date.now()` implícito: recibe `now`/`today` como
  parámetros.
- `core/src/persistence`: todo acceso al almacenamiento pasa por `KeyValueStorage` y
  `ProgressRepository`. No llames a `localStorage` desde otro sitio.
- `core/src/services/progress-store.ts`: único punto para modificar el progreso (casos de uso).
- `apps/web/src/services/instances.ts`: raíz de composición en el navegador (núcleo +
  adaptadores web). Los componentes no la importan directamente: usan los hooks de
  `src/hooks`, que permiten inyectar servicios falsos en las pruebas (`ServicesProvider`).
- `apps/web/src/app`: rutas finas que solo componen features.

## Reglas que no se deben romper

- **Ids de palabra estables** (`<categoría>-<término>`). Nunca renombres ni reutilices un id:
  el progreso guardado depende de él. Para retirar una palabra, bórrala del catálogo;
  su progreso se ignora sin borrarse.
- **Cambios en el formato guardado:** sube `CURRENT_VERSION` en `persistence/schema.ts`,
  añade la migración en `MIGRATIONS[versiónAnterior]`, actualiza `sanitizeState` y añade
  una prueba. Nunca sobrescribas datos que no se pueden leer sin hacer copia.
- **Estadísticas solo desde el estado real** (`computeStats`). Nada de números decorativos.
- **Racha:** días locales `YYYY-MM-DD` únicos. Solo cuentan las respuestas dadas en práctica.
- **Sincronización (Fase 3):** nunca borres progreso sin dejar rastro: reiniciar una palabra
  registra `removedWords` y «borrar progreso» fija `resetAt`. Toda fusión pasa por
  `mergeStates` (`packages/core/src/domain/merge.ts`), que debe seguir siendo conmutativa e idempotente.
  Los cambios que vienen de la sincronización se aplican con `store.replaceState`, no con
  métodos que cuenten como cambio local (provocarían subidas en bucle).
- **Cuentas opcionales:** sin `NEXT_PUBLIC_SUPABASE_*` la app debe funcionar como en la
  Fase 1. Nunca uses la clave `service_role` en el cliente; la seguridad la da RLS
  (`supabase/migrations/`).
- **Catálogo:** cada palabra lleva `ipa` (AFI amplio de inglés americano, sin barras, con `ɡ` y
  acento `ˈ`), ≥ 2 ejemplos con traducción; los verbos llevan `verbForms`.
  `packages/core/src/data/catalog.test.ts` lo comprueba.

## Web (Next.js 16)

- `cacheComponents` está activo. Un componente cliente que usa `useSearchParams` debe ir
  dentro de `<Suspense>`, y `await params` también (ver `app/vocabulario/[id]/page.tsx`).
- Los datos del usuario solo existen en el cliente: `useProgress()` devuelve `null` en el
  servidor y durante la hidratación; muestra un `Skeleton` en ese caso.
- Consulta `node_modules/next/dist/docs/` (en la raíz del monorepo) ante cualquier duda de API.

## UI

- Mobile-first. Objetivos táctiles de 44 px como mínimo (`min-h-11`), navegación inferior en móvil.
- Colores solo mediante los tokens de `globals.css` (`bg-surface`, `text-ink-soft`,
  `text-learned`, `text-review`…), con variantes clara y oscura.
- Textos de la interfaz en español, en tono directo y sin mayúsculas sostenidas. Marca el
  inglés con `lang="en"`.
- Accesibilidad: foco visible, `aria-live` para confirmaciones y respeto a `prefers-reduced-motion`.
- Iconos de `lucide-react` con `aria-hidden` cuando acompañan a un texto.

## Pruebas

- Pruebas junto al código (`*.test.ts(x)`). Dominio y servicios con relojes inyectados.
- Componentes web: `renderWithServices` (`apps/web/src/test/render.tsx`) con almacenamiento en memoria
  y voz simulada. Simula una recarga creando un store nuevo sobre el mismo `MemoryStorage`.

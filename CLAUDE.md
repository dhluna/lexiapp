# Lexi: convenciones de desarrollo

@AGENTS.md

Las especificaciones están en `docs/`: léelas antes de cambiar comportamiento y actualízalas
si cambian requisitos, reglas o el formato guardado.

## Comandos

- `npm test`: Vitest (una pasada). Ejecútalo antes de dar algo por terminado.
- `npm run typecheck`, `npm run lint`, `npm run build`: también deben pasar.
- `npm run test:sql`: si cambias `supabase/migrations/`, añade la regla a
  `supabase/tests/10_sync_rules.sql` y ejecútalo (necesita Docker).
- No ejecutes `npm run build` con un servidor de Next en marcha: comparten `.next`.

## Arquitectura (dependencias en un solo sentido)

`app → features → hooks/components → services → persistence → domain`, y `data` solo importa tipos de `domain`.

- `src/domain`: TypeScript puro. Sin React, sin `window`, sin `Date.now()` implícito:
  recibe `now`/`today` como parámetros.
- `src/persistence`: todo acceso a LocalStorage pasa por `KeyValueStorage` y
  `ProgressRepository`. No llames a `localStorage` desde otro sitio.
- `src/services/progress-store.ts`: único punto para modificar el progreso (casos de uso).
- `src/services/instances.ts`: raíz de composición en el navegador. Los componentes no la
  importan directamente: usan los hooks de `src/hooks`, que permiten inyectar servicios
  falsos en las pruebas (`ServicesProvider`).
- `src/app`: rutas finas que solo componen features.

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
  `mergeStates` (`src/domain/merge.ts`), que debe seguir siendo conmutativa e idempotente.
  Los cambios que vienen de la sincronización se aplican con `store.replaceState`, no con
  métodos que cuenten como cambio local (provocarían subidas en bucle).
- **Cuentas opcionales:** sin `NEXT_PUBLIC_SUPABASE_*` la app debe funcionar como en la
  Fase 1. Nunca uses la clave `service_role` en el cliente; la seguridad la da RLS
  (`supabase/migrations/`).
- **Catálogo:** cada palabra lleva `ipa` (AFI amplio de inglés americano, sin barras, con `ɡ` y
  acento `ˈ`), ≥ 2 ejemplos con traducción; los verbos llevan `verbForms`.
  `src/data/catalog.test.ts` lo comprueba.

## Next.js 16

- `cacheComponents` está activo. Un componente cliente que usa `useSearchParams` debe ir
  dentro de `<Suspense>`, y `await params` también (ver `app/vocabulario/[id]/page.tsx`).
- Los datos del usuario solo existen en el cliente: `useProgress()` devuelve `null` en el
  servidor y durante la hidratación; muestra un `Skeleton` en ese caso.
- Consulta `node_modules/next/dist/docs/` ante cualquier duda de API.

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
- Componentes: `renderWithServices` (`src/test/render.tsx`) con almacenamiento en memoria
  y voz simulada. Simula una recarga creando un store nuevo sobre el mismo `MemoryStorage`.

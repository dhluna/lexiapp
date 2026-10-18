# 03 · Datos y persistencia

## Catálogo (`src/data/words`)

Un archivo por paquete (`src/data/packs.ts` define los paquetes). Cada `Word`:

```ts
{
  id: "travel-luggage",            // estable: <paquete>-<término-en-slug>
  term: "luggage",
  ipa: "ˈlʌɡɪdʒ",                   // AFI amplio, inglés americano, sin barras
  translation: "equipaje",
  definition: "Maletas y bolsas que llevas al viajar. Es incontable: no lleva -s.",
  pack: "travel",
  partOfSpeech: "noun",            // noun | verb | phrasal-verb | adjective | adverb
  verbForms?: { past, pastParticiple, irregular },  // obligatorio en verbos
  examples: [{ en, es }, { en, es }]                // mínimo 2
}
```

`src/data/catalog.test.ts` valida: 150 palabras en Esenciales y ≥ 25 en cada paquete temático,
términos únicos en todo el catálogo, ids únicos con el formato correcto, ≥ 2 ejemplos, formas verbales en todos los verbos y una
transcripción AFI con caracteres válidos (p. ej. `ɡ` y no `g`) y acento principal `ˈ`.

## Estado guardado

Clave única de LocalStorage: `lexi:progress`.

```ts
interface UserProgressState {
  version: 5;
  updatedAt: string;                       // ISO
  words: Record<WordId, WordProgress>;     // solo palabras tocadas
  practiceDays: string[];                  // "YYYY-MM-DD", únicos y ordenados
  sessions: SessionRecord[];               // sesiones completadas (máx. 365)
  preferences: { sessionSize: number; speechRate: number; autoPronounce: boolean;
                 activePacks: PackId[] };  // paquetes opcionales añadidos (nunca Esenciales)
  preferencesUpdatedAt: string;            // EPOCH = valores por defecto (nunca ganan)
  removedWords: Record<WordId, string>;    // marcas de borrado para sincronizar
  resetAt: string | null;                  // último «borrar progreso»
}

interface WordProgress {
  status: "review" | "learned";            // "new" = ausente del mapa
  timesSeen: number;
  timesLearned: number;
  timesReview: number;
  firstSeenAt: string;
  lastReviewedAt: string;
  updatedAt: string;
}
```

## Versionado y migraciones

- Cada documento lleva `version`. `CURRENT_VERSION = 5`.
- Historial: **v1** formato inicial · **v2** añade `preferences.autoPronounce`
  (migración `1 → 2` lo activa por defecto sin tocar el progreso) · **v3** cambia las
  velocidades de voz a 0,8 / 1 / 1,2 (`2 → 3` convierte 0,7 → 0,8, 0,9 → 1 y 1,1 → 1,2) ·
  **v4** añade `removedWords`, `resetAt` y `preferencesUpdatedAt` para sincronizar (Fase 3).
  **v5** añade `preferences.activePacks` (vacío) y cambia `categoryId` por `packId` en las
  sesiones; las categorías que no son paquete pasan a `null` ([08](08-paquetes.md)).
- Velocidad de voz: se guarda la opción (0,8 «Lenta» / 1 «Normal» / 1,2 «Rápida»), pero «Lenta»
  se reproduce a 0,6 (`playbackRate` en `domain/progress.ts`): a 0,8 una palabra suelta solo dura
  un 25 % más y suena igual que «Normal». Así no hace falta migrar los datos ni la sincronización.
  «Más lento» del dictado va a 0,5.
- Al leer: `JSON.parse` → si `version < CURRENT`, se aplican migraciones en cadena
  (`migrations[n]: (state_n) => state_{n+1}`) → `sanitize()` normaliza tipos y descarta
  entradas inválidas campo a campo (nunca el documento entero por un campo roto).
- Si el JSON está corrupto o la versión es **mayor** que la soportada (datos de una
  versión más nueva de la app), se copia el valor original a
  `lexi:progress:backup-<timestamp>` antes de empezar con un estado vacío. Nunca se
  destruyen datos sin copia.
- Errores de cuota o de acceso (modo privado, almacenamiento bloqueado) se capturan;
  la app sigue funcionando en memoria y la UI muestra un aviso.

## Backend remoto (Fase 3)

El repositorio local sigue siendo síncrono porque LocalStorage lo es. El backend remoto se
modela aparte como `RemoteProgressSource { pull(): Promise<State>; push(state): Promise<void> }`,
y `SyncService` fusiona ambos lados. La **versión 4** del documento añade `removedWords`,
`resetAt` y `preferencesUpdatedAt` para poder sincronizar borrados. Detalle completo en
[04 · Cuentas y sincronización](04-cuentas-y-sincronizacion.md).

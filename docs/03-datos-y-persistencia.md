# 03 · Datos y persistencia

## Catálogo (`src/data/words`)

Un archivo por categoría. Cada `Word`:

```ts
{
  id: "travel-luggage",            // estable: <categoría>-<término-en-slug>
  term: "luggage",
  ipa: "ˈlʌɡɪdʒ",                   // AFI amplio, inglés americano, sin barras
  translation: "equipaje",
  definition: "Maletas y bolsas que llevas al viajar. Es incontable: no lleva -s.",
  category: "travel",
  partOfSpeech: "noun",            // noun | verb | phrasal-verb | adjective | adverb
  verbForms?: { past, pastParticiple, irregular },  // obligatorio en verbos
  examples: [{ en, es }, { en, es }]                // mínimo 2
}
```

`src/data/catalog.test.ts` valida: ≥ 80 palabras, 8 categorías con ≥ 10 cada una, ids únicos
con el formato correcto, ≥ 2 ejemplos, formas verbales en todos los verbos y una
transcripción AFI con caracteres válidos (p. ej. `ɡ` y no `g`) y acento principal `ˈ`.

## Estado guardado

Clave única de LocalStorage: `lexi:progress`.

```ts
interface UserProgressState {
  version: 3;
  updatedAt: string;                       // ISO
  words: Record<WordId, WordProgress>;     // solo palabras tocadas
  practiceDays: string[];                  // "YYYY-MM-DD", únicos y ordenados
  sessions: SessionRecord[];               // sesiones completadas (máx. 365)
  preferences: { sessionSize: number; speechRate: number; autoPronounce: boolean };
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

- Cada documento lleva `version`. `CURRENT_VERSION = 3`.
- Historial: **v1** formato inicial · **v2** añade `preferences.autoPronounce`
  (migración `1 → 2` lo activa por defecto sin tocar el progreso) · **v3** cambia las
  velocidades de voz a 0,8 / 1 / 1,2 (`2 → 3` convierte 0,7 → 0,8, 0,9 → 1 y 1,1 → 1,2).
- Al leer: `JSON.parse` → si `version < CURRENT`, se aplican migraciones en cadena
  (`migrations[n]: (state_n) => state_{n+1}`) → `sanitize()` normaliza tipos y descarta
  entradas inválidas campo a campo (nunca el documento entero por un campo roto).
- Si el JSON está corrupto o la versión es **mayor** que la soportada (datos de una
  versión más nueva de la app), se copia el valor original a
  `lexi:progress:backup-<timestamp>` antes de empezar con un estado vacío. Nunca se
  destruyen datos sin copia.
- Errores de cuota o de acceso (modo privado, almacenamiento bloqueado) se capturan;
  la app sigue funcionando en memoria y la UI muestra un aviso.

## Contrato para un backend futuro

El contrato actual es síncrono porque LocalStorage lo es. Para un backend remoto se
prevé `AsyncProgressRepository { load(): Promise<State>; save(state): Promise<void> }`
con el `ProgressStore` cargando de forma optimista desde la caché local.

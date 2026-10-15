# 08 · Paquetes de palabras

Estado: **implementado** (web y móvil).

## Objetivo

Que Lexi tenga recorrido más allá de las palabras básicas. La app trae un **paquete básico**
con las palabras más frecuentes del inglés, siempre activo, y **paquetes temáticos** que cada
persona añade a su práctica cuando quiere. El paquete sustituye a las antiguas categorías.

| Tema | Decisión |
| --- | --- |
| Origen | Incluidos en la app (sin descargas). Un paquete nuevo llega con una versión nueva. |
| Organización | Por tema. |
| Paquete básico | «Esenciales»: las 150 palabras más frecuentes (sustantivos, verbos, adjetivos y algunos adverbios; sin artículos, preposiciones ni pronombres). |
| Paquetes temáticos | Tecnología, Comida, Trabajo y oficina, Viajes, Phrasal verbs, Emociones y personalidad (30 palabras cada uno). |

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-29 | Esenciales está siempre activo y no se puede quitar. |
| RF-30 | Los paquetes temáticos se añaden o quitan desde Vocabulario: desde su tarjeta («Añadir») o desde su página («Añadir a mi práctica» / «Quitar de mi práctica»), con una confirmación accesible. |
| RF-31 | Un paquete sin añadir se puede consultar (palabras, fichas y voz), pero no entra en la práctica ni en las estadísticas. |
| RF-32 | Quitar un paquete no borra su progreso: al volver a añadirlo, todo sigue como estaba. |
| RF-33 | La práctica diaria mezcla las palabras de todos los paquetes activos con la prioridad de siempre (repasar, nuevas, aprendidas). También se puede practicar un paquete activo concreto. |
| RF-34 | Inicio y Progreso cuentan solo las palabras de los paquetes activos; Progreso muestra el avance por paquete. Inicio, Practicar y Progreso enlazan a Vocabulario si quedan paquetes por añadir. |
| RF-35 | Los paquetes activos forman parte de las preferencias de la cuenta: se sincronizan entre dispositivos con la regla «gana la preferencia más reciente». |

## Pantallas

| Pantalla | Web | Móvil |
| --- | --- | --- |
| Lista de paquetes | `/vocabulario`: «En tu práctica» (con progreso) y «Más paquetes» (con «Añadir») | Pestaña Vocabulario, igual |
| Un paquete | `/vocabulario?paquete=<id>` | `/paquete/[id]` |
| Practicar un paquete | `/practicar?paquete=<id>` (solo si está activo; si no, sesión general) | `?paquete=` en la pestaña Practicar |

## Datos

- `Word.pack` (antes `category`) y `PackId`: `essentials`, `technology`, `food`, `work`,
  `travel`, `phrasal-verbs`, `emotions`. Ids de palabra `<paquete>-<término>`.
- `Preferences.activePacks: PackId[]`: solo paquetes opcionales, sin duplicados y en el orden
  del catálogo (`sanitizePackList`).
- `SessionRecord.packId` (antes `categoryId`).
- Formato guardado **v5** (ver [03](03-datos-y-persistencia.md)). En Supabase, columna
  `user_settings.active_packs` (migración `0002_active_packs.sql`); `practice_sessions.category_id`
  guarda ahora el id del paquete.
- Los clientes anteriores a los paquetes (por ejemplo, un APK antiguo) no envían
  `active_packs`: el servidor conserva los de la cuenta.

## Reorganización del catálogo

Al introducir los paquetes se rehízo el catálogo (de 88 palabras en 8 categorías a 330 en
7 paquetes). Se aprovecharon las palabras útiles: las de viajes, tecnología y comida conservan
su id; las más frecuentes pasaron a Esenciales y las de negocios, a Trabajo. Las demasiado
específicas se retiraron. Se permitió porque la app aún no tenía usuarios; desde ahora vuelve a
aplicarse la regla de no renombrar ni reutilizar ids.

## Criterios de aceptación

1. Una cuenta nueva practica solo Esenciales (150 palabras).
2. Añadir Viajes hace que sus palabras entren en la práctica y en las estadísticas; quitarlo las saca sin perder su progreso.
3. Añadir un paquete en la web y verlo activo en el móvil tras sincronizar.
4. `catalog.test.ts`: Esenciales = 150, cada temático ≥ 25, términos únicos en todo el catálogo y las reglas de siempre (AFI, ejemplos, formas verbales).

## Fuera de alcance (por ahora)

- Paquetes descargables o creados por el usuario.
- Niveles (A1–C1) dentro de los paquetes.

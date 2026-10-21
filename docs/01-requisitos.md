# 01 · Requisitos — Fase 1

Lexi ayuda a hispanohablantes a practicar vocabulario en inglés a diario. La Fase 1 es
una aplicación web sin cuentas: todo el progreso vive en el navegador.

## Requisitos funcionales

| ID | Requisito | Ruta / módulo |
| --- | --- | --- |
| RF-01 | Pantalla de inicio con acceso directo a la práctica diaria, resumen (palabras estudiadas, aprendidas, por repasar) y racha. Todo calculado del progreso real (solo paquetes activos). Los paquetes viven en Vocabulario. | `/` · `features/home` |
| RF-02 | Iniciar una sesión de práctica sin configurar nada: «Empezar» (sesión general con su plan real) o un toque en un paquete activo. El tamaño de sesión se cambia en Ajustes. | `/practicar` · `domain/session` |
| RF-03 | En cada tarjeta: palabra, significado y ejemplos EN/ES visibles desde el principio; la palabra se pronuncia automáticamente al aparecer (desactivable) y puede repetirse con su botón. | `features/practice` |
| RF-04 | Marcar la palabra como **aprendida** o **por repasar** (avanza sola), o moverse con **anterior / siguiente** para revisar o cambiar una respuesta. Atajos: `Espacio` escuchar, `1` repasar, `2` aprendida, `←` `→` navegar. | `domain/session` |
| RF-05 | Indicador visual de avance y resumen al terminar. | `features/practice` |
| RF-06 | Sin repeticiones dentro de una sesión. | `domain/session` |
| RF-07 | Cada respuesta confirmada se guarda al instante: abandonar la sesión no pierde progreso. | `services/progress-store` |
| RF-08 | Catálogo organizado en paquetes: Esenciales (150 palabras más frecuentes, siempre activo) y paquetes temáticos que se añaden a la práctica. Ver [08](08-paquetes.md). | `data/words`, `data/packs` |
| RF-09 | Vocabulario organizado por paquetes: «En tu práctica» (con su progreso) y «Más paquetes» (para añadir); al abrir uno (`?paquete=`) se listan sus palabras con filtro por estado. La búsqueda (sin acentos ni mayúsculas) recorre todo el catálogo o el paquete abierto. | `/vocabulario` · `domain/search` |
| RF-10 | Ficha de palabra: término, transcripción fonética (AFI, inglés americano), traducción, explicación, paquete, tipo, ≥ 2 ejemplos traducidos, pronunciación, estado y acciones. Verbos con pasado y participio. | `/vocabulario/[id]` |
| RF-11 | Pronunciación con `speechSynthesis` + `SpeechSynthesisUtterance`, priorizando voces en inglés; degradación limpia sin soporte. | `services/speech` |
| RF-12 | Persistencia en LocalStorage: progreso por palabra, sesiones completadas, días de práctica y preferencias (tamaño de sesión, velocidad de voz, pronunciación automática; se editan en `/ajustes`). Acceso centralizado, errores controlados, datos versionados. | `persistence/` |
| RF-13 | Racha de días consecutivos: varias sesiones el mismo día cuentan una sola vez. | `domain/streak` |
| RF-14 | Pantalla de progreso: resumen (racha, aprendidas, por repasar, calendario de 4 semanas, mejor racha y sesiones), palabras por repasar y avance por paquete activo. | `/progreso` |
| RF-15 | Ajustes en su propia página (icono ⚙ de la cabecera): palabras por sesión, pronunciación automática, velocidad y borrado del progreso con confirmación. | `/ajustes` |

## Reglas de negocio

- **Estados de una palabra:** `new` (nunca practicada) → `review` (por repasar) ⇄ `learned` (aprendida).
  El usuario puede cambiar el estado desde la práctica o desde la ficha; también puede
  reiniciar una palabra a `new` desde la ficha.
- **Palabra estudiada:** cualquier palabra con estado distinto de `new`.
- **Día de práctica:** un día (fecha local `YYYY-MM-DD`) en el que el usuario confirmó
  al menos una palabra en una sesión de práctica. Cambiar un estado desde la ficha no
  cuenta como práctica.
- **Navegación en la sesión:** «siguiente» avanza sin responder; en la última palabra
  termina la sesión y las no respondidas aparecen como «sin responder». Volver a una palabra
  y cambiar la respuesta la guarda de nuevo; confirmar la misma respuesta no cuenta doble.
- **Sesión completada:** se registra al llegar al resumen. Si se abandona, las palabras
  ya confirmadas se conservan, pero la sesión no cuenta como completada.
- **Racha actual:** días consecutivos de práctica que terminan hoy o ayer (si aún no
  se practicó hoy, la racha de ayer sigue viva). Si el último día fue anteayer o antes, es 0.
- **Selección de palabras de una sesión** (10 por defecto, configurable 5–20):
  1. palabras `review` (las repasadas hace más tiempo primero),
  2. palabras `new` en orden aleatorio,
  3. palabras `learned` (las repasadas hace más tiempo primero) para completar.
  Nunca se repite un id dentro de la sesión.
- Las estadísticas solo cuentan ids presentes en el catálogo actual.

## Requisitos no funcionales

- Mobile-first, usable con una mano; objetivos táctiles ≥ 44 px.
- Accesible: navegación por teclado, foco visible, contraste AA, `prefers-reduced-motion`.
- TypeScript estricto. Lógica de negocio sin React ni APIs del navegador.
- Sin errores si LocalStorage o la síntesis de voz no están disponibles.

## Criterios de aceptación

1. Se navega entre Inicio, Practicar, Vocabulario y Progreso en móvil y escritorio.
2. Se busca y filtra el catálogo y se abre cualquier ficha.
3. Se escucha la pronunciación (o se informa de que no hay soporte).
4. Se completa una sesión y el resumen refleja las respuestas.
5. Tras recargar, progreso, racha y estadísticas se mantienen.
6. `npm run test`, `npm run lint` y `npm run build` pasan.

## Fuera de alcance (fases futuras)

Cuentas de usuario, base de datos remota, sincronización entre dispositivos, estadísticas
históricas avanzadas, repetición espaciada con intervalos, app móvil nativa (una versión con Expo existió y se retiró: ver `docs/02-arquitectura.md`, ADR-15).

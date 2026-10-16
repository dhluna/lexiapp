# 09 · Celebración al terminar una sesión

Estado: **implementado** (web y móvil).

## Objetivo

Recompensar el final de cada práctica con confeti y un sonido breve, sin molestar: corto,
desactivable y respetuoso con «reducir movimiento».

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-36 | Al completar una sesión con al menos una respuesta se lanza confeti y suena un acorde brillante (arpegio Do–Mi–Sol–Do). En el móvil, además, vibración de «éxito». |
| RF-37 | Si se aprendieron todas las palabras, la celebración es «perfecta»: confeti dorado en ráfaga doble con estrellas y un acorde más largo. Sin respuestas, no hay celebración. |
| RF-38 | Ajustes › Práctica › «Sonido de celebración» (activado por defecto) controla el sonido y la vibración. Es un ajuste del dispositivo: no se sincroniza. El confeti no depende de él. |
| RF-39 | Con «reducir movimiento» del sistema no hay confeti. La celebración ocurre una sola vez por sesión y nunca interrumpe la práctica: si un efecto falla, se ignora. |

## Reglas

- **Variante:** `celebrationFor(summary)` en `@lexi/core/domain/celebration`: `none` (0 respuestas),
  `perfect` (aprendidas = total, igual que el título «Todas aprendidas») o `normal`.
- **Orden:** se corta la pronunciación en curso, se lanza el confeti y, si el ajuste lo permite,
  el sonido.
- **Sonido:** generado, sin archivos con licencia. La «partitura» (`CHIME`) está en el núcleo:
  - En la **web** se sintetiza con la Web Audio API.
  - En el **móvil** se reproduce con `expo-audio` a partir de dos WAV generados por
    `node scripts/generate-chimes.mjs` (`apps/mobile/assets/sounds/`). Si cambias `CHIME`,
    vuelve a ejecutar el script.
  - En iOS respeta el interruptor de silencio.
- **Permisos (móvil):** el plugin de `expo-audio` se configura sin micrófono ni audio en
  segundo plano. Solo añade `MODIFY_AUDIO_SETTINGS`, que no se le pide al usuario.

## Diseño

| Pieza | Dónde |
| --- | --- |
| Variante y partitura | `packages/core/src/domain/celebration.ts` |
| Ajuste del dispositivo (`lexi:celebration-sound`) | `packages/core/src/services/celebration-settings.ts` |
| Coordinación (voz, confeti, sonido) | `packages/core/src/services/celebrator.ts` |
| Web: confeti y acorde | `apps/web/src/platform/confetti.ts` (canvas-confetti, carga diferida) y `chime.ts` |
| Móvil: confeti | `apps/mobile/src/components/confetti.tsx` (Reanimated, capa en la raíz) vía `platform/confetti-bus.ts` |
| Móvil: acorde y vibración | `apps/mobile/src/platform/chime.ts` (`expo-audio`, `expo-haptics`) |
| Disparo | `practice-summary.tsx` de cada app, una vez por `session.id` |

Las pruebas inyectan un `Celebrator` real con efectos simulados (jsdom y Jest no tienen canvas
ni audio).

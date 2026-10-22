# 12 · Niveles, puntos e insignias

Estado: **implementado** (web y móvil).

## Objetivo

Dar una meta cercana y visible: cada palabra aprendida da puntos, los puntos suben de nivel y
cada nivel y cada paquete completado tienen su insignia. Sin datos nuevos: todo se calcula
a partir del progreso real.

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-46 | Cada palabra **conseguida** da 100 puntos. Una palabra está conseguida si está aprendida o lo estuvo alguna vez (`timesLearned > 0`), en todo el catálogo. |
| RF-47 | 8 niveles según las palabras conseguidas (tabla abajo). Inicio muestra la insignia, «Nivel N · Nombre», los puntos, una barra hasta el siguiente nivel y «X palabras para …» (o «¡Nivel máximo!»). |
| RF-48 | Progreso muestra la sección «Insignias»: los 8 niveles (conseguidos en color, los demás en gris con su meta) y una insignia por paquete, que se consigue al tener todas sus palabras («18/30» mientras tanto). |
| RF-49 | Si una sesión de tarjetas sube de nivel, el resumen lo anuncia («¡Subiste a …!») con la celebración dorada. «Ponerme a prueba» no sube de nivel porque no cambia el progreso. |
| RF-50 | Los puntos, niveles e insignias se conservan por usuario y se sincronizan, porque se derivan del progreso, que ya se sincroniza. |
| RF-51 | El nivel actual se ve siempre en la cabecera, junto a Ajustes: la insignia del nivel y los puntos («1.600 pts»; el nombre del nivel va en su etiqueta accesible y en el tooltip) llevan a las insignias de Progreso. En Ajustes, la tarjeta «Cuenta» muestra la insignia, el nivel y los puntos junto al email. |

## Niveles

| Nivel | Palabras | Puntos |
| --- | --- | --- |
| 1 · Recién llegado | 0 | 0 |
| 2 · Básico | 10 | 1.000 |
| 3 · Explorador | 25 | 2.500 |
| 4 · Conversador | 50 | 5.000 |
| 5 · Fluido | 100 | 10.000 |
| 6 · Avanzado | 150 | 15.000 |
| 7 · Experto | 225 | 22.500 |
| 8 · Maestro | 330 | 33.000 (todo el catálogo) |

## Reglas

- **Lo conseguido no se pierde:** mandar una palabra a «repasar» (también desde «Ponerme a
  prueba») o quitar su paquete no resta puntos.
  - Solo restan «Marcar como nueva» y «Borrar progreso», que borran el registro de la palabra.
- **Palabras retiradas del catálogo:** no cuentan.
- **Si el catálogo crece:** hay que revisar la tabla de niveles. Una prueba exige que el último
  nivel sea el catálogo completo.
- **Insignias de nivel:** iconos `Footprints`, `BookOpen`, `Compass`, `MessagesSquare`, `Zap`,
  `Rocket`, `Gem` y `Crown`. Cada nivel tiene su color (tokens `lvN` para el icono y `lvN-soft`
  para el fondo, en `packages/core/src/theme/tokens.ts` y `globals.css`): pizarra, azul, verde,
  violeta, cian, naranja, rubí y oro. Conseguidas: color pleno con aro; bloqueadas: su color al
  45 % (60 % en modo oscuro) y sin aro, para que la colección se distinga desde el principio. Contraste icono/fondo ≥ 4:1.
- **Insignias de paquete:** usan el icono del paquete.

## Diseño

| Pieza | Dónde |
| --- | --- |
| Reglas (`levelFor`, `achievedCount`, `packBadges`, `levelUp`, `formatPoints`) | `packages/core/src/domain/levels.ts` |
| Web | `components/level-badge.tsx`, `features/levels/` (resumen e insignias), `LevelLink` en `components/layout/app-nav.tsx`, `features/account/account-section.tsx` |
| Móvil | `components/levels.tsx`, `LevelButton` en `app/(tabs)/_layout.tsx`, `AccountLevel` en `screens/settings.tsx` |
| Subida de nivel | la vista de práctica guarda las palabras conseguidas al empezar y el resumen recibe `newLevel` |

# 10 · «Ponerme a prueba»: ejercicios

Estado: **implementado** (web y móvil).

## Objetivo

En las tarjetas, la propia persona decide si se sabe una palabra. «Ponerme a prueba» le pide
**demostrarlo escribiéndola** y registra el resultado solo.

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-40 | En Practicar, bajo «Empezar», el bloque «Ponerme a prueba» con su plan («5 palabras para comprobar escribiéndolas»). Desactivado, con explicación, si aún no hay palabras vistas. Enlace directo: `/practicar?prueba=1`. |
| RF-41 | Solo se comprueban palabras ya vistas de los paquetes activos: primero las de repasar y luego las aprendidas, las más antiguas primero, con el tamaño de sesión de Ajustes. |
| RF-42 | **Escucha y escribe:** Lexi dice la palabra al aparecer, con botones «Escuchar» y «Más lento». Si la palabra tiene varias, se indica cuántas. Sin voz en inglés, se muestra la traducción. |
| RF-43 | **Completa la frase:** un ejemplo con un hueco, su traducción y la traducción de la palabra como pista. Se escribe la forma de la frase (*flights*, *gave up*). |
| RF-44 | **Comprobación tolerante:** no se tienen en cuenta mayúsculas, tildes, espacios ni apóstrofos tipográficos. Una letra de diferencia, en respuestas de 4 letras o más, cuenta como acierto con la nota «Casi: se escribe …». En un hueco, la forma base también vale, con la nota «En esta frase va …». «No lo sé» cuenta como fallo. |
| RF-45 | Acierto: la palabra queda como aprendida. Fallo: queda por repasar, y se muestra la respuesta correcta, su traducción, la voz y un ejemplo. Cada resultado se guarda al comprobarlo y cuenta para la racha. No se vuelve atrás. Al final, el resumen («Acertadas», «Todas correctas») y la celebración de siempre. |

## Reglas de los huecos

`findGap` (`packages/core/src/domain/exercise.ts`) busca en los ejemplos el término o sus formas:

- las de `verbForms`;
- las flexiones regulares (*-s*, *-es*, *-ed*, *-d*, *-ing*, *-ies*, *-ied*, consonante doblada);
- algunos plurales irregulares (*men*, *women*, *children*, *people*, *lives*).

La búsqueda es por palabra completa y sin distinguir mayúsculas. Para no generar formas que
son otras palabras, las palabras de dos letras («be», «do») solo admiten *-s*, *-es* e *-ing*.
Una frase se descarta si la palabra aparece dos veces, porque daría la respuesta. Si ningún
ejemplo sirve, el ejercicio es un dictado. Una prueba recorre el catálogo: hoy más del 80 % de
las palabras tienen frase.

## Diseño

| Pieza | Dónde |
| --- | --- |
| Ejercicios, comprobación y selección | `packages/core/src/domain/exercise.ts` |
| Sesión de prueba (`createQuiz`, `isQuiz`, `recordCurrent`) | `packages/core/src/domain/session.ts` (`exercises` en `PracticeSession`) |
| Plan y texto del botón | `quizCount` y `quizText` en `planning/session-plan.ts` |
| Web | `apps/web/src/features/practice/exercise-card.tsx` |
| Móvil | `apps/mobile/src/screens/practice/exercise-card.tsx` (campo sin autocorrección ni mayúsculas automáticas) |

No cambia el formato guardado: el resultado se guarda como cualquier respuesta de la práctica.

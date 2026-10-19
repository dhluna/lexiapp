# 14 · Audio grabado (voces neuronales)

Estado: **implementado** (web y móvil). Las grabaciones se generan con el script.

## Objetivo

Que la pronunciación suene natural y **igual en todos los dispositivos**. Antes dependía de las
voces del navegador o del teléfono de cada persona, y la calidad y el acento cambiaban mucho.

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-58 | Las palabras, los ejemplos, las formas verbales y las respuestas de «Ponerme a prueba» se oyen con grabaciones neuronales. |
| RF-59 | Ajustes › Pronunciación › **Voz**: «EE. UU. · Mujer» (por defecto), «EE. UU. · Hombre», «Reino Unido · Mujer» y «Reino Unido · Hombre». Al elegir una voz suena una muestra. Es un ajuste del dispositivo (`lexi:voice`), no se sincroniza. |
| RF-60 | «Lenta» y «Rápida» cambian la velocidad de la grabación sin cambiar el tono. |
| RF-61 | Si falta la grabación de un texto o no se puede descargar (por ejemplo, el móvil sin conexión), se usa la voz del sistema, con el acento de la voz elegida si existe. |
| RF-62 | El AFI de las fichas sigue siendo de inglés americano, de diccionario (Oxford, Merriam-Webster), elijas la voz que elijas. Ajustes lo indica. |

## Voces

| Id | Voz de Google Cloud Text-to-Speech |
| --- | --- |
| `us-female` | `en-US-Neural2-F` |
| `us-male` | `en-US-Neural2-J` |
| `uk-female` | `en-GB-Neural2-F` |
| `uk-male` | `en-GB-Neural2-B` |

Se cambian en `packages/core/src/data/voices.ts`. Después hay que borrar la carpeta de esa voz y
regenerarla.

## Archivos

- **Grabaciones:** `apps/web/public/audio/<voz>/<clave>.mp3`. La clave es `audioKey(texto)`, de
  `domain/audio.ts`: un *slug* más un hash FNV-1a del texto exacto, igual en el script, la web y
  el móvil.
- **Índice:** `apps/web/public/audio/index.json` con las claves disponibles, que son las mismas
  para las 4 voces. Las apps lo cargan una vez; mientras no está cargado, o si falla, usan la voz
  del sistema.
- **Dónde suenan:**
  - En la web, desde `/audio/…`.
  - En el móvil, desde `https://lexiapp.app/audio/…` en *streaming*: no van dentro de la app
    para no añadirle unos 35 MB.

## Regenerar (al cambiar el catálogo)

1. **Credenciales** (una sola vez):
   - En Google Cloud, crea el proyecto con facturación y habilita **Cloud Text-to-Speech API**.
   - Crea una **clave de API restringida** a esa API.
   - Guárdala en `.env.audio.local` (`GOOGLE_TTS_API_KEY=…`). Ese archivo no se sube nunca
     (regla `.env*` de `.gitignore`).
2. **Generar:**
   - `npx tsx scripts/generate-audio.ts --dry-run` muestra cuántos textos y audios hay que
     generar, sin llamar a la API.
   - `npx tsx scripts/generate-audio.ts` genera solo lo nuevo, borra las grabaciones que ya no se
     usan, comprueba que cada voz tiene todas y reescribe `index.json`.
   - El script envía la clave en una cabecera, nunca en la URL ni en los mensajes de error.
3. Revisa algunas grabaciones al oído y súbelas con un PR, como cualquier cambio.

**Volumen y coste:** ~1.200 textos y ~21.000 caracteres por voz, unos 85.000 en total. Cabe en el
nivel gratuito mensual de Text-to-Speech, y regenerar solo lo nuevo cuesta muy poco.

## Diseño

| Pieza | Dónde |
| --- | --- |
| Voces y muestra | `packages/core/src/data/voices.ts` |
| Claves y textos que se pronuncian | `packages/core/src/domain/audio.ts` |
| Contrato `AudioClipPlayer` | `packages/core/src/platform.ts` |
| Grabación o voz del sistema | `packages/core/src/services/speech.ts` |
| Ajuste de voz | `packages/core/src/services/voice-settings.ts` |
| Web | `platform/audio-clips.ts` (`HTMLAudioElement`, `preservesPitch`), Ajustes |
| Móvil | `platform/audio-clips.ts` (`expo-audio`, `setPlaybackRate(…, "high")`), Ajustes |
| Generador | `scripts/generate-audio.ts` |

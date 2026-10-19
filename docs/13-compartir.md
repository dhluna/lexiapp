# 13 · Compartir Lexi

Estado: **implementado** (web y móvil).

## Objetivo

Que quien usa Lexi pueda recomendarla en segundos: copiar el enlace, enviarlo por WhatsApp o
redes, o mostrar un código QR que abra https://lexiapp.app.

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-52 | La página `/compartir` muestra el QR de lexiapp.app con el símbolo de Lexi en el centro, y permite descargarlo en PNG (1024 px) y en SVG para imprimir. |
| RF-53 | «Copiar enlace» copia `https://lexiapp.app` y lo confirma con «Enlace copiado.» (`aria-live`). Si el portapapeles falla, pide copiarlo a mano. |
| RF-54 | Donde existe la hoja del sistema (`navigator.share`, sobre todo en móviles), el botón «Compartir…» la abre: es la vía para Instagram, que no tiene enlace web para compartir. |
| RF-55 | Botones a WhatsApp, Telegram, Facebook, X, LinkedIn y correo, en otra pestaña (`noopener noreferrer`). Solo llevan el mensaje y el enlace: ningún dato del usuario ni parámetros de seguimiento. |
| RF-56 | Se llega desde Ajustes («Compartir Lexi») y desde el enlace «¿Te gusta Lexi? Compártela» al final de Inicio. |
| RF-57 | En la app móvil, Ajustes muestra el mismo QR y el botón «Compartir Lexi», que abre la hoja nativa (`Share.share`). |

## Enlaces de cada red

| Red | URL |
| --- | --- |
| WhatsApp | `https://wa.me/?text=<mensaje + enlace>` |
| Telegram | `https://t.me/share/url?url=<enlace>&text=<mensaje>` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=<enlace>` |
| X | `https://x.com/intent/post?text=<mensaje>&url=<enlace>` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=<enlace>` |
| Correo | `mailto:?subject=Te recomiendo Lexi&body=<mensaje + enlace>` |

## El código QR

- **Se genera una vez** con `node scripts/generate-qr.mjs`, que usa el paquete `qrcode` con corrección de errores **H**
  (versión 3, 29×29). El script escribe:
  - `packages/core/src/data/share.ts`, con la URL, el mensaje y la matriz.
  - `apps/web/public/qr/lexiapp-qr.{svg,png}`.
  - No se edita a mano; si cambia la URL o el mensaje, se vuelve a ejecutar.
- **El script decodifica el PNG** con `jsqr` y falla si no lee exactamente la URL. La prueba
  `packages/core/src/domain/qr.test.ts` hace lo mismo con el logo encima.
- **Diseño** (`packages/core/src/domain/qr.ts`, compartido por web, móvil y script):
  - Módulos de esquinas suaves en tinta y «ojos» redondeados en `accent`.
  - El símbolo «l.» en el centro (≈ 22 % del ancho) y 4 módulos de margen.
  - Los módulos se tocan entre sí: con puntos separados, algunos lectores (jsQR) no lo leían.
  - Colores fijos (no tokens del tema): un QR necesita módulos oscuros sobre blanco, también
    en modo oscuro.

## Diseño

| Pieza | Dónde |
| --- | --- |
| Datos y QR | `packages/core/src/data/share.ts` (generado), `packages/core/src/domain/qr.ts` |
| Web | `app/compartir/page.tsx`, `features/share/` (vista, QR, enlaces) |
| Accesos | `features/settings/settings-view.tsx`, `features/home/home-view.tsx` |
| Móvil | `components/lexi-qr.tsx`, grupo «Compartir Lexi» en `screens/settings.tsx` |

# 06 · Fase 4: app móvil (Expo)

Estado: **en implementación**, rama `fase-4`.

## Objetivo

Una app nativa para Android e iOS con las mismas funciones que la web, que comparte el
progreso con ella a través de la cuenta y aprovecha lo propio del móvil: voz del sistema,
gestos y recordatorios.

| Tema | Decisión |
| --- | --- |
| Tecnología | Expo (React Native), SDK 57, Expo Router |
| Plataformas | Android e iOS, un solo código |
| Extras móviles | Recordatorio diario y deslizar tarjetas |
| Distribución inicial | Pruebas internas (Expo Go, APK interno, TestFlight) |

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-23 | Mismas funciones que la web: Inicio, Practicar, Vocabulario (categorías → palabras → ficha), Progreso y Ajustes. Mismos textos y reglas. |
| RF-24 | Pronunciación con la voz en inglés del sistema (`expo-speech`), automática y bajo demanda; aviso si no hay voz en inglés. |
| RF-25 | En la práctica, deslizar la tarjeta a la izquierda pasa a la siguiente palabra y a la derecha vuelve a la anterior. |
| RF-26 | Recordatorio diario opcional a una hora elegida, que no avisa si ya se practicó ese día. |
| RF-27 | Cuentas opcionales con email y contraseña o Google; el progreso es el mismo que en la web. |
| RF-28 | Funciona sin conexión y sincroniza al recuperarla o al volver a abrir la app. |

## Navegación

```
Pestañas (abajo)            Pantallas apiladas
├── Inicio                  ├── Ficha de palabra   /palabra/[id]
├── Practicar               ├── Categoría          /categoria/[id]
├── Vocabulario             ├── Ajustes            /ajustes      (⚙ en la cabecera)
└── Progreso                ├── Entrar             /entrar
                            └── Nueva contraseña   /restablecer
```

| Web | Móvil |
| --- | --- |
| `/` | Pestaña Inicio |
| `/practicar` (+ `?empezar=1`, `?categoria=`) | Pestaña Practicar; los accesos directos abren la sesión igual |
| `/vocabulario` y `?categoria=` | Pestaña Vocabulario → pantalla Categoría |
| `/vocabulario/[id]` | Ficha de palabra |
| `/progreso`, `/ajustes` | Pestaña Progreso, pantalla Ajustes |
| `/entrar`, `/auth/callback`, `/restablecer-contrasena` | Entrar y Nueva contraseña; el retorno llega por `lexi://auth/callback` |

## Reglas propias del móvil

### Deslizar tarjetas
- Umbral: ~80 pt de desplazamiento horizontal o un gesto rápido.
- Izquierda → siguiente (en la última palabra, termina la sesión, igual que «›»).
  Derecha → anterior (en la primera, la tarjeta vuelve a su sitio).
- Deslizar **no responde**: solo navega, como las flechas. Responder sigue siendo explícito.
- Con «reducir movimiento» del sistema no hay animación de salida.
- Las flechas ‹ › se mantienen para quien no use gestos (accesibilidad).

### Recordatorio diario
- Desactivado por defecto. Al activarlo se pide el permiso de notificaciones; si se
  deniega, el ajuste vuelve a desactivado y se explica cómo activarlo en el sistema.
- Horas: 8:00, 13:00, 19:00 o 21:00.
- Es un ajuste **del dispositivo** (clave `lexi:reminder`), no se sincroniza: cada
  dispositivo decide si avisa.
- Se programan los próximos 7 días. Al practicar se cancela el aviso de hoy. Al abrir la
  app se reprograma la semana.
- Texto según la racha real: con racha, «Llevas N días seguidos. Unos minutos hoy para no
  perderla.»; sin racha, «Unos minutos de vocabulario para empezar una racha.».
- Solo notificaciones locales: no hay servidor de notificaciones.

## Diferencias de plataforma

| Aspecto | Web | Móvil |
| --- | --- | --- |
| Almacenamiento | `localStorage` | `expo-sqlite/kv-store` (API síncrona) |
| Voz | Web Speech API | `expo-speech` (voces del sistema, sin conexión) |
| Disparadores de sincronización | `online`, `visibilitychange` | `NetInfo`, `AppState` |
| Retorno de Google y correos | URL `https://…/auth/callback` | Enlace `lexi://auth/callback` (en desarrollo, `exp://…`) |
| Sesión de Supabase | `localStorage` | `expo-sqlite/kv-store` |

Configuración extra en Supabase: añadir `lexi://**` y `exp://**` a **Redirect URLs**.

## Arquitectura

Monorepo con npm workspaces:

```
packages/core   @lexi/core: dominio, catálogo, persistencia, servicios y contratos de plataforma
apps/web        Next.js (la app de las Fases 1 y 3)
apps/mobile     Expo
```

`@lexi/core` no depende de React ni de APIs del navegador. Cada app aporta adaptadores
para cuatro contratos: `KeyValueStorage`, `SpeechEngine`, `SyncTriggers` y
`AuthPlatform` (redirecciones y apertura del navegador para Google). Ver ADR-13 a ADR-16
en `docs/02-arquitectura.md`.

## Criterios de aceptación

1. La web sigue funcionando igual y pasan sus pruebas, tipos, lint y compilación.
2. La app compila para Android e iOS (`expo export`) y pasan sus pruebas.
3. En un móvil con Expo Go: practicar con voz y gestos, consultar vocabulario y progreso.
4. Con la misma cuenta, el progreso de la web y del móvil coincide tras sincronizar.
5. Practicar sin conexión y sincronizar al recuperarla.
6. El recordatorio llega a la hora elegida y no llega si ya se practicó ese día.

## Fuera de alcance (por ahora)

- Publicación en Google Play y App Store (fichas, capturas, revisión).
- Notificaciones push desde servidor, widgets y Apple Watch.
- Inicio de sesión nativo de Google (se usa el navegador del sistema).
- **Iniciar sesión con Apple.** No hace falta para las pruebas internas, pero la App Store
  lo exige en apps que ofrecen inicio de sesión con Google (norma 4.8), así que será
  obligatorio antes de publicar en iOS.

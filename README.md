# Lexi

Aplicación web y móvil para que hispanohablantes practiquen vocabulario en inglés cada día:
tarjetas con significado, pronunciación y ejemplos traducidos, racha diaria y progreso
por categoría. Cuentas opcionales para sincronizar el progreso entre dispositivos.

**Pruébala:** https://lexiapp-five.vercel.app (Android: APK interno con EAS, ver
[docs/07](docs/07-movil-pruebas.md)).

## Funcionalidades (Fase 1)

- **Inicio:** práctica de hoy (con el plan real de la sesión), racha de los últimos 7 días
  y resumen del vocabulario.
- **Practicar:** una pantalla limpia con «Empezar» (sesión general) o un toque por categoría;
  sesiones de 5 a 20 palabras (se cambia en Ajustes). Primero salen las
  palabras por repasar, luego las nuevas. Cada tarjeta muestra significado y ejemplos desde
  el principio y pronuncia la palabra al aparecer (se puede desactivar). Una barra flotante
  permite marcar *aprendida* o *por repasar*; las flechas anterior / siguiente permiten
  revisar o cambiar respuestas. Resumen al terminar. Atajos de teclado (`Espacio` escuchar,
  `1`, `2`, `←`, `→`).
- **Vocabulario:** 88 palabras organizadas en 8 categorías (tarjetas con el progreso de cada
  una), con transcripción fonética (AFI, inglés americano). Búsqueda en inglés o español (sin
  distinguir acentos) en todo el catálogo o dentro de una categoría, filtro por estado y
  ficha completa de cada palabra.
- **Progreso:** resumen (racha, aprendidas, por repasar y calendario de 4 semanas),
  palabras por repasar y avance por categoría.
- **Ajustes** (icono ⚙ de la cabecera): cuenta, palabras por sesión, pronunciación
  automática, velocidad y borrado del progreso.
- **Cuentas y sincronización (opcional):** con Google o email y contraseña. El progreso se
  sincroniza entre dispositivos y sigue funcionando sin conexión. Sin configurar Supabase,
  Lexi funciona igual que sin cuenta.

## Stack

Next.js 16 (App Router, Turbopack, Cache Components) · React 19 · TypeScript estricto ·
Tailwind CSS 4 · Lucide · Web Speech API · LocalStorage · Supabase (cuentas y
sincronización, opcional) · Vitest + React Testing Library.

shadcn/ui no se instaló en esta fase; el motivo está en
[docs/02-arquitectura.md](docs/02-arquitectura.md) (ADR-2).

## Puesta en marcha

Requiere Node.js 20.9 o superior (probado con Node 24).

```bash
npm install
```

```bash
npm run dev
```

Abre <http://localhost:3000>. Para activar las cuentas, sigue [docs/05-despliegue.md](docs/05-despliegue.md) (las variables van en `apps/web/.env.local`).

App móvil en tu teléfono con Expo Go (detalles en [docs/07-movil-pruebas.md](docs/07-movil-pruebas.md)):

```bash
npm run start -w @lexi/mobile
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de la web |
| `npm run start -w @lexi/mobile` | Servidor de Expo para la app móvil |
| `npm test` | Pruebas de todos los paquetes (Vitest en núcleo y web, Jest en móvil) |
| `npm run test:sql` | Esquema de Supabase y sus reglas (RLS, sincronización) en un Postgres desechable; requiere Docker |
| `npm run typecheck` | Comprobación de tipos |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Compilación y servidor de producción de la web |

## Arquitectura

```
packages/core/src/        @lexi/core: sin React ni APIs del navegador
├── domain/               Reglas de negocio puras: progreso, racha, sesión, búsqueda, fusión
├── data/                 Catálogo de palabras y categorías
├── persistence/          ProgressRepository, esquema versionado, origen remoto (Supabase)
├── services/             ProgressStore, SyncService, SupabaseAuthService, SpeechService
└── platform.ts           Contratos que aporta cada plataforma
apps/web/src/             Next.js
├── platform/             Adaptadores web: localStorage, Web Speech, eventos, URL
├── hooks/  components/  features/
└── app/                  Rutas: /, /practicar, /vocabulario, /vocabulario/[id], /progreso, /ajustes,
                          /entrar, /auth/callback, /restablecer-contrasena
apps/mobile/src/           Expo (Android e iOS)
├── platform/             Adaptadores nativos: SQLite, expo-speech, NetInfo, notificaciones
├── screens/  components/  hooks/
└── app/                  Rutas de Expo Router (pestañas + pantallas)
supabase/                 Esquema de Postgres con RLS y pruebas de sus reglas
```

`domain`, `data`, `persistence` y `services` no dependen de React; la UI solo los consume.
El detalle está en `docs/`:

- [01 · Requisitos](docs/01-requisitos.md): requisitos funcionales, reglas de negocio y criterios de aceptación.
- [02 · Arquitectura](docs/02-arquitectura.md): capas y decisiones (ADR).
- [03 · Datos y persistencia](docs/03-datos-y-persistencia.md): modelo, versionado y migraciones.
- [04 · Cuentas y sincronización](docs/04-cuentas-y-sincronizacion.md): Fase 3 (Supabase, fusión, seguridad).
- [05 · Configurar cuentas y desplegar](docs/05-despliegue.md): Supabase, Google, variables y Vercel.
- [06 · App móvil](docs/06-app-movil.md): Fase 4 con Expo.
- [07 · Probar la app móvil](docs/07-movil-pruebas.md): Expo Go y builds internos con EAS.

## Verificación

- 88 pruebas en 13 archivos: catálogo, racha, estadísticas, selección de sesión, búsqueda,
  repositorio (corrupción, versiones futuras, migraciones), `ProgressStore`, `SpeechService`
  y flujos de UI (sesión completa, abandono y recarga, búsqueda y filtros, ficha, inicio y progreso).
- Compilación de producción: 96 páginas prerenderizadas (incluidas las 88 fichas).
- Revisión manual en el navegador a 375 px y 1280 px, en modo claro y oscuro.

## Limitaciones conocidas

- **La pronunciación automática necesita una interacción previa** (política de los navegadores).
  En la práctica siempre la hay; si se bloqueara, el botón de escuchar sigue funcionando.
- **La pronunciación depende del navegador y del sistema operativo.** Algunos sistemas no
  tienen voces en inglés instaladas; entonces se usa la voz por defecto con `lang="en-US"`
  y la app muestra un aviso con cómo instalar una. La calidad (y el ruido de fondo) depende
  de la voz: las de Chrome («Google») y Edge («Natural») suenan mucho mejor que las voces
  locales antiguas de Windows.
  Si el navegador no tiene `speechSynthesis`, los botones aparecen desactivados con un aviso.
  Las pruebas automáticas usan un motor de voz simulado.
- **El progreso es local a cada navegador y dispositivo.** Borrar los datos del sitio lo elimina.
  En modo privado o con el almacenamiento bloqueado, la app avisa y funciona solo en memoria.
- **La sesión en curso no se guarda:** al salir se conservan las respuestas ya dadas, pero
  la sesión no cuenta como completada y no se puede retomar.
- **Las traducciones usan un español neutro con rasgos peninsulares** (p. ej., «móvil»,
  «deberes»). Cuando hay variantes habituales se dan las dos («tarea / deberes»).
- Sin pruebas end-to-end automatizadas (Playwright) en esta fase; los flujos se cubren con
  React Testing Library y se revisaron a mano en el navegador.

## Licencia

[MIT](LICENSE). Puedes usar, modificar y redistribuir el código, también en proyectos
comerciales, siempre que conserves el aviso de copyright y la licencia.

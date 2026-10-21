<p align="center">
  <img src="brand/lexi-logo.svg" alt="Lexi" height="72">
</p>

<p align="center">
  <strong>Vocabulario en inglés para hispanohablantes, cada día y a tu ritmo.</strong><br>
  Tarjetas con pronunciación grabada, AFI, significado y ejemplos traducidos.
</p>

<p align="center">
  <a href="https://lexiapp.app"><strong>lexiapp.app</strong></a> ·
  <a href="https://github.com/dhluna/lexiapp/actions/workflows/ci.yml"><img src="https://github.com/dhluna/lexiapp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-3a3ed6" alt="Licencia MIT"></a>
</p>

Lexi es una aplicación **web**, gratuita y de código abierto. Funciona en el navegador del
móvil o del ordenador, sin instalar nada y sin cuenta: el progreso se guarda en tu dispositivo.
Si creas una cuenta, se sincroniza entre tus navegadores.

## Qué puedes hacer

| | |
| --- | --- |
| **Practicar** | Sesiones de 5 a 20 palabras: primero las que tienes por repasar, luego las nuevas. Cada tarjeta trae la pronunciación (normal o lenta), el AFI, el significado y dos ejemplos traducidos. Marcas «La sé» o «Repasar». |
| **Ponerme a prueba** | Dictado («Escucha y escribe») y «Completa la frase» con tus palabras aprendidas, corregidos con tolerancia. No cambia tu progreso. |
| **Vocabulario** | 330 palabras en 7 paquetes: Esenciales (las 150 más frecuentes) y temas que añades cuando quieras (Tecnología, Comida, Trabajo, Viajes, Phrasal verbs, Emociones). Búsqueda en inglés o español y ficha de cada palabra. |
| **Progreso** | Racha diaria, calendario de 4 semanas, avance por paquete y 8 niveles con insignias (100 puntos por palabra aprendida). |
| **Voces** | Pronunciación grabada con voces neuronales: EE. UU. o Reino Unido, mujer u hombre. |
| **Cuenta (opcional)** | Con Google o con email. Sincroniza tu progreso y sigue funcionando sin conexión. |
| **Compartir** | Página con código QR, enlace y redes para recomendar Lexi. |

Accesible y pensada para el móvil: objetivos táctiles de 44 px, foco visible, modo claro y
oscuro, respeto a «reducir movimiento» y atajos de teclado (`Espacio`, `1`, `2`, `←`, `→`).

## Cómo está hecha

| Capa | Tecnología |
| --- | --- |
| Web | [Next.js 16](https://nextjs.org) (App Router, Cache Components) · React 19 · Tailwind CSS 4 · Lucide |
| Lenguaje | TypeScript estricto en todo el proyecto |
| Cuentas y sincronización | [Supabase](https://supabase.com): Auth (Google y email, PKCE) y Postgres con RLS |
| Voces | Grabaciones generadas con Google Cloud Text-to-Speech (Neural2) |
| Alojamiento | Vercel (web, audio y estadísticas de visitas sin cookies) |
| Correo y dominio | Resend (SMTP de Supabase) · Cloudflare |
| Calidad | Vitest · React Testing Library · GitHub Actions |

## Arquitectura

```
packages/core/          @lexi/core: TypeScript puro, sin React ni APIs del navegador
├── domain/             reglas de negocio: progreso, racha, sesión, niveles, fusión, audio
├── data/               catálogo de palabras, paquetes, voces
├── persistence/        repositorio, formato versionado (v5) y migraciones, origen remoto
├── services/           casos de uso: ProgressStore, SyncService, SpeechService, auth
└── platform.ts         contratos que aporta la web (puertos)
apps/web/               la aplicación (Next.js)
├── src/platform/       adaptadores: localStorage, Web Speech, audio, eventos, redirecciones
├── src/hooks/          puente React ↔ servicios (inyectables en pruebas)
├── src/components/     interfaz reutilizable
├── src/features/       pantallas: inicio, práctica, vocabulario, progreso, ajustes…
├── src/app/            rutas finas que solo componen
└── public/audio/       grabaciones de voz (~4.900 MP3) e índice
supabase/               esquema de Postgres con RLS, sync_push y pruebas de sus reglas
scripts/                generar audio y QR, probar el SQL
docs/                   especificaciones y decisiones (ADR)
```

- **Dependencias en un solo sentido:** `app → features → hooks/components → services →
  persistence → domain`. El núcleo no conoce React ni el navegador; lo que depende de la
  plataforma entra por contratos (`KeyValueStorage`, `SpeechEngine`, `AudioClipPlayer`,
  `SyncTriggers`, `AuthPlatform`).
- **Local-first:** la interfaz lee siempre el progreso local (`useProgress` →
  `ProgressStore`). Con cuenta, `SyncService` lo combina con `mergeStates`, una fusión pura,
  conmutativa e idempotente, y lo sube con `sync_push`. Los borrados dejan rastro para que
  ningún dispositivo los «resucite».
- **Estático por defecto:** 349 páginas prerenderizadas, entre ellas una ficha por palabra
  (útil para buscadores). Los datos del usuario solo existen en el cliente.

## Empezar

Requiere Node.js 20.9 o superior (probado con Node 24).

```bash
npm install
```

```bash
npm run dev
```

Abre <http://localhost:3000>. Sin configurar nada, Lexi funciona entera, sin cuentas. Para
activarlas, sigue [docs/05-despliegue.md](docs/05-despliegue.md) (las variables van en
`apps/web/.env.local`).

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas del núcleo y de la web (Vitest) |
| `npm run typecheck` · `npm run lint` | Tipos y ESLint |
| `npm run build` · `npm start` | Compilación y servidor de producción |
| `npm run test:sql` | Esquema de Supabase y sus reglas en un Postgres desechable (necesita Docker) |
| `npm run audio` | Regenera las grabaciones de voz ([docs/14](docs/14-audio.md)); necesita una clave de Google en `.env.audio.local` |
| `npm run qr` | Regenera el código QR de compartir ([docs/13](docs/13-compartir.md)) |

## Calidad

- **CI en cada pull request:** tipos, lint, pruebas, build y reglas SQL en Postgres. `master`
  está protegida y solo acepta PR con el CI en verde.
- **Más de 200 pruebas:** dominio y servicios con relojes inyectados, catálogo (AFI, ejemplos,
  formas verbales, ids únicos), migraciones del formato guardado, fusión y flujos de interfaz
  con React Testing Library.
- **Reglas del proyecto** (ids estables, migraciones, estadísticas solo desde el estado real…)
  en [CLAUDE.md](CLAUDE.md).

## Documentación

| | |
| --- | --- |
| [01 · Requisitos](docs/01-requisitos.md) | Requisitos funcionales, reglas de negocio y criterios de aceptación |
| [02 · Arquitectura](docs/02-arquitectura.md) | Capas y decisiones (ADR) |
| [03 · Datos y persistencia](docs/03-datos-y-persistencia.md) | Modelo, versionado y migraciones |
| [04 · Cuentas y sincronización](docs/04-cuentas-y-sincronizacion.md) | Supabase, fusión y seguridad |
| [05 · Desplegar](docs/05-despliegue.md) | Supabase, Google, correo, dominio, Vercel y estadísticas |
| [08 · Paquetes](docs/08-paquetes.md) | Esenciales y paquetes temáticos |
| [09 · Celebración](docs/09-celebracion.md) | Confeti y sonido al terminar una sesión |
| [10 · Ponerme a prueba](docs/10-ejercicios.md) | Dictado y completar la frase |
| [11 · Pendientes](docs/11-pendientes.md) | CAPTCHA, comprobaciones antes de anunciar y opcionales |
| [12 · Niveles e insignias](docs/12-niveles.md) | Puntos, niveles e insignias |
| [13 · Compartir](docs/13-compartir.md) | Página de compartir y código QR |
| [14 · Audio grabado](docs/14-audio.md) | Voces neuronales y cómo regenerarlas |

Los documentos 06 y 07 trataban de la antigua app móvil, retirada el 2026-10-21. Su código está
en la etiqueta de git [`movil-final`](https://github.com/dhluna/lexiapp/tree/movil-final).
Política de privacidad: [lexiapp.app/privacidad](https://lexiapp.app/privacidad).

## Limitaciones conocidas

- **Sin cuenta, el progreso vive en un solo navegador.** Borrar los datos del sitio lo
  elimina; en modo privado, Lexi avisa y funciona solo en memoria.
- **Si una grabación no está disponible** (sin conexión, o un texto nuevo aún sin grabar), se
  usa la voz del navegador, cuya calidad depende del dispositivo.
- **La pronunciación automática necesita una interacción previa** (política de los
  navegadores); el botón de escuchar funciona siempre.
- **La sesión en curso no se guarda:** al salir se conservan las respuestas dadas, pero no se
  puede retomar.
- **Las traducciones usan un español neutro con rasgos peninsulares** («móvil», «deberes»);
  cuando hay variantes habituales se dan las dos.
- Sin pruebas end-to-end automatizadas; los flujos se cubren con React Testing Library y se
  revisan en el navegador.

## Contribuir

Las contribuciones son bienvenidas. Lee [CONTRIBUTING.md](CONTRIBUTING.md): primero un issue,
luego un pull request desde tu fork. Los fallos de seguridad se reportan en privado
([SECURITY.md](SECURITY.md)). Todos los espacios del proyecto siguen el
[código de conducta](CODE_OF_CONDUCT.md).

## Licencia

[MIT](LICENSE): puedes usar, modificar y redistribuir el código, también en proyectos
comerciales, siempre que conserves el aviso de copyright y la licencia. Las tipografías
(Bricolage Grotesque, Atkinson Hyperlegible Next) tienen licencia OFL.

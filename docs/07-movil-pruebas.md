# 07 · Probar la app móvil

## 1. En tu móvil con Expo Go (desarrollo)

No hace falta compilar nada: Expo Go incluye todos los módulos que usa Lexi salvo las
notificaciones en Android (ver «Recordatorio» más abajo).

1. Instala **Expo Go** desde Google Play o la App Store.
2. En el ordenador, desde la raíz del repositorio:

   ```bash
   npm install
   ```

   ```bash
   npm run start -w @lexi/mobile
   ```

3. Escanea el código QR: en Android, desde Expo Go; en iOS, con la cámara. El móvil y el
   ordenador deben estar en la misma red Wi-Fi. Si la red lo impide, arranca con
   `npx expo start --tunnel` dentro de `apps/mobile`.

### Si Expo Go dice «Failed to download remote update»

El móvil no pudo descargar el código desde el ordenador. Mira la terminal de Expo:

- **El servidor se cerró con un error.** `expo-router` debe estar instalado en la raíz del
  monorepo (por eso aparece también en `devDependencies` del `package.json` raíz); si no,
  la CLI no lo encuentra al generar los tipos de rutas.
- **El servidor sigue en marcha.** El móvil no llega al ordenador. Comprueba que la URL
  `exp://…` usa la IP de tu Wi-Fi, no la de un adaptador virtual (WSL, Hyper-V). Para fijarla,
  en PowerShell dentro de `apps/mobile`:
  `$env:REACT_NATIVE_PACKAGER_HOSTNAME = '<tu IP>'; npx expo start --lan --clear`.
  Si aun así no conecta, usa `--tunnel`.

### Activar las cuentas en el móvil

1. Copia la plantilla y rellena los mismos valores que la web (con el prefijo
   `EXPO_PUBLIC_`):

   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```

2. En Supabase › **Authentication › URL Configuration › Redirect URLs**, añade:
   - `lexi://**` (builds de la app).
   - `exp://**` (Expo Go durante el desarrollo).
3. Reinicia `npm run start -w @lexi/mobile` para que cargue las variables.

**Google y los enlaces de correo en Expo Go necesitan el túnel.** Supabase no acepta
direcciones de vuelta cuyo servidor sea una IP (`exp://192.168.x.x:8081/…`), ni siquiera
escritas a mano en Redirect URLs, y te devuelve a la Site URL (`localhost:3000`). Arranca así,
dentro de `apps/mobile`, y escanea el QR nuevo:

```bash
npx expo start --tunnel
```

El túnel da una dirección con nombre (`exp://xxxx.exp.direct`) que sí encaja con `exp://**`.
La app instalada usa `lexi://` y no tiene este problema.

El inicio con Google usa el mismo cliente OAuth que la web: no hay que tocar Google Cloud.

### Qué comprobar

- **Practicar:** la palabra suena sola al aparecer; deslizar a la izquierda pasa a la siguiente
  y a la derecha vuelve; «Repasar» y «La sé» guardan la respuesta.
- **Voz:** si aparece «Tu dispositivo no tiene una voz en inglés», instala una (el aviso dice
  dónde) y vuelve a abrir Lexi.
- **Recordatorio:** en Ajustes › Recordatorio, actívalo y elige una hora cercana. Llega a esa
  hora salvo que ya hayas practicado ese día. **En Android no se puede probar con Expo Go**
  (no incluye `expo-notifications` desde el SDK 53): Ajustes lo indica y hay que usar el APK
  del apartado 2. En iOS sí funciona con Expo Go.
- **Cuenta:** entra con la misma cuenta que en la web; tras sincronizar, el progreso coincide.
  Practica con el modo avión activado y, al quitarlo, se sincroniza.

## 2. Builds internos con EAS (Android e iOS)

Para instalar la app sin Expo Go (como la tendrán tus testers). Requisitos que gestionas tú:

| Necesitas | Para |
| --- | --- |
| Cuenta gratuita de Expo | Compilar en la nube con EAS |
| Identificador de la app (p. ej. `com.tudominio.lexi`) | `ios.bundleIdentifier` y `android.package` en `app.json` |
| Apple Developer Program (99 USD/año) | Builds de iOS y TestFlight |

Pasos (dentro de `apps/mobile`):

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest build --profile preview --platform android
```

El perfil `preview` genera un **APK** que puedes instalar o compartir con un enlace. Para iOS:

```bash
npx eas-cli@latest build --profile production --platform ios
```

```bash
npx eas-cli@latest submit --platform ios
```

Después, en App Store Connect › TestFlight, añade a los testers internos.

Las variables `EXPO_PUBLIC_*` de los builds se configuran en EAS (`eas env:create`) o en
el panel de Expo; `.env.local` solo sirve en tu ordenador.

## Antes de publicar en las tiendas (fuera de esta fase)

- **Iniciar sesión con Apple:** la App Store lo exige en apps que ofrecen Google (norma 4.8).
- Icono, pantalla de inicio, capturas y textos de las fichas.
- Política de privacidad: Lexi guarda email y progreso de aprendizaje en Supabase.
- En Android, ficha de seguridad de los datos en Google Play.

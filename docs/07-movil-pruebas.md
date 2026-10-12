# 07 · Probar la app móvil

## 1. En tu móvil con Expo Go (desarrollo)

No hace falta compilar nada: todos los módulos que usa Lexi vienen incluidos en Expo Go.

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

El inicio con Google usa el mismo cliente OAuth que la web: no hay que tocar Google Cloud.

### Qué comprobar

- **Practicar:** la palabra suena sola al aparecer; deslizar a la izquierda pasa a la siguiente
  y a la derecha vuelve; «Repasar» y «La aprendí» guardan la respuesta.
- **Voz:** si aparece «Tu dispositivo no tiene una voz en inglés», instala una (el aviso dice
  dónde) y vuelve a abrir Lexi.
- **Recordatorio:** en Ajustes › Recordatorio, actívalo y elige una hora cercana. Llega a esa
  hora salvo que ya hayas practicado ese día.
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

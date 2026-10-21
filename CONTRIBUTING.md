# Cómo contribuir a Lexi

Gracias por querer mejorar Lexi. Para que tu tiempo no se pierda, sigue este orden.

## 1. Empieza por un issue

- **Errores:** abre un issue con la plantilla «Reportar un error».
- **Palabras del catálogo** (traducción, ejemplo, AFI o una palabra que falta): usa la
  plantilla «Corregir o sugerir una palabra».
- **Mejoras o funciones nuevas:** abre una propuesta y **espera a que se acepte** antes de
  programar. Lexi es deliberadamente sencilla y no toda buena idea encaja.
- **Seguridad:** nunca en un issue público. Mira [SECURITY.md](SECURITY.md).

Los issues con la etiqueta `good first issue` son un buen punto de partida.

## 2. Prepara tu copia

```bash
# Haz un fork en GitHub y clónalo
git clone https://github.com/<tu-usuario>/lexiapp.git
cd lexiapp
npm install
npm run dev          # web en http://localhost:3000, sin cuentas
```

Sin las variables `NEXT_PUBLIC_SUPABASE_*`, la web funciona sin cuentas y guarda el progreso en el navegador.
Para la mayoría de los cambios no necesitas Supabase.

## 3. Haz el cambio en una rama

```bash
git switch -c arreglar-racha
```

Antes de programar, lee:

- [`CLAUDE.md`](CLAUDE.md): convenciones y **reglas que no se deben romper**. Las más
  importantes: ids de palabra estables, migraciones del formato guardado, fusión de la
  sincronización y estadísticas solo desde el estado real.
- [`docs/`](docs/): requisitos de cada parte. Si cambias un comportamiento, actualiza su documento.

Comprueba todo antes de abrir el PR:

```bash
npm test && npm run typecheck && npm run lint && npm run build
npm run test:sql     # solo si tocas supabase/ (necesita Docker)
```

## 4. Abre el pull request

- Contra `master`, enlazando el issue («Closes #123») y con la lista de la plantilla completa.
- Un PR por tema: es más fácil de revisar y de deshacer.
- El CI tiene que pasar. La primera vez que contribuyes, un responsable aprueba que se ejecute.
- Se fusiona con *squash*: tu PR queda como un solo commit en `master`, y cada fusión se
  publica sola en lexiapp.app.

## Estilo

- TypeScript estricto. Las pruebas van junto al código (`*.test.ts(x)`).
- Textos de la interfaz en español, en tono directo y sin mayúsculas sostenidas. El inglés se
  marca con `lang="en"`.
- Accesibilidad: objetivos táctiles de 44 px, foco visible y respeto a `prefers-reduced-motion`.
- Colores solo con los tokens de `globals.css`.

## Licencia

Al contribuir aceptas que tu aporte se publique con la [licencia MIT](LICENSE) del proyecto.
Todos los espacios del proyecto siguen el [código de conducta](CODE_OF_CONDUCT.md).

## Qué cambia y por qué

<!-- Enlaza el issue que resuelve: «Closes #123». Los cambios que no son triviales necesitan un issue aceptado antes. -->

Closes #

## Cómo se probó

<!-- Pasos, capturas (móvil y escritorio, claro y oscuro si cambia la interfaz). -->

## Lista de comprobación

- [ ] `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` pasan (el CI lo comprueba).
- [ ] Añadí o actualicé pruebas.
- [ ] Si cambia un requisito o una regla, actualicé `docs/`.
- [ ] Si cambia el formato guardado: subí `CURRENT_VERSION`, añadí la migración y su prueba.
- [ ] Si cambia `supabase/migrations/`: añadí la regla a `supabase/tests/10_sync_rules.sql`.
- [ ] No renombré ni reutilicé ids de palabras.
- [ ] Textos de la interfaz en español; el inglés marcado con `lang="en"`.

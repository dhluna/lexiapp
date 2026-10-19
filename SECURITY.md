# Seguridad

## Reportar una vulnerabilidad

**No abras un issue público.** Usa una de estas vías privadas:

- [Reportar una vulnerabilidad en GitHub](https://github.com/dhluna/lexiapp/security/advisories/new)
  (preferida).
- Un correo a **hola@lexiapp.app** con el asunto «Seguridad».

Incluye qué encontraste, cómo reproducirlo y su posible impacto. Responderemos en un plazo de
7 días y te mantendremos informado hasta que se corrija. Si quieres, te daremos crédito en el aviso.

## Qué está dentro del alcance

- La web (https://lexiapp.app) y este repositorio.
- Las reglas de acceso a datos de Supabase (`supabase/migrations/`, RLS), por ejemplo leer o
  modificar el progreso de otra cuenta.
- La autenticación: inicio de sesión, enlaces de correo y Google.

Fuera del alcance: ataques de denegación de servicio, ingeniería social, informes automáticos
sin un impacto demostrado y fallos de servicios de terceros (Vercel, Supabase, Google).

Prueba solo con tus propias cuentas y no accedas a datos de otras personas.

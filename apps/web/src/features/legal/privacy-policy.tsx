import Link from "next/link";
import type { ReactNode } from "react";

/** The person responsible for the data (Ley 1581 de 2012) and how to reach them. */
export const DATA_CONTROLLER = "Diego Hernández";
export const PRIVACY_CONTACT = "PENDIENTE@ejemplo.com";
export const PRIVACY_UPDATED = "16 de octubre de 2026";

export function PrivacyPolicy() {
  return (
    <article className="mx-auto grid max-w-2xl gap-8 leading-relaxed">
      <header>
        <h1 className="font-display text-4xl font-bold tracking-tight">Política de privacidad</h1>
        <p className="mt-2 text-ink-soft">Última actualización: {PRIVACY_UPDATED}.</p>
      </header>

      <Section title="En resumen">
        <ul className="list-disc space-y-1 pl-5">
          <li>Sin cuenta, tu progreso se guarda solo en tu dispositivo.</li>
          <li>Con cuenta, guardamos tu email y tu progreso para sincronizarlo entre dispositivos.</li>
          <li>No hay publicidad, ni analítica, ni cookies de terceros, y no vendemos ni compartimos tus datos.</li>
          <li>Puedes eliminar tu cuenta y todos sus datos cuando quieras, desde Ajustes.</li>
        </ul>
      </Section>

      <Section title="Responsable del tratamiento">
        <p>
          {DATA_CONTROLLER}, persona natural residente en Colombia, es responsable del tratamiento de los datos
          personales de Lexi conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Contacto para cualquier
          asunto de privacidad: <a href={`mailto:${PRIVACY_CONTACT}`} className="font-semibold text-accent underline-offset-4 hover:underline">{PRIVACY_CONTACT}</a>.
        </p>
      </Section>

      <Section title="Qué datos tratamos y para qué">
        <h3 className="font-semibold">Si usas Lexi sin cuenta</h3>
        <p>
          Tu progreso (palabras practicadas, sesiones, racha y preferencias) se guarda en el almacenamiento de tu
          navegador o de la app. No sale de tu dispositivo y nosotros no tenemos acceso a él.
        </p>
        <h3 className="font-semibold">Si creas una cuenta</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Datos de la cuenta:</strong> tu email y, si entras con Google, el nombre y la foto que Google
            comparte al iniciar sesión (Lexi no los muestra ni los usa para nada más).
          </li>
          <li>
            <strong>Progreso de aprendizaje:</strong> el estado de cada palabra con sus fechas, los días practicados,
            las sesiones completadas, los paquetes añadidos y tus preferencias de práctica.
          </li>
          <li>
            <strong>Datos técnicos:</strong> los proveedores que alojan Lexi registran, por seguridad, datos como la
            dirección IP y la fecha de cada petición.
          </li>
        </ul>
        <p>
          Los usamos solo para identificarte, guardar tu progreso y sincronizarlo entre tus dispositivos. La base es
          la autorización que nos das al crear la cuenta, que puedes revocar en cualquier momento eliminándola.
        </p>
        <h3 className="font-semibold">Pronunciación</h3>
        <p>
          Lexi usa las voces de tu navegador o de tu teléfono. Si tu sistema usa voces en línea, el texto de la
          palabra que se pronuncia puede enviarse a su servicio de voz (por ejemplo, Google, Microsoft o Apple). No
          se envía ningún dato personal.
        </p>
      </Section>

      <Section title="Quién más interviene">
        <p>Para funcionar, Lexi se apoya en estos proveedores, que tratan los datos solo por cuenta nuestra:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong>: autenticación y base de datos de las cuentas.
          </li>
          <li>
            <strong>Vercel</strong>: alojamiento de la web.
          </li>
          <li>
            <strong>Google</strong>: solo si eliges «Continuar con Google».
          </li>
        </ul>
        <p>
          Sus servidores pueden estar fuera de Colombia (por ejemplo, en Estados Unidos o la Unión Europea). Al crear
          una cuenta autorizas esa transferencia, que se hace con las garantías de seguridad de cada proveedor.
        </p>
      </Section>

      <Section title="Cuánto tiempo los guardamos">
        <p>
          Mientras tengas la cuenta. Si la eliminas (Ajustes › Cuenta › Eliminar cuenta), se borran al momento tu
          cuenta y todo tu progreso de nuestros servidores. El progreso guardado en tu dispositivo se queda en él
          hasta que lo borres (Ajustes › Borrar progreso) o borres los datos del sitio o de la app.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>Como titular de los datos tienes derecho a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Pedir prueba de la autorización que nos diste y saber cómo usamos tus datos.</li>
          <li>Revocar la autorización y pedir que borremos tus datos (puedes hacerlo tú mismo eliminando la cuenta).</li>
          <li>Acceder gratis a tus datos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
        </ul>
        <p>
          Para ejercerlos, escribe a{" "}
          <a href={`mailto:${PRIVACY_CONTACT}`} className="font-semibold text-accent underline-offset-4 hover:underline">
            {PRIVACY_CONTACT}
          </a>{" "}
          desde el email de tu cuenta. Respondemos las consultas en un máximo de 10 días hábiles y los reclamos en
          15 días hábiles, como fija la ley.
        </p>
      </Section>

      <Section title="Menores de edad">
        <p>
          Si eres menor de edad, crea tu cuenta con la autorización de tu madre, padre o representante legal. También
          puedes usar Lexi sin cuenta: así ningún dato sale de tu dispositivo.
        </p>
      </Section>

      <Section title="Seguridad">
        <p>
          Las comunicaciones van cifradas (HTTPS). Cada cuenta solo puede leer y modificar sus propios datos, y las
          contraseñas no se guardan en claro: las gestiona el sistema de autenticación de Supabase.
        </p>
      </Section>

      <Section title="Cambios">
        <p>
          Si cambiamos esta política, actualizaremos la fecha de arriba y, si el cambio es importante, lo avisaremos
          en la app.
        </p>
      </Section>

      <p>
        <Link href="/" className="font-semibold text-accent underline-offset-4 hover:underline">
          Volver a Lexi
        </Link>
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

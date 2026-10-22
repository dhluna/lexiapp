"use client";

import { BellOff, Share } from "lucide-react";
import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-account";
import { useReminder } from "@/hooks/use-reminder";
import { REMINDER_TIMES } from "@lexi/core/domain/reminders";

/** Ajustes › Recordatorio: daily push notice on this device. Only with an account. */
export function ReminderSection() {
  const { snapshot: auth } = useAuth();
  const { snapshot, service } = useReminder();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const timeId = useId();

  if (auth?.status !== "signed-in" || !snapshot || !service) return null;

  const { status, time } = snapshot;
  const on = status === "on";
  const available = status === "on" || status === "off";

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>, done: string) => {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    setMessage(result.ok ? { tone: "ok", text: done } : { tone: "error", text: result.message ?? "Inténtalo de nuevo." });
  };

  return (
    <section aria-labelledby="recordatorio" className="grid gap-5 rounded-3xl bg-surface p-6 sm:p-8">
      <h2 id="recordatorio" className="font-display text-xl font-semibold">
        Recordatorio
      </h2>

      <Switch
        label="Recordatorio diario"
        hint="Te avisamos a esa hora si aún no has practicado ese día. Solo en este dispositivo."
        checked={on}
        disabled={busy || !available}
        onChange={(checked) =>
          void (checked
            ? run(() => service.enable(time), `Listo: te avisaremos a las ${time}.`)
            : run(() => service.disable(), "Recordatorio desactivado en este dispositivo."))
        }
      />

      {available && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor={timeId} className="font-semibold">
            Hora
          </label>
          <select
            id={timeId}
            value={time}
            disabled={busy}
            onChange={(event) => {
              const next = event.target.value;
              void run(() => service.setTime(next), on ? `Te avisaremos a las ${next}.` : "");
            }}
            className="min-h-11 rounded-xl border border-line bg-surface px-3 font-semibold tabular-nums disabled:opacity-60"
          >
            {REMINDER_TIMES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {status === "needs-install" && (
        <div className="rounded-2xl bg-sunken p-4">
          <p className="font-semibold">Primero, añade Lexi a la pantalla de inicio</p>
          <p className="mt-1 text-ink-soft">
            En iPhone y iPad las notificaciones solo funcionan con Lexi instalada: toca{" "}
            <Share aria-label="Compartir" className="inline size-4 align-[-2px]" /> y elige «Añadir a pantalla de
            inicio». Después, abre Lexi desde el icono y vuelve a Ajustes.
          </p>
        </div>
      )}

      {status === "blocked" && (
        <p className="flex gap-2 text-ink-soft">
          <BellOff aria-hidden className="mt-1 size-4 shrink-0" />
          Las notificaciones de Lexi están bloqueadas en este navegador. Permítelas en los ajustes del sitio y
          vuelve a esta página.
        </p>
      )}

      {status === "unsupported" && (
        <p className="flex gap-2 text-ink-soft">
          <BellOff aria-hidden className="mt-1 size-4 shrink-0" />
          Este navegador no puede mostrar notificaciones. Prueba con Chrome, Edge, Firefox o Safari actualizados.
        </p>
      )}

      <p
        role="status"
        aria-live="polite"
        className={message?.tone === "error" ? "font-semibold text-danger empty:hidden" : "font-semibold text-learned empty:hidden"}
      >
        {message?.text}
      </p>
    </section>
  );
}

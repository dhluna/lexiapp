"use client";

import { useState, type ReactNode } from "react";
import { VoiceNotice } from "@/components/voice-notice";
import { AccountSection } from "@/features/account/account-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { useCelebrationSound } from "@/hooks/use-celebration";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { cn } from "@/lib/cn";

const SESSION_SIZES = [5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }));

const RATES = [
  { value: 0.8, label: "Lenta" },
  { value: 1, label: "Normal" },
  { value: 1.2, label: "Rápida" },
] as const;

export function SettingsView() {
  const snapshot = useProgress();
  const actions = useProgressActions();
  const [celebrationSound, setCelebrationSound] = useCelebrationSound();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [message, setMessage] = useState("");

  if (!snapshot) return <Skeleton className="mx-auto h-96 max-w-2xl" />;

  const { state } = snapshot;
  const hasProgress =
    Object.keys(state.words).length > 0 || state.sessions.length > 0 || state.practiceDays.length > 0;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Ajustes</h1>

      <AccountSection />

      <Group title="Práctica">
        <RadioChips
          legend="Palabras por sesión"
          name="tamano"
          options={SESSION_SIZES}
          value={state.preferences.sessionSize}
          onChange={(sessionSize) => actions.updatePreferences({ sessionSize })}
        />
        <Switch
          label="Sonido de celebración"
          hint="Un acorde breve al terminar una sesión, junto al confeti. Solo en este dispositivo."
          checked={celebrationSound}
          onChange={setCelebrationSound}
        />
      </Group>

      <Group title="Pronunciación">
        <VoiceNotice />
        <Switch
          label="Pronunciación automática"
          hint="Escucha cada palabra al aparecer en la práctica."
          checked={state.preferences.autoPronounce}
          onChange={(autoPronounce) => actions.updatePreferences({ autoPronounce })}
        />
        <RadioChips
          legend="Velocidad"
          name="velocidad"
          options={RATES}
          value={state.preferences.speechRate}
          onChange={(speechRate) => actions.updatePreferences({ speechRate })}
        />
      </Group>

      <Group title="Datos">
        <div>
          <p className="font-semibold">Borrar progreso</p>
          <p className="mt-1 text-ink-soft">
            Elimina tus palabras aprendidas, la racha y las sesiones de este navegador. No se puede deshacer.
          </p>
          {confirmingReset ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="danger"
                onClick={() => {
                  actions.resetProgress();
                  setConfirmingReset(false);
                  setMessage("Progreso borrado.");
                }}
              >
                Sí, borrar todo
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingReset(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              className="mt-4"
              disabled={!hasProgress}
              onClick={() => {
                setMessage("");
                setConfirmingReset(true);
              }}
            >
              Borrar progreso
            </Button>
          )}
          <p role="status" aria-live="polite" className="mt-3 font-semibold text-learned empty:hidden">
            {message}
          </p>
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-3xl bg-surface p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function RadioChips({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset>
      <legend className="font-semibold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 font-semibold",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                checked ? "border-accent bg-accent text-accent-ink" : "border-line hover:border-ink-soft",
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-ink-soft">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-8 w-14 shrink-0 rounded-full bg-sunken ring-1 ring-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-6"
      />
    </label>
  );
}

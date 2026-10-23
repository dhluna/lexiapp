"use client";

import { ExternalLink, Mail, Share2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { VoiceNotice } from "@/components/voice-notice";
import { AccountSection, DeleteAccount } from "@/features/account/account-section";
import { ReminderSection } from "@/features/settings/reminder-section";
import { Switch } from "@/components/ui/switch";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { useCelebrationSound } from "@/hooks/use-celebration";
import { useSpeech } from "@/hooks/use-speech";
import { useVoice } from "@/hooks/use-voice";
import { VOICE_SAMPLE } from "@lexi/core/data/voices";
import { VoicePicker } from "@/features/settings/voice-picker";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { cn } from "@/lib/cn";
import { CONTACT_EMAIL, ISSUES_URL, suggestionMailto } from "@/lib/feedback";

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
  const [voice, setVoice] = useVoice();
  const { speak } = useSpeech();
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

      <ReminderSection />

      <Group title="Pronunciación">
        <VoiceNotice />
        <Switch
          label="Pronunciación automática"
          hint="Escucha cada palabra al aparecer en la práctica."
          checked={state.preferences.autoPronounce}
          onChange={(autoPronounce) => actions.updatePreferences({ autoPronounce })}
        />
        <div>
          <VoicePicker
            value={voice}
            onChange={(next) => {
              setVoice(next);
              speak(VOICE_SAMPLE);
            }}
          />
          <p className="mt-2 text-sm text-ink-soft">
            Al elegir una voz oirás una muestra. Son grabaciones, iguales en todos tus dispositivos; el AFI de
            las fichas es de inglés americano.
          </p>
        </div>
        <RadioChips
          legend="Velocidad"
          name="velocidad"
          options={RATES}
          value={state.preferences.speechRate}
          onChange={(speechRate) => actions.updatePreferences({ speechRate })}
        />
      </Group>

      <Group title="Compartir Lexi">
        <div>
          <p className="text-ink-soft">Envía el enlace o muestra el código QR a quien quiera aprender inglés.</p>
          <ButtonLink href="/compartir" className="mt-4">
            <Share2 aria-hidden className="size-4" />
            Compartir Lexi
          </ButtonLink>
        </div>
      </Group>

      <Group title="Sugerencias">
        <div>
          <p className="text-ink-soft">
            ¿Se te ocurre algo para mejorar Lexi o encontraste un error? Escríbenos a{" "}
            <span className="font-semibold text-ink">{CONTACT_EMAIL}</span>. Para avisar de una palabra, usa el enlace
            que hay en su ficha.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ButtonLink href={suggestionMailto()} variant="secondary">
              <Mail aria-hidden className="size-4" />
              Enviar una sugerencia
            </ButtonLink>
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-semibold text-accent underline-offset-4 hover:underline"
            >
              O en GitHub
              <ExternalLink aria-hidden className="size-4" />
            </a>
          </div>
        </div>
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
        <DeleteAccount />
      </Group>

      <p className="text-center text-sm">
        <Link href="/privacidad" className="font-semibold text-accent underline-offset-4 hover:underline">
          Política de privacidad
        </Link>
      </p>
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

function RadioChips<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
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

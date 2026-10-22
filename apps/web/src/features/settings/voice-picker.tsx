"use client";

import type { ComponentType } from "react";
import { FlagUK, FlagUS } from "@/components/flags";
import { cn } from "@/lib/cn";
import type { VoiceId } from "@lexi/core/data/voices";

const ACCENTS: { name: string; Flag: ComponentType<{ className?: string }>; voices: [VoiceId, string][] }[] = [
  { name: "EE. UU.", Flag: FlagUS, voices: [["us-female", "Mujer"], ["us-male", "Hombre"]] },
  { name: "Reino Unido", Flag: FlagUK, voices: [["uk-female", "Mujer"], ["uk-male", "Hombre"]] },
];

/**
 * The recorded voice, grouped by accent: one row per country (flag + name) with "Mujer" and
 * "Hombre". A single radio group; each option's accessible name says both ("Reino Unido · Hombre").
 */
export function VoicePicker({ value, onChange }: { value: VoiceId; onChange: (voice: VoiceId) => void }) {
  return (
    <fieldset>
      <legend className="font-semibold">Voz</legend>
      <div className="mt-2 grid gap-2">
        {ACCENTS.map(({ name, Flag, voices }) => {
          const active = voices.some(([id]) => id === value);
          return (
            <div
              key={name}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border p-2 pl-3",
                active ? "border-accent/40 bg-accent-soft/50" : "border-line",
              )}
            >
              <span className="flex min-w-36 flex-1 items-center gap-3 font-semibold">
                <Flag className="h-5 w-auto shrink-0 rounded-[3px] ring-1 ring-line" />
                {name}
              </span>
              <span className="flex gap-2">
                {voices.map(([id, gender]) => {
                  const checked = id === value;
                  return (
                    <label
                      key={id}
                      className={cn(
                        "inline-flex min-h-11 min-w-24 cursor-pointer items-center justify-center rounded-full border px-4 font-semibold",
                        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                        checked ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-ink-soft",
                      )}
                    >
                      <input
                        type="radio"
                        name="voz"
                        aria-label={`${name} · ${gender}`}
                        className="sr-only"
                        checked={checked}
                        onChange={() => onChange(id)}
                      />
                      {gender}
                    </label>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

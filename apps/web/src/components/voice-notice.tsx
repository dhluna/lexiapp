"use client";

import { CircleAlert } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/cn";

/**
 * Shown when the system has no English voice: the browser then reads English with
 * another language's voice, which teaches the wrong pronunciation.
 */
export function VoiceNotice({ className }: { className?: string }) {
  const { availability } = useSpeech();
  if (availability !== "fallback") return null;
  return (
    <div role="note" className={cn("flex gap-3 rounded-2xl bg-review-soft p-4 text-review", className)}>
      <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">Tu sistema no tiene una voz en inglés</p>
        <p className="mt-1">
          Se usa otra voz y la pronunciación no será fiable. Instala una voz en inglés y recarga la
          página: en Windows, Configuración › Hora e idioma › Voz › Agregar voces; en Mac, Ajustes
          del Sistema › Accesibilidad › Contenido leído.
        </p>
      </div>
    </div>
  );
}

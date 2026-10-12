"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./ui/button";

interface SpeakButtonProps {
  text: string;
  /** Accessible label, e.g. "Escuchar «luggage»". */
  label: string;
  size?: "md" | "sm";
  showText?: boolean;
  className?: string;
}

export function SpeakButton({ text, label, size = "md", showText = false, className }: SpeakButtonProps) {
  const { availability, speakingText, speak, stop } = useSpeech();
  const unsupported = availability === "unsupported";
  const speaking = speakingText === text;

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
      disabled={unsupported}
      aria-label={unsupported ? `${label} (tu navegador no permite reproducir voz)` : label}
      aria-pressed={speaking}
      title={unsupported ? "Tu navegador no permite reproducir voz" : label}
      className={cn(
        buttonClasses("secondary", showText ? "md" : "icon"),
        size === "sm" && !showText && "size-9 rounded-lg",
        speaking && "border-accent/40 bg-accent-soft text-accent hover:border-accent/60",
        className,
      )}
    >
      {unsupported ? (
        <VolumeX aria-hidden className={size === "sm" ? "size-4" : "size-5"} />
      ) : speaking ? (
        <SoundWave className={size === "sm" ? "h-3.5" : "h-4"} />
      ) : (
        <Volume2 aria-hidden className={size === "sm" ? "size-4" : "size-5"} />
      )}
      {showText && <span>{speaking ? "Detener" : "Escuchar"}</span>}
    </button>
  );
}

/** Three bars that rise and fall while audio plays (static with reduced motion). */
function SoundWave({ className }: { className: string }) {
  return (
    <span aria-hidden className={cn("flex items-center gap-[3px]", className)}>
      {[0, 180, 90].map((delay) => (
        <span
          key={delay}
          className="sound-bar h-full w-[3px] rounded-full bg-current"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

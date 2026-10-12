"use client";

import { Check, ChevronLeft, ChevronRight, Flag, Repeat, Volume2, VolumeOff, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { getWord } from "@lexi/core/data/catalog";
import { STATUS_LABELS } from "@lexi/core/domain/labels";
import { isLastWord, type PracticeSession, type SessionAnswer } from "@lexi/core/domain/session";
import { VoiceNotice } from "@/components/voice-notice";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/cn";
import { WordDetails } from "@/features/vocabulary/word-details";
import { WordHeading } from "@/features/vocabulary/word-heading";

interface PracticeCardProps {
  session: PracticeSession;
  autoPronounce: boolean;
  onToggleAutoPronounce: () => void;
  onAnswer: (answer: SessionAnswer) => void;
  onNext: () => void;
  onPrevious: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("button, a, input, select, textarea") !== null;
}

export function PracticeCard({
  session,
  autoPronounce,
  onToggleAutoPronounce,
  onAnswer,
  onNext,
  onPrevious,
}: PracticeCardProps) {
  const word = getWord(session.wordIds[session.index]);
  const term = word?.term ?? "";
  const currentAnswer = word ? session.answers[word.id] : undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const { availability, speak, stop } = useSpeech();
  const canSpeak = availability !== null && availability !== "unsupported";
  const position = session.index + 1;
  const total = session.wordIds.length;
  const hasPrevious = session.index > 0;
  const last = isLastWord(session);
  const animateEntry = session.index > 0 || Object.keys(session.answers).length > 0;

  // Move focus to the new word so keyboard and screen reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [session.index]);

  // Say each new word out loud. The button stays available to repeat it.
  useEffect(() => {
    if (autoPronounce && canSpeak && term) speak(term);
  }, [term, autoPronounce, canSpeak, speak]);

  // Leaving the practice silences any pending playback.
  useEffect(() => stop, [stop]);

  // Shortcuts: Space = listen, 1 = review, 2 = learned, ← / → = previous / next.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const free = !isInteractiveTarget(event.target);
      if (event.key === " " && free) {
        event.preventDefault();
        speak(term);
      } else if (event.key === "1") {
        onAnswer("review");
      } else if (event.key === "2") {
        onAnswer("learned");
      } else if (event.key === "ArrowRight" && free) {
        onNext();
      } else if (event.key === "ArrowLeft" && free) {
        onPrevious();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [term, speak, onAnswer, onNext, onPrevious]);

  if (!word) return null;

  const previousLabel = "Palabra anterior";
  const nextLabel = last ? "Terminar sesión" : "Palabra siguiente";

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
          aria-label="Salir de la práctica. Tus respuestas ya están guardadas."
          title="Salir (tus respuestas ya están guardadas)"
        >
          <X aria-hidden className="size-6" />
        </Link>
        <ol aria-label={`Palabra ${position} de ${total}`} className="flex flex-1 gap-1">
          {session.wordIds.map((id, i) => {
            const answer = session.answers[id];
            return (
              <li
                key={id}
                aria-hidden
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  answer === "learned" && "bg-learned",
                  answer === "review" && "bg-review",
                  !answer && (i < session.index ? "bg-ink-soft/30" : "bg-sunken"),
                  i === session.index && "outline-2 outline-offset-2 outline-accent",
                )}
              />
            );
          })}
        </ol>
        {/* Phones: arrows sit next to the counter; wide screens use the side arrows. */}
        <NavButton
          compact
          label={previousLabel}
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="lg:hidden"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </NavButton>
        <span className="min-w-9 text-center text-sm font-semibold text-ink-soft tabular-nums">
          {position}/{total}
        </span>
        <NavButton compact label={nextLabel} onClick={onNext} className="lg:hidden">
          {last ? <Flag aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-5" />}
        </NavButton>
        <button
          type="button"
          onClick={onToggleAutoPronounce}
          disabled={!canSpeak}
          aria-pressed={autoPronounce}
          aria-label="Pronunciación automática"
          title={autoPronounce ? "Pronunciación automática activada" : "Pronunciación automática desactivada"}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
            autoPronounce ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-sunken",
          )}
        >
          {autoPronounce ? <Volume2 aria-hidden className="size-5" /> : <VolumeOff aria-hidden className="size-5" />}
        </button>
      </div>

      <VoiceNotice />

      <div className="relative">
        <SideRail side="left">
          <NavButton label={previousLabel} onClick={onPrevious} disabled={!hasPrevious}>
            <ChevronLeft aria-hidden className="size-6" />
          </NavButton>
        </SideRail>

        <article
          key={word.id}
          className={cn(
            "rounded-3xl bg-surface p-6 shadow-[0_1px_0_var(--line)] sm:p-8",
            // The first card appears in place; later ones slide in to show the change.
            animateEntry && "animate-card-in",
          )}
        >
          <WordHeading ref={headingRef} word={word} />
          {currentAnswer && (
            <p
              className={cn(
                "mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
                currentAnswer === "learned" ? "bg-learned-soft text-learned" : "bg-review-soft text-review",
              )}
            >
              {currentAnswer === "learned" ? (
                <Check aria-hidden className="size-4" strokeWidth={3} />
              ) : (
                <Repeat aria-hidden className="size-4" />
              )}
              Marcaste: {STATUS_LABELS[currentAnswer].toLowerCase()}
            </p>
          )}
          <div className="mt-6 border-t border-line pt-6">
            <WordDetails word={word} />
          </div>
          <AnswerBar currentAnswer={currentAnswer} onAnswer={onAnswer} />
        </article>

        <SideRail side="right">
          <NavButton label={nextLabel} onClick={onNext}>
            {last ? <Flag aria-hidden className="size-5" /> : <ChevronRight aria-hidden className="size-6" />}
          </NavButton>
        </SideRail>
      </div>

    </div>
  );
}

/** Column beside the card (wide screens only); the arrow stays mid-screen while scrolling. */
function SideRail({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  return (
    <div className={cn("absolute inset-y-0 hidden w-12 lg:block", side === "left" ? "-left-20" : "-right-20")}>
      <div className="sticky top-[45vh]">{children}</div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  compact,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-30",
        compact ? "size-11 hover:bg-sunken" : "size-12 bg-surface shadow-sm ring-1 ring-line hover:ring-ink-soft",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The card's own footer. It sticks to the bottom of the screen while a long card
 * scrolls, but stays part of the card: same surface, divider and radii.
 */
function AnswerBar({
  currentAnswer,
  onAnswer,
}: {
  currentAnswer: SessionAnswer | undefined;
  onAnswer: (answer: SessionAnswer) => void;
}) {
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-6 -mb-6 mt-6 flex gap-3 rounded-b-3xl border-t border-line bg-surface/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8 md:bottom-0">
      <AnswerButton
        onClick={() => onAnswer("review")}
        shortcut="1"
        pressed={currentAnswer === "review"}
        className={cn(
          "flex-1 text-ink",
          currentAnswer === "review" ? "bg-review-soft ring-2 ring-review/60 ring-inset" : "bg-sunken hover:bg-line/70",
        )}
      >
        <Repeat aria-hidden className="size-[18px] text-review" />
        Repasar
      </AnswerButton>
      <AnswerButton
        onClick={() => onAnswer("learned")}
        shortcut="2"
        pressed={currentAnswer === "learned"}
        className={cn(
          "flex-[1.4] bg-accent text-accent-ink hover:brightness-110",
          currentAnswer === "learned" && "ring-2 ring-accent/35 ring-offset-2 ring-offset-surface",
        )}
      >
        <Check aria-hidden className="size-[18px]" strokeWidth={2.75} />
        La aprendí
      </AnswerButton>
    </div>
  );
}

function AnswerButton({
  onClick,
  shortcut,
  pressed,
  className,
  children,
}: {
  onClick: () => void;
  shortcut: string;
  pressed: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-keyshortcuts={shortcut}
      aria-pressed={pressed}
      title={`Atajo: ${shortcut}`}
      className={cn(
        "inline-flex h-13 min-w-0 items-center justify-center gap-2 rounded-xl px-3 font-semibold whitespace-nowrap transition active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </button>
  );
}

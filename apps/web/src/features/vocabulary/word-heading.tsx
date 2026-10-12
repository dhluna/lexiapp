import type { Ref } from "react";
import { SpeakButton } from "@/components/speak-button";
import { getCategory } from "@lexi/core/data/categories";
import { PART_OF_SPEECH_LABELS } from "@lexi/core/domain/labels";
import type { Word } from "@lexi/core/domain/types";
import { cn } from "@/lib/cn";

/** Approximate visual width in "average letters": m/w are wide, i/l/t/f/r/j narrow. */
function visualLength(word: string) {
  let units = 0;
  for (const ch of word) units += "mw".includes(ch) ? 1.4 : "il".includes(ch) ? 0.5 : "tfrj".includes(ch) ? 0.65 : 1;
  return units;
}

/**
 * Long words get a smaller size so they fit next to the audio button on a 375 px phone
 * without breaking mid-word (thresholds measured with the display font).
 */
function termSize(term: string) {
  const longest = Math.max(...term.split(" ").map(visualLength));
  if (longest > 12.5) return "text-2xl sm:text-4xl";
  if (longest > 8.2) return "text-4xl sm:text-5xl";
  return "text-5xl sm:text-6xl";
}

interface WordHeadingProps {
  word: Word;
  as?: "h1" | "h2";
  ref?: Ref<HTMLHeadingElement>;
}

/** The English term set large with the highlighter stroke, plus its pronunciation button. */
export function WordHeading({ word, as: Tag = "h2", ref }: WordHeadingProps) {
  return (
    <div>
      <p className="flex flex-wrap gap-2 text-sm font-semibold">
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-accent">
          {PART_OF_SPEECH_LABELS[word.partOfSpeech]}
        </span>
        <span className="rounded-full bg-sunken px-2.5 py-0.5 text-ink-soft">
          {getCategory(word.category)?.name ?? word.category}
        </span>
      </p>
      <div className="mt-2 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <Tag
            ref={ref}
            tabIndex={-1}
            lang="en"
            className={cn(
              "font-display leading-[1.1] font-bold tracking-tight outline-none [overflow-wrap:anywhere]",
              termSize(word.term),
            )}
          >
            <span key={word.id} className="marker animate-marker">
              {word.term}
            </span>
          </Tag>
          <p className="mt-2 font-ipa text-lg text-ink-soft" title="Transcripción fonética (inglés americano)">
            <span className="sr-only">Transcripción fonética: </span>/{word.ipa}/
          </p>
        </div>
        <SpeakButton
          text={word.term}
          label={`Escuchar la pronunciación de «${word.term}»`}
          className="size-12 rounded-2xl"
        />
      </div>
    </div>
  );
}

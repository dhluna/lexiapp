import type { Ref } from "react";
import { SpeakButton } from "@/components/speak-button";
import { getCategory } from "@lexi/core/data/categories";
import { PART_OF_SPEECH_LABELS } from "@lexi/core/domain/labels";
import { termScale } from "@lexi/core/domain/term-scale";
import type { Word } from "@lexi/core/domain/types";
import { cn } from "@/lib/cn";

const TERM_CLASSES = {
  lg: "text-5xl sm:text-6xl",
  md: "text-4xl sm:text-5xl",
  sm: "text-2xl sm:text-4xl",
} as const;

/** Long words get a smaller size (shared rule with the mobile app). */
const termSize = (term: string) => TERM_CLASSES[termScale(term)];

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

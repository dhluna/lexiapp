import { SpeakButton } from "@/components/speak-button";
import type { Word } from "@/domain/types";

/** Meaning, verb forms and examples. Shared by the practice card and the word sheet. */
export function WordDetails({ word }: { word: Word }) {
  return (
    <div className="grid gap-6">
      <div>
        <p className="font-display text-2xl font-semibold text-accent">{word.translation}</p>
        <p className="mt-2 max-w-prose text-lg leading-relaxed">{word.definition}</p>
      </div>

      {word.verbForms && (
        <div>
          <h3 className="text-sm font-semibold text-ink-soft">
            Formas del verbo{word.verbForms.irregular ? " (irregular)" : ""}
          </h3>
          <dl className="mt-2 grid grid-cols-3 overflow-hidden rounded-xl border border-line text-center">
            <VerbForm term="Infinitivo" value={word.term} />
            <VerbForm term="Pasado" value={word.verbForms.past} />
            <VerbForm term="Participio" value={word.verbForms.pastParticiple} />
          </dl>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink-soft">Ejemplos</h3>
        <ul className="mt-2 grid gap-3">
          {word.examples.map((example) => (
            <li key={example.en} className="flex items-start gap-3 rounded-xl bg-sunken p-4">
              <div className="min-w-0 flex-1">
                <p lang="en" className="text-lg font-semibold">
                  {example.en}
                </p>
                <p className="mt-1 text-ink-soft">{example.es}</p>
              </div>
              <SpeakButton text={example.en} label={`Escuchar el ejemplo: ${example.en}`} size="sm" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VerbForm({ term, value }: { term: string; value: string }) {
  return (
    <div className="border-line px-2 py-3 not-first:border-l">
      <dt className="text-xs text-ink-soft">{term}</dt>
      <dd lang="en" className="mt-0.5 font-semibold break-words">
        {value}
      </dd>
    </div>
  );
}

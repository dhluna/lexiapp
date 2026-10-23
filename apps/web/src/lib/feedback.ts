import type { Word } from "@lexi/core/domain/types";
import { SHARE_URL } from "@lexi/core/data/share";

/** Where suggestions and error reports arrive (also the privacy contact). */
export const CONTACT_EMAIL = "hola@lexiapp.app";

/** Public issue forms, for people who prefer GitHub (.github/ISSUE_TEMPLATE). */
export const ISSUES_URL = "https://github.com/dhluna/lexiapp/issues/new/choose";

function mailto(subject: string, body: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A general suggestion: an empty message with a clear subject. */
export function suggestionMailto(): string {
  return mailto("Sugerencia para Lexi", "Hola:\n\n");
}

/** A report about one word, with the word and its link already filled in. */
export function wordReportMailto(word: Pick<Word, "id" | "term">): string {
  return mailto(
    `Error en la palabra «${word.term}»`,
    [
      `Palabra: ${word.term} (${word.id})`,
      `${SHARE_URL}/vocabulario/${word.id}`,
      "",
      "¿Qué está mal? (traducción, definición, ejemplo, formas del verbo, pronunciación o AFI)",
      "",
      "",
      "¿Cómo debería ser? (si tienes una fuente, mejor)",
      "",
      "",
    ].join("\n"),
  );
}

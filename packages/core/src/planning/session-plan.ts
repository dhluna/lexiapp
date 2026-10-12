import { WORDS } from "../data/catalog";
import type { CategoryId, UserProgressState } from "../domain/types";

export interface SessionPlan {
  review: number;
  fresh: number;
  learned: number;
  total: number;
}

/** How many words of the pool are pending review, new or learned (uncapped totals). */
export function poolCounts(state: UserProgressState, categoryId: CategoryId | null = null) {
  const pool = categoryId ? WORDS.filter((w) => w.category === categoryId) : WORDS;
  let pending = 0;
  let fresh = 0;
  for (const word of pool) {
    const status = state.words[word.id]?.status;
    if (status === "review") pending += 1;
    else if (!status) fresh += 1;
  }
  return { pending, fresh, learned: pool.length - pending - fresh, total: pool.length };
}

/** What the next session will contain, following the same order as `selectSessionWords`. */
export function planSession(
  state: UserProgressState,
  size: number,
  categoryId: CategoryId | null = null,
): SessionPlan {
  const { pending, fresh, learned: learnedTotal } = poolCounts(state, categoryId);
  const review = Math.min(pending, size);
  const freshIn = Math.min(fresh, size - review);
  const learned = Math.min(learnedTotal, size - review - freshIn);
  return { review, fresh: freshIn, learned, total: review + freshIn + learned };
}

/** "Sesión de 10 palabras: 3 por repasar y 7 nuevas." */
export function planText({ review, fresh, learned, total }: SessionPlan): string {
  const parts = [
    review > 0 && `${review} por repasar`,
    fresh > 0 && `${fresh} ${fresh === 1 ? "nueva" : "nuevas"}`,
    learned > 0 && `${learned} para afianzar`,
  ].filter(Boolean) as string[];
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}` : parts[0];
  return `Sesión de ${total} palabras: ${list}.`;
}

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@lexi/core/data/categories";
import type { CategoryId, UserProgressState } from "@lexi/core/domain/types";
import { planSession, planText, poolCounts } from "@lexi/core/planning/session-plan";

interface PracticeSetupProps {
  state: UserProgressState;
  onStart: (categoryId: CategoryId | null) => void;
}

/** One obvious action (today's session) and, below, one tap per category. No filters. */
export function PracticeSetup({ state, onStart }: PracticeSetupProps) {
  const size = state.preferences.sessionSize;
  const today = planSession(state, size);

  return (
    <div className="mx-auto grid max-w-2xl gap-10">
      <section aria-labelledby="sesion-hoy" className="rounded-3xl bg-surface p-6 sm:p-8">
        <h1 id="sesion-hoy" className="font-display text-4xl font-bold tracking-tight">
          Practicar
        </h1>
        <p className="mt-2 text-lg text-ink-soft">{planText(today)}</p>
        <Button size="lg" className="mt-6 w-full sm:w-auto sm:px-10" onClick={() => onStart(null)}>
          Empezar
        </Button>
        <p className="mt-4 text-sm text-ink-soft">
          Primero salen las palabras por repasar y luego las nuevas.{" "}
          <Link href="/ajustes" className="font-semibold text-accent underline-offset-4 hover:underline">
            Cambiar palabras por sesión
          </Link>
        </p>
      </section>

      <section aria-labelledby="por-categoria">
        <h2 id="por-categoria" className="font-display text-xl font-semibold">
          O practica una categoría
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((category) => {
            const counts = poolCounts(state, category.id);
            const summary =
              counts.pending > 0
                ? `${counts.pending} por repasar`
                : counts.fresh > 0
                  ? `${counts.fresh} ${counts.fresh === 1 ? "nueva" : "nuevas"}`
                  : "Todo aprendido";
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => onStart(category.id)}
                  aria-label={`Practicar ${category.name}: ${summary}`}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <CategoryIcon id={category.id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{category.name}</span>
                    <span className={counts.pending > 0 ? "block text-sm text-review" : "block text-sm text-ink-soft"}>
                      {summary}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

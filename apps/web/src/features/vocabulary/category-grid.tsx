import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CATEGORIES } from "@lexi/core/data/categories";
import { getWordsByCategory } from "@lexi/core/data/catalog";
import type { ProgressStats } from "@lexi/core/domain/progress";

/** Entry point to the catalog: one card per category with its real progress. */
export function CategoryGrid({ stats }: { stats: ProgressStats | null }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORIES.map((category) => {
        const c = stats?.byCategory[category.id];
        const total = c?.total ?? getWordsByCategory(category.id).length;
        return (
          <li key={category.id}>
            <Link
              href={`/vocabulario?categoria=${category.id}`}
              className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <CategoryIcon id={category.id} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{category.name}</span>
                  <span className="block text-sm text-ink-soft">
                    {c ? `${c.learned} de ${total} aprendidas` : `${total} palabras`}
                  </span>
                </span>
              </span>
              <ProgressBar
                value={c?.learned ?? 0}
                secondary={c?.review ?? 0}
                max={total}
                label={`Progreso en ${category.name}`}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

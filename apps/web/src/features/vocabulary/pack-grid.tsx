import { Plus } from "lucide-react";
import Link from "next/link";
import { PackIcon } from "@/components/pack-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { activePackIds, getWordsByPack } from "@lexi/core/data/catalog";
import { PACKS, type Pack } from "@lexi/core/data/packs";
import { getWordStatus } from "@lexi/core/domain/progress";
import type { PackId, UserProgressState } from "@lexi/core/domain/types";

interface PackGridProps {
  state: UserProgressState | null;
  onAdd: (packId: PackId) => void;
}

/**
 * Entry point to the catalog: the packs in the learner's practice, with their real progress,
 * and below, the packs they can add.
 */
export function PackGrid({ state, onAdd }: PackGridProps) {
  // Which packs are active is only known on the client: no grid that jumps after hydration.
  if (!state) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Cargando tus paquetes">
        {PACKS.map((pack) => (
          <Skeleton key={pack.id} className="h-28" />
        ))}
      </div>
    );
  }
  const active = activePackIds(state);
  const mine = PACKS.filter((p) => active.includes(p.id));
  const more = PACKS.filter((p) => !active.includes(p.id));

  return (
    <div className="grid gap-8">
      <section aria-labelledby="mis-paquetes">
        <h2 id="mis-paquetes" className="mb-4 font-display text-2xl font-semibold">
          En tu práctica
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((pack) => (
            <li key={pack.id}>
              <PackCard pack={pack} state={state} active />
            </li>
          ))}
        </ul>
      </section>

      {more.length > 0 && (
        <section aria-labelledby="mas-paquetes">
          <h2 id="mas-paquetes" className="font-display text-2xl font-semibold">
            Más paquetes
          </h2>
          <p className="mt-1 mb-4 text-ink-soft">Añade los que te interesen: sus palabras entrarán en tu práctica diaria.</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((pack) => (
              <li key={pack.id}>
                <PackCard pack={pack} state={state} active={false} onAdd={state ? () => onAdd(pack.id) : undefined} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PackCard({
  pack,
  state,
  active,
  onAdd,
}: {
  pack: Pack;
  state: UserProgressState | null;
  active: boolean;
  onAdd?: () => void;
}) {
  const words = getWordsByPack(pack.id);
  let learned = 0;
  let review = 0;
  for (const word of words) {
    const status = getWordStatus(state, word.id);
    if (status === "learned") learned += 1;
    else if (status === "review") review += 1;
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors focus-within:border-accent hover:border-accent">
      <Link href={`/vocabulario?paquete=${pack.id}`} className="flex items-center gap-3 rounded-xl">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <PackIcon id={pack.id} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">{pack.name}</span>
          <span className="block text-sm text-ink-soft">
            {active && state ? `${learned} de ${words.length} aprendidas` : `${words.length} palabras`}
          </span>
        </span>
      </Link>
      {active ? (
        <ProgressBar value={learned} secondary={review} max={words.length} label={`Progreso en ${pack.name}`} />
      ) : (
        <div className="mt-auto flex items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">{pack.description}</p>
          {onAdd && (
            <Button variant="secondary" onClick={onAdd} aria-label={`Añadir ${pack.name} a mi práctica`}>
              <Plus aria-hidden className="size-4" />
              Añadir
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

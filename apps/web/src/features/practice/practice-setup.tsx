import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { PackIcon } from "@/components/pack-icon";
import { Button } from "@/components/ui/button";
import { activePackIds } from "@lexi/core/data/catalog";
import { getPack, PACKS } from "@lexi/core/data/packs";
import type { PackId, UserProgressState } from "@lexi/core/domain/types";
import { planSession, planText, poolCounts } from "@lexi/core/planning/session-plan";

interface PracticeSetupProps {
  state: UserProgressState;
  onStart: (packId: PackId | null) => void;
}

/** One obvious action (today's session) and, below, one tap per active pack. No filters. */
export function PracticeSetup({ state, onStart }: PracticeSetupProps) {
  const size = state.preferences.sessionSize;
  const today = planSession(state, size);
  const packs = activePackIds(state).flatMap((id) => getPack(id) ?? []);
  const morePacks = packs.length < PACKS.length;

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

      <section aria-labelledby="por-paquete">
        <h2 id="por-paquete" className="font-display text-xl font-semibold">
          O practica un paquete
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {packs.map((pack) => {
            const counts = poolCounts(state, pack.id);
            const summary =
              counts.pending > 0
                ? `${counts.pending} por repasar`
                : counts.fresh > 0
                  ? `${counts.fresh} ${counts.fresh === 1 ? "nueva" : "nuevas"}`
                  : "Todo aprendido";
            return (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => onStart(pack.id)}
                  aria-label={`Practicar ${pack.name}: ${summary}`}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <PackIcon id={pack.id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{pack.name}</span>
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
        {morePacks && (
          <Link
            href="/vocabulario"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl font-semibold text-accent underline-offset-4 hover:underline"
          >
            <Plus aria-hidden className="size-4" />
            Añadir más paquetes
          </Link>
        )}
      </section>
    </div>
  );
}

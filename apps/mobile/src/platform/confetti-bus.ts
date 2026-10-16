import type { Celebration } from "@lexi/core/domain/celebration";

type Kind = Exclude<Celebration, "none">;
type Listener = (kind: Kind) => void;

const listeners = new Set<Listener>();

/**
 * Bridges the Celebrator (a plain service) and the confetti layer mounted at the root of
 * the app, which draws over every screen.
 */
export const confettiBus = {
  emit(kind: Kind): void {
    for (const listener of listeners) listener(kind);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

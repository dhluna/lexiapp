import type { Celebration } from "@lexi/core/domain/celebration";

const GOLD = ["#ffd23f", "#ffb703", "#fff1a8", "#f59e0b"];

/** Reads a color token from globals.css, so the confetti matches the light or dark theme. */
function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return value || fallback;
}

/**
 * Confetti over the page (canvas-confetti, loaded on demand). The canvas ignores pointer
 * events and is skipped entirely when the system asks to reduce motion.
 */
export async function launchConfetti(kind: Exclude<Celebration, "none">): Promise<void> {
  if (typeof window === "undefined") return;
  const { default: confetti } = await import("canvas-confetti");
  const base = { disableForReducedMotion: true, zIndex: 60, ticks: 240, scalar: 1.05 };

  if (kind === "normal") {
    const colors = [token("accent", "#3a3ed6"), token("learned", "#0f7448"), token("review", "#9a5600"), "#ffffff"];
    void confetti({ ...base, particleCount: 130, spread: 85, startVelocity: 48, origin: { y: 0.65 }, colors });
    return;
  }

  // Perfect: golden bursts from both sides, then stars from the middle.
  const colors = [...GOLD, token("accent", "#3a3ed6")];
  void confetti({ ...base, particleCount: 90, angle: 60, spread: 70, startVelocity: 60, origin: { x: 0, y: 0.75 }, colors });
  void confetti({ ...base, particleCount: 90, angle: 120, spread: 70, startVelocity: 60, origin: { x: 1, y: 0.75 }, colors });
  window.setTimeout(() => {
    void confetti({ ...base, particleCount: 60, spread: 110, startVelocity: 38, origin: { y: 0.45 }, shapes: ["star"], colors: GOLD });
  }, 350);
}

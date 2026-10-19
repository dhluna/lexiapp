import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DARK, LIGHT, type Palette } from "@lexi/core/theme/tokens";

/** Custom properties of the first `:root { … }` block after `start`. */
function readRoot(css: string, start: number): Record<string, string> {
  const open = css.indexOf(":root {", start);
  const block = css.slice(open, css.indexOf("}", open));
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

const toCss = (palette: Palette) =>
  Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, v.toLowerCase()]));

describe("design tokens", () => {
  const css = readFileSync(join(__dirname, "globals.css"), "utf8");

  it("the web's light palette matches the shared tokens", () => {
    expect(readRoot(css, 0)).toEqual(toCss(LIGHT));
  });

  it("the web's dark palette matches the shared tokens", () => {
    expect(readRoot(css, css.indexOf("prefers-color-scheme: dark"))).toEqual(toCss(DARK));
  });
});

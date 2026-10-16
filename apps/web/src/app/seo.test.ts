import { describe, expect, it } from "vitest";
import { WORDS } from "@lexi/core/data/catalog";
import robots from "./robots";
import sitemap from "./sitemap";

describe("robots and sitemap", () => {
  it("lists the public pages and every word, never personal screens", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain("/vocabulario");
    expect(urls).toContain("/privacidad");
    for (const word of WORDS) expect(urls).toContain(`/vocabulario/${word.id}`);
    for (const personal of ["/progreso", "/ajustes", "/entrar"]) expect(urls).not.toContain(personal);
  });

  it("keeps account flows out of search and points to the sitemap", () => {
    const { rules, sitemap: map } = robots();
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;
    expect(disallow).toEqual(expect.arrayContaining(["/auth/", "/entrar", "/ajustes", "/progreso"]));
    expect(map).toMatch(/\/sitemap\.xml$/);
  });
});

import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { QR_MODULES, SHARE_URL } from "../data/share";
import { QR_QUIET, qrShapes, renderQrSvg } from "./qr";

/** Paints the design the way it is drawn (eyes, modules and the logo on top) and decodes it. */
function decode(px = 8) {
  const { size, modules, eyes, logo } = qrShapes(QR_MODULES);
  const w = size * px;
  const data = new Uint8ClampedArray(w * w * 4).fill(255);
  const fill = (x: number, y: number, s: number, dark: boolean) => {
    for (let j = y * px; j < (y + s) * px; j++)
      for (let i = x * px; i < (x + s) * px; i++) {
        const k = (j * w + i) * 4;
        data[k] = data[k + 1] = data[k + 2] = dark ? 30 : 255;
      }
  };
  for (const m of modules) fill(m.x, m.y, 1, true);
  for (const e of eyes) {
    fill(e.x, e.y, 7, true);
    fill(e.x + 1, e.y + 1, 5, false);
    fill(e.x + 2, e.y + 2, 3, true);
  }
  // The logo: white pad around a dark (accent) square.
  fill(logo.x, logo.y, logo.size, false);
  fill(logo.x + 0.5, logo.y + 0.5, logo.size - 1, true);
  return jsQR(data, w, w)?.data;
}

describe("share QR code", () => {
  it("opens lexiapp.app even with Lexi's mark in the middle", () => {
    expect(SHARE_URL).toBe("https://lexiapp.app");
    expect(decode()).toBe(SHARE_URL);
  });

  it("keeps the quiet zone and leaves the eyes and the logo area free of data modules", () => {
    const n = QR_MODULES.length;
    const { size, modules, logo } = qrShapes(QR_MODULES);
    expect(size).toBe(n + QR_QUIET * 2);
    expect(modules.every((m) => m.x >= QR_QUIET && m.y >= QR_QUIET && m.x < size - QR_QUIET && m.y < size - QR_QUIET)).toBe(true);
    const inLogo = (m: { x: number; y: number }) => m.x >= logo.x && m.x < logo.x + logo.size && m.y >= logo.y && m.y < logo.y + logo.size;
    expect(modules.some(inLogo)).toBe(false);
    // The logo stays small enough for error correction H (30 %).
    expect((logo.size * logo.size) / (n * n)).toBeLessThan(0.12);
  });

  it("renders an SVG with the logo and a title", () => {
    const svg = renderQrSvg(QR_MODULES, { pixels: 512, title: "lexiapp.app" });
    expect(svg).toMatch(/^<svg [^>]*width="512"/);
    expect(svg).toContain("<title>lexiapp.app</title>");
    expect(svg).toContain('fill="#ffe45c"');
  });
});

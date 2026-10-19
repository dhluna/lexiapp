/**
 * Lexi's QR code design, as pure geometry: rounded modules in ink, rounded corner "eyes" in
 * the accent color and Lexi's mark in the middle. The matrix comes from `data/share.ts`
 * (generated with error correction H, so the mark in the middle does not stop it scanning).
 * Web, mobile and `scripts/generate-qr.mjs` all draw from these shapes.
 */

export const QR_COLORS = { ink: "#16193b", accent: "#3a3ed6", dot: "#ffe45c", background: "#ffffff" } as const;

/**
 * Each dark module: a soft-cornered square that slightly overlaps its neighbors. Separate
 * dots (with gaps) look nice but some decoders, jsQR among them, then fail to read the code.
 */
export const QR_MODULE = { offset: -0.02, size: 1.04, radius: 0.3 } as const;

/** Blank modules around the code, as the QR standard asks. */
export const QR_QUIET = 4;

export interface QrShapes {
  /** Side of the whole drawing, in modules (code + quiet zone on both sides). */
  size: number;
  /** Dark data modules (top-left corner), outside the eyes and the logo area. */
  modules: { x: number; y: number }[];
  /** Top-left corner of each of the three 7×7 finder patterns. */
  eyes: { x: number; y: number }[];
  /** Square kept clear for the logo (white pad included). */
  logo: { x: number; y: number; size: number };
}

/** `rows` are strings of "0"/"1", one per row of the QR matrix. */
export function qrShapes(rows: readonly string[]): QrShapes {
  const n = rows.length;
  const size = n + QR_QUIET * 2;
  // About 22 % of the code, odd so it stays centered on a module.
  let logoSize = Math.round(n * 0.22);
  if (logoSize % 2 === 0) logoSize += 1;
  const logoStart = (n - logoSize) / 2;
  const inEye = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const inLogo = (x: number, y: number) =>
    x >= logoStart - 1 && x < logoStart + logoSize + 1 && y >= logoStart - 1 && y < logoStart + logoSize + 1;

  const modules: { x: number; y: number }[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < n; x++) {
      if (row[x] === "1" && !inEye(x, y) && !inLogo(x, y)) modules.push({ x: x + QR_QUIET, y: y + QR_QUIET });
    }
  });
  return {
    size,
    modules,
    eyes: [
      { x: QR_QUIET, y: QR_QUIET },
      { x: QR_QUIET + n - 7, y: QR_QUIET },
      { x: QR_QUIET, y: QR_QUIET + n - 7 },
    ],
    logo: { x: QR_QUIET + logoStart - 1, y: QR_QUIET + logoStart - 1, size: logoSize + 2 },
  };
}

/** The whole code as an SVG string (for the downloadable files and the web). */
export function renderQrSvg(rows: readonly string[], { pixels = 1024, title = "" }: { pixels?: number; title?: string } = {}): string {
  const { size, modules, eyes, logo } = qrShapes(rows);
  const c = QR_COLORS;
  const parts: string[] = [`<rect width="${size}" height="${size}" fill="${c.background}"/>`];
  for (const m of modules) {
    const r = QR_MODULE;
    parts.push(`<rect x="${m.x + r.offset}" y="${m.y + r.offset}" width="${r.size}" height="${r.size}" rx="${r.radius}" fill="${c.ink}"/>`);
  }
  for (const e of eyes) {
    parts.push(
      `<rect x="${e.x + 0.5}" y="${e.y + 0.5}" width="6" height="6" rx="1.7" fill="none" stroke="${c.accent}" stroke-width="1"/>`,
      `<rect x="${e.x + 2}" y="${e.y + 2}" width="3" height="3" rx="0.9" fill="${c.accent}"/>`,
    );
  }
  // Lexi's mark (apps/web/src/app/icon.svg) on a white pad.
  const inner = logo.size - 1;
  parts.push(
    `<rect x="${logo.x}" y="${logo.y}" width="${logo.size}" height="${logo.size}" rx="${logo.size * 0.24}" fill="${c.background}"/>`,
    `<svg x="${logo.x + 0.5}" y="${logo.y + 0.5}" width="${inner}" height="${inner}" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="15" fill="${c.accent}"/>` +
      `<rect x="19" y="11" width="11" height="40" rx="5.5" fill="#ffffff"/>` +
      `<circle cx="42.5" cy="45" r="6.5" fill="${c.dot}"/></svg>`,
  );
  const titleTag = title ? `<title>${title}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${pixels}" height="${pixels}" shape-rendering="geometricPrecision">${titleTag}${parts.join("")}</svg>`;
}

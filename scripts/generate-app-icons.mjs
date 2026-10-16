// Renders Lexi's mark (the "l" and the yellow dot of "lexi.", see apps/web/src/app/icon.svg)
// into the mobile app icons. Usage: node scripts/generate-app-icons.mjs
import sharp from "sharp";

const ACCENT = "#3a3ed6";
const DOT = "#ffe45c";
const OUT = "apps/mobile/assets";

/** The mark in a 64×64 box; `viewBox` decides how much margin it gets. */
const mark = (bar, dot) =>
  `<rect x="19" y="11" width="11" height="40" rx="5.5" fill="${bar}"/><circle cx="42.5" cy="45" r="6.5" fill="${dot}"/>`;
const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

const files = [
  // iOS and the store: full-bleed square (the system rounds the corners).
  ["icon.png", 1024, svg("0 0 64 64", `<rect width="64" height="64" fill="${ACCENT}"/>${mark("#fff", DOT)}`)],
  // Android adaptive icon: background layer + foreground inside the 66% safe zone.
  ["android-icon-background.png", 512, svg("0 0 64 64", `<rect width="64" height="64" fill="${ACCENT}"/>`)],
  ["android-icon-foreground.png", 512, svg("-16 -16 96 96", mark("#fff", DOT))],
  // Android 13 themed icons: one flat color, the system tints it.
  ["android-icon-monochrome.png", 432, svg("-16 -16 96 96", mark("#fff", "#fff"))],
  // Splash: the rounded icon centered on the app background.
  ["splash-icon.png", 1024, svg("-32 -32 128 128", `<rect width="64" height="64" rx="15" fill="${ACCENT}"/>${mark("#fff", DOT)}`)],
  ["favicon.png", 48, svg("0 0 64 64", `<rect width="64" height="64" rx="15" fill="${ACCENT}"/>${mark("#fff", DOT)}`)],
];

for (const [name, size, source] of files) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(`${OUT}/${name}`);
  console.log(`${OUT}/${name} (${size}×${size})`);
}

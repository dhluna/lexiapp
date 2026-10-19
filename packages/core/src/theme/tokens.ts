/**
 * Lexi's design tokens, shared by the mobile app (StyleSheet) and mirrored by the web's
 * `globals.css` custom properties. `apps/web/src/app/tokens.test.ts` checks they match.
 */

export type ColorToken =
  | "paper"
  | "surface"
  | "surface-sunken"
  | "ink"
  | "ink-soft"
  | "line"
  | "accent"
  | "accent-ink"
  | "accent-soft"
  | "marker"
  | "learned"
  | "learned-soft"
  | "review"
  | "review-soft"
  | "danger"
  | "danger-soft"
  | "lv1"
  | "lv1-soft"
  | "lv2"
  | "lv2-soft"
  | "lv3"
  | "lv3-soft"
  | "lv4"
  | "lv4-soft"
  | "lv5"
  | "lv5-soft"
  | "lv6"
  | "lv6-soft"
  | "lv7"
  | "lv7-soft"
  | "lv8"
  | "lv8-soft";

export type Palette = Record<ColorToken, string>;

export const LIGHT: Palette = {
  paper: "#f3f5fb",
  surface: "#ffffff",
  "surface-sunken": "#e9ecf6",
  ink: "#16193b",
  "ink-soft": "#4b5070",
  line: "#d9ddeb",
  accent: "#3a3ed6",
  "accent-ink": "#ffffff",
  "accent-soft": "#e6e7fd",
  marker: "#ffe45c",
  learned: "#0f7448",
  "learned-soft": "#e1f4e9",
  review: "#9a5600",
  "review-soft": "#fff0d6",
  danger: "#b4232c",
  "danger-soft": "#fde7e8",
  lv1: "#475569",
  "lv1-soft": "#e7ebf1",
  lv2: "#2563eb",
  "lv2-soft": "#e0eaff",
  lv3: "#15803d",
  "lv3-soft": "#def5e3",
  lv4: "#7c3aed",
  "lv4-soft": "#efe6fe",
  lv5: "#0e7490",
  "lv5-soft": "#d8f3f8",
  lv6: "#c2410c",
  "lv6-soft": "#ffe8d9",
  lv7: "#be185d",
  "lv7-soft": "#fde4ef",
  lv8: "#a16207",
  "lv8-soft": "#fff3c4",
};

export const DARK: Palette = {
  paper: "#0e1022",
  surface: "#181b33",
  "surface-sunken": "#12152a",
  ink: "#eef0fa",
  "ink-soft": "#aab0cc",
  line: "#2b2f50",
  accent: "#9a9dff",
  "accent-ink": "#0e1022",
  "accent-soft": "#262a55",
  marker: "#8a7414",
  learned: "#62d6a0",
  "learned-soft": "#11301f",
  review: "#f5b451",
  "review-soft": "#33250f",
  danger: "#ff8a8f",
  "danger-soft": "#3a1518",
  lv1: "#b4c0d3",
  "lv1-soft": "#22293a",
  lv2: "#8ab4ff",
  "lv2-soft": "#172a4d",
  lv3: "#6fdc8c",
  "lv3-soft": "#13301c",
  lv4: "#c4a2ff",
  "lv4-soft": "#2b1d4d",
  lv5: "#5ed3ec",
  "lv5-soft": "#0f2d36",
  lv6: "#ffa274",
  "lv6-soft": "#3b1d0f",
  lv7: "#ff8cc0",
  "lv7-soft": "#3d1527",
  lv8: "#f5c84c",
  "lv8-soft": "#3a2e0c",
};

/** Badge color of each level (1–8): `lvN` for the icon, `lvN-soft` for its background. */
export function levelColorTokens(level: number): { fg: ColorToken; bg: ColorToken } {
  const n = Math.min(Math.max(Math.round(level), 1), 8);
  return { fg: `lv${n}` as ColorToken, bg: `lv${n}-soft` as ColorToken };
}

/** Corner radii (px / pt), matching the web's rounded-xl / 2xl / 3xl. */
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

/** Minimum touch target, as on the web (44). */
export const TOUCH_TARGET = 44;

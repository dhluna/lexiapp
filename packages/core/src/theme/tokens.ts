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
  | "danger-soft";

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
};

/** Corner radii (px / pt), matching the web's rounded-xl / 2xl / 3xl. */
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

/** Minimum touch target, as on the web (44). */
export const TOUCH_TARGET = 44;

import { DARK, LIGHT, RADIUS, TOUCH_TARGET, type Palette } from "@lexi/core/theme/tokens";
import { useColorScheme } from "react-native";

export { RADIUS, TOUCH_TARGET };

export const FONTS = {
  display: "BricolageGrotesque_700Bold",
  displaySemi: "BricolageGrotesque_600SemiBold",
  body: "AtkinsonHyperlegibleNext_400Regular",
  bodySemi: "AtkinsonHyperlegibleNext_600SemiBold",
  bodyBold: "AtkinsonHyperlegibleNext_700Bold",
  ipa: "NotoSans_400Regular",
} as const;

export interface Theme {
  colors: Palette;
  dark: boolean;
}

/** Light or dark palette, following the system setting like the web does. */
export function useTheme(): Theme {
  const dark = useColorScheme() === "dark";
  return { colors: dark ? DARK : LIGHT, dark };
}

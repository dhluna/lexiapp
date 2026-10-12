import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONTS, RADIUS, TOUCH_TARGET, useTheme } from "@/theme";

// ─── Text ───────────────────────────────────────────────────────────────────

type Variant = "title" | "heading" | "subheading" | "body" | "muted" | "small" | "label";

const VARIANTS: Record<Variant, { fontFamily: string; fontSize: number; lineHeight: number }> = {
  title: { fontFamily: FONTS.display, fontSize: 34, lineHeight: 40 },
  heading: { fontFamily: FONTS.displaySemi, fontSize: 22, lineHeight: 28 },
  subheading: { fontFamily: FONTS.bodyBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: FONTS.body, fontSize: 17, lineHeight: 25 },
  muted: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: FONTS.bodySemi, fontSize: 14, lineHeight: 20 },
};

export function AppText({
  variant = "body",
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string }) {
  const { colors } = useTheme();
  const fallback = variant === "muted" || variant === "small" ? colors["ink-soft"] : colors.ink;
  return <Text {...props} style={[VARIANTS[variant], { color: color ?? fallback }, style]} />;
}

// ─── Layout ─────────────────────────────────────────────────────────────────

/** Scrollable page with the paper background and comfortable side margins. */
export function Screen({
  children,
  scroll = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const content = <View style={styles.screenContent}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: footer ? 16 : insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}
      {footer}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }, style]}>{children}</View>;
}

// ─── Buttons ────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "sunken";

export function Button({
  title,
  variant = "primary",
  icon,
  disabled,
  style,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  title: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.accent, fg: colors["accent-ink"] },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
    ghost: { bg: "transparent", fg: colors["ink-soft"] },
    danger: { bg: colors["danger-soft"], fg: colors.danger, border: colors.danger },
    sunken: { bg: colors["surface-sunken"], fg: colors.ink },
  };
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: p.bg, borderColor: p.border ?? "transparent", opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {icon}
      <AppText variant="subheading" color={p.fg}>
        {title}
      </AppText>
    </Pressable>
  );
}

/** Round icon-only button: the label is required for screen readers. */
export function IconButton({
  label,
  children,
  active,
  disabled,
  onPress,
  size = TOUCH_TARGET,
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: RADIUS.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? colors["accent-soft"] : pressed ? colors["surface-sunken"] : "transparent",
        opacity: disabled ? 0.35 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/** Selectable pill used for filters and settings (radio semantics). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <AppText variant="label" color={selected ? colors["accent-ink"] : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

// ─── Feedback ───────────────────────────────────────────────────────────────

/** Learned (green) and pending review (amber) as one bar, like the web. */
export function ProgressBar({
  value,
  secondary = 0,
  max,
  label,
  height = 8,
}: {
  value: number;
  secondary?: number;
  max: number;
  label: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const pct = (n: number) => (max > 0 ? `${Math.min(100, (n / max) * 100)}%` : "0%") as `${number}%`;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ flexDirection: "row", height, borderRadius: RADIUS.full, overflow: "hidden", backgroundColor: colors["surface-sunken"] }}
    >
      <View style={{ width: pct(value), backgroundColor: colors.learned }} />
      {secondary > 0 && <View style={{ width: pct(secondary), backgroundColor: colors.review, opacity: 0.7 }} />}
    </View>
  );
}

export function Notice({ title, children, tone = "review" }: { title: string; children?: ReactNode; tone?: "review" | "danger" }) {
  const { colors } = useTheme();
  const fg = tone === "danger" ? colors.danger : colors.review;
  const bg = tone === "danger" ? colors["danger-soft"] : colors["review-soft"];
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: RADIUS.lg, padding: 16, gap: 4 }}>
      <AppText variant="subheading" color={fg}>
        {title}
      </AppText>
      {typeof children === "string" ? (
        <AppText variant="small" color={fg}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 16, paddingTop: 16, gap: 20, width: "100%", maxWidth: 720, alignSelf: "center" },
  card: { borderRadius: RADIUS.xl, padding: 20, gap: 12 },
  button: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

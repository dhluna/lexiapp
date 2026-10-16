import type { Celebration } from "@lexi/core/domain/celebration";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { confettiBus } from "@/platform/confetti-bus";
import { useTheme } from "@/theme";

type Kind = Exclude<Celebration, "none">;

const GOLD = ["#ffd23f", "#ffb703", "#fff1a8", "#f59e0b"];
const LIFETIME = 3600;

interface PieceSpec {
  x: number;
  drift: number;
  sway: number;
  spin: number;
  delay: number;
  duration: number;
  width: number;
  height: number;
  color: string;
  round: boolean;
}

function makePieces(count: number, width: number, colors: string[]): PieceSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 120,
    sway: 12 + Math.random() * 28,
    spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 900),
    delay: Math.random() * 450,
    duration: 2100 + Math.random() * 1000,
    width: 6 + Math.random() * 6,
    height: 9 + Math.random() * 8,
    color: colors[i % colors.length],
    round: Math.random() < 0.25,
  }));
}

/**
 * Confetti over every screen, launched through `confettiBus`. Decorative: it never takes
 * touches, is hidden from screen readers and is not drawn when the system reduces motion.
 */
export function ConfettiLayer() {
  const reduceMotion = useReducedMotion();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [burst, setBurst] = useState<{ id: number; pieces: PieceSpec[] } | null>(null);

  useEffect(
    () =>
      confettiBus.subscribe((kind: Kind) => {
        if (reduceMotion) return;
        const palette = kind === "perfect" ? [...GOLD, colors.accent] : [colors.accent, colors.learned, colors.review, "#ffffff"];
        setBurst({ id: Date.now(), pieces: makePieces(kind === "perfect" ? 110 : 70, width, palette) });
      }),
    [reduceMotion, colors, width],
  );

  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(null), LIFETIME);
    return () => clearTimeout(timer);
  }, [burst]);

  if (!burst) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {burst.pieces.map((piece, i) => (
        <Piece key={`${burst.id}-${i}`} spec={piece} fall={height + 40} />
      ))}
    </View>
  );
}

function Piece({ spec, fall }: { spec: PieceSpec; fall: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Easing.in(Easing.quad) })));
  }, [progress, spec]);

  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: t < 0.85 ? 1 : (1 - t) / 0.15,
      transform: [
        { translateX: spec.x + spec.drift * t + Math.sin(t * 10) * spec.sway },
        { translateY: -30 + fall * t },
        { rotate: `${spec.spin * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: spec.width,
          height: spec.round ? spec.width : spec.height,
          borderRadius: spec.round ? spec.width / 2 : 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

import { Volume2, VolumeOff } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSpeech } from "@/hooks/use-speech";
import { RADIUS, useTheme } from "@/theme";

function Bar({ delay, color, animate }: { delay: number; color: string; animate: boolean }) {
  const scale = useSharedValue(0.6);
  useEffect(() => {
    if (!animate) return;
    scale.set(withDelay(delay, withRepeat(withTiming(1, { duration: 360 }), -1, true)));
    return () => cancelAnimation(scale);
  }, [animate, delay, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: animate ? scale.get() : 0.7 }] }));
  return <Animated.View style={[{ width: 3, height: 16, borderRadius: 2, backgroundColor: color }, style]} />;
}

/** Listen button; shows rising bars while its text is playing (static with reduced motion). */
export function SpeakButton({ text, label, size = 48 }: { text: string; label: string; size?: number }) {
  const { colors } = useTheme();
  const { availability, speakingText, speak, stop } = useSpeech();
  const reduceMotion = useReducedMotion();
  const unsupported = availability === "unsupported";
  const speaking = speakingText === text;
  const iconSize = size >= 44 ? 22 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unsupported ? `${label} (este dispositivo no puede reproducir voz)` : label}
      accessibilityState={{ disabled: unsupported, selected: speaking }}
      disabled={unsupported}
      onPress={() => (speaking ? stop() : speak(text))}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size >= 44 ? RADIUS.lg : RADIUS.md,
        borderWidth: 1,
        borderColor: speaking ? colors.accent : colors.line,
        backgroundColor: speaking ? colors["accent-soft"] : pressed ? colors["surface-sunken"] : colors.surface,
        alignItems: "center",
        justifyContent: "center",
        opacity: unsupported ? 0.45 : 1,
      })}
    >
      {unsupported ? (
        <VolumeOff color={colors["ink-soft"]} size={iconSize} />
      ) : speaking ? (
        <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
          {[0, 180, 90].map((delay) => (
            <Bar key={delay} delay={delay} color={colors.accent} animate={!reduceMotion} />
          ))}
        </View>
      ) : (
        <Volume2 color={colors.ink} size={iconSize} />
      )}
    </Pressable>
  );
}

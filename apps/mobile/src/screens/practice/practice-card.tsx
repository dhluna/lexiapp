import { getWord } from "@lexi/core/data/catalog";
import { STATUS_LABELS } from "@lexi/core/domain/labels";
import { isLastWord, type PracticeSession, type SessionAnswer } from "@lexi/core/domain/session";
import { useRouter } from "expo-router";
import { Check, ChevronLeft, ChevronRight, Flag, RotateCcw, Volume2, VolumeOff, X } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { VoiceNotice } from "@/components/voice-notice";
import { AppText, IconButton } from "@/components/ui";
import { WordDetails, WordHeading } from "@/components/word";
import { useSpeech } from "@/hooks/use-speech";
import { RADIUS, useTheme } from "@/theme";

/** Horizontal distance (pt) or speed that turns a drag into "next / previous". */
export const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 800;

interface PracticeCardProps {
  session: PracticeSession;
  autoPronounce: boolean;
  onToggleAutoPronounce: () => void;
  onAnswer: (answer: SessionAnswer) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function PracticeCard({
  session,
  autoPronounce,
  onToggleAutoPronounce,
  onAnswer,
  onNext,
  onPrevious,
}: PracticeCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { availability, speak, stop } = useSpeech();
  const canSpeak = availability !== "unsupported";

  const word = getWord(session.wordIds[session.index]);
  const term = word?.term ?? "";
  const currentAnswer = word ? session.answers[word.id] : undefined;
  const hasPrevious = session.index > 0;
  const last = isLastWord(session);
  const position = session.index + 1;
  const total = session.wordIds.length;

  // Say each new word out loud; the button stays available to repeat it.
  useEffect(() => {
    if (autoPronounce && canSpeak && term) speak(term);
  }, [term, autoPronounce, canSpeak, speak]);
  useEffect(() => stop, [stop]);

  // Tell screen-reader users which word is on screen now.
  useEffect(() => {
    if (term) AccessibilityInfo.announceForAccessibility(`Palabra ${position} de ${total}: ${term}`);
  }, [term, position, total]);

  // ─── Swipe: left = next, right = previous. Swiping only navigates, it never answers.
  const translateX = useSharedValue(0);
  useEffect(() => {
    translateX.set(0);
  }, [session.index, translateX]);

  const leave = (direction: -1 | 1, then: () => void) => {
    "worklet";
    if (reduceMotion) {
      translateX.set(0);
      scheduleOnRN(then);
      return;
    }
    translateX.set(withTiming(direction * width, { duration: 180 }, () => scheduleOnRN(then)));
  };

  const pan = Gesture.Pan()
    .withTestId("practice-card-swipe")
    .activeOffsetX([-15, 15])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      // Resist dragging right on the first card: there is nothing before it.
      translateX.set(e.translationX > 0 && !hasPrevious ? e.translationX * 0.25 : e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY) leave(-1, onNext);
      else if (hasPrevious && (e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY)) leave(1, onPrevious);
      else translateX.set(reduceMotion ? 0 : withSpring(0));
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }, { rotate: `${translateX.get() / 60}deg` }],
  }));

  if (!word) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <IconButton label="Salir de la práctica. Tus respuestas ya están guardadas." onPress={() => router.navigate("/")}>
          <X size={22} color={colors["ink-soft"]} />
        </IconButton>
        <View style={styles.dots} accessible accessibilityLabel={`Palabra ${position} de ${total}`}>
          {session.wordIds.map((id, i) => {
            const answer = session.answers[id];
            const background =
              answer === "learned"
                ? colors.learned
                : answer === "review"
                  ? colors.review
                  : i < session.index
                    ? colors["ink-soft"]
                    : colors["surface-sunken"];
            return (
              <View
                key={id}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: background,
                  opacity: !answer && i < session.index ? 0.35 : 1,
                  borderWidth: i === session.index ? 1.5 : 0,
                  borderColor: colors.accent,
                }}
              />
            );
          })}
        </View>
        <IconButton label="Palabra anterior" disabled={!hasPrevious} onPress={onPrevious}>
          <ChevronLeft size={22} color={colors["ink-soft"]} />
        </IconButton>
        <AppText variant="label" style={{ minWidth: 36, textAlign: "center" }}>
          {position}/{total}
        </AppText>
        <IconButton label={last ? "Terminar sesión" : "Palabra siguiente"} onPress={onNext}>
          {last ? <Flag size={18} color={colors["ink-soft"]} /> : <ChevronRight size={22} color={colors["ink-soft"]} />}
        </IconButton>
        <IconButton
          label="Pronunciación automática"
          active={autoPronounce}
          disabled={!canSpeak}
          onPress={onToggleAutoPronounce}
        >
          {autoPronounce ? <Volume2 size={20} color={colors.accent} /> : <VolumeOff size={20} color={colors["ink-soft"]} />}
        </IconButton>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[{ flex: 1 }, cardStyle]}
          accessibilityHint="Desliza a la izquierda para pasar a la siguiente palabra y a la derecha para volver."
        >
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <VoiceNotice />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <WordHeading word={word} />
              {currentAnswer && (
                <View
                  style={[
                    styles.answered,
                    { backgroundColor: currentAnswer === "learned" ? colors["learned-soft"] : colors["review-soft"] },
                  ]}
                >
                  <AppText variant="label" color={currentAnswer === "learned" ? colors.learned : colors.review}>
                    Marcaste: {STATUS_LABELS[currentAnswer].toLowerCase()}
                  </AppText>
                </View>
              )}
              <View style={{ height: 1, backgroundColor: colors.line }} />
              <WordDetails word={word} />
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* Answer bar: always within thumb reach, same style as the web card footer. */}
      <View style={[styles.answers, { borderColor: colors.line, backgroundColor: colors.surface }]}>
        <AnswerButton
          label="Repasar"
          selected={currentAnswer === "review"}
          onPress={() => onAnswer("review")}
          background={colors["accent-soft"]}
          color={colors.ink}
          ring={colors.accent}
          icon={<RotateCcw size={20} color={colors.accent} strokeWidth={2.5} />}
        />
        <AnswerButton
          label="La sé"
          selected={currentAnswer === "learned"}
          onPress={() => onAnswer("learned")}
          background={colors.accent}
          color={colors["accent-ink"]}
          ring={colors.ink}
          icon={<Check size={20} color={colors["accent-ink"]} strokeWidth={3} />}
        />
      </View>
    </View>
  );
}

function AnswerButton({
  label,
  selected,
  onPress,
  background,
  color,
  ring,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  background: string;
  color: string;
  ring: string;
  icon: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 64,
        borderRadius: RADIUS.md,
        backgroundColor: background,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderWidth: selected ? 2 : 0,
        borderColor: ring,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {icon}
      <AppText variant="subheading" color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingBottom: 6 },
  dots: { flex: 1, flexDirection: "row", gap: 3, marginHorizontal: 4 },
  card: { borderRadius: RADIUS.xl, padding: 20, gap: 18 },
  answered: { alignSelf: "flex-start", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  answers: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
});

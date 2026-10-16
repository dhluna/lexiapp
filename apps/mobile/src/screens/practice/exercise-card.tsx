import { getWord } from "@lexi/core/data/catalog";
import { checkAnswer, wordCount, type Exercise, type ExerciseCheck } from "@lexi/core/domain/exercise";
import { isLastWord, type PracticeSession, type SessionAnswer } from "@lexi/core/domain/session";
import type { Word } from "@lexi/core/domain/types";
import { useRouter } from "expo-router";
import { Check, CircleHelp, Snail, Sparkles, Volume2, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SpeakButton } from "@/components/speak-button";
import { AppText, Button, IconButton } from "@/components/ui";
import { VoiceNotice } from "@/components/voice-notice";
import { useSpeech } from "@/hooks/use-speech";
import { FONTS, RADIUS, useTheme } from "@/theme";

const SLOW_RATE = 0.7;

interface ExerciseCardProps {
  session: PracticeSession;
  /** Saves the result right away (correct and "almost" count as learned). */
  onCheck: (answer: SessionAnswer) => void;
  onNext: () => void;
}

/** "Ponerme a prueba" (same rules as the web): progress header and the current exercise. */
export function ExerciseCard({ session, onCheck, onNext }: ExerciseCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const word = getWord(session.wordIds[session.index]);
  const exercise = word ? session.exercises?.[word.id] : undefined;
  const position = session.index + 1;
  const total = session.wordIds.length;

  if (!word || !exercise) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <IconButton label="Salir de la prueba. Tus respuestas ya están guardadas." onPress={() => router.navigate("/")}>
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
                  borderWidth: i === session.index ? 1.5 : 0,
                  borderColor: colors.accent,
                }}
              />
            );
          })}
        </View>
        <AppText variant="label" style={{ minWidth: 36, textAlign: "center" }}>
          {position}/{total}
        </AppText>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <VoiceNotice />
        <ExerciseBody key={word.id} word={word} exercise={exercise} last={isLastWord(session)} onCheck={onCheck} onNext={onNext} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ExerciseBody({
  word,
  exercise,
  last,
  onCheck,
  onNext,
}: {
  word: Word;
  exercise: Exercise;
  last: boolean;
  onCheck: (answer: SessionAnswer) => void;
  onNext: () => void;
}) {
  const { colors } = useTheme();
  const { availability, speak, stop } = useSpeech();
  const canSpeak = availability !== "unsupported";
  const [value, setValue] = useState("");
  const [check, setCheck] = useState<ExerciseCheck | null>(null);
  const inputRef = useRef<TextInput>(null);
  const dictation = exercise.kind === "dictation";
  // Without a voice, dictation shows the meaning instead of playing the word.
  const listenable = dictation && canSpeak;
  const words = wordCount(exercise.answer);

  useEffect(() => {
    if (listenable) speak(exercise.answer);
  }, [listenable, speak, exercise.answer]);
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!check) return;
    const message =
      check.result === "correct" ? "Correcto." : check.result === "almost" ? "Casi. Cuenta como acierto." : `No es correcto. Era ${exercise.answer}.`;
    AccessibilityInfo.announceForAccessibility(message);
  }, [check, exercise.answer]);

  const submit = () => {
    if (check || value.trim() === "") return;
    const result = checkAnswer(value, exercise, word.term);
    setCheck(result);
    onCheck(result.result === "wrong" ? "review" : "learned");
  };

  const giveUp = () => {
    if (check) return;
    setCheck({ result: "wrong" });
    onCheck("review");
  };

  const good = check && check.result !== "wrong";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.chip, { backgroundColor: colors["accent-soft"] }]}>
        {dictation ? <Volume2 size={16} color={colors.accent} /> : <Sparkles size={16} color={colors.accent} />}
        <AppText variant="label" color={colors.accent}>
          {dictation ? "Escucha y escribe" : "Completa la frase"}
        </AppText>
      </View>

      {dictation ? (
        <View style={{ gap: 10 }}>
          {listenable ? (
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button title="Escuchar" variant="secondary" icon={<Volume2 size={18} color={colors.ink} />} onPress={() => speak(exercise.answer)} />
              <Button
                title="Más lento"
                variant="ghost"
                icon={<Snail size={18} color={colors["ink-soft"]} />}
                onPress={() => speak(exercise.answer, SLOW_RATE)}
              />
            </View>
          ) : (
            <AppText style={{ fontFamily: FONTS.display, fontSize: 24 }}>«{word.translation}»</AppText>
          )}
          <AppText variant="muted">
            Escribe la palabra en inglés{words > 1 ? ` (${words} palabras)` : ""}.
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <AppText accessibilityLanguage="en-US" style={{ fontFamily: FONTS.display, fontSize: 24, lineHeight: 32 }}>
            {exercise.before}
            {check ? (
              <AppText
                style={{ fontFamily: FONTS.display, fontSize: 24 }}
                color={good ? colors.learned : colors.review}
              >
                {exercise.answer}
              </AppText>
            ) : (
              <AppText style={{ fontFamily: FONTS.display, fontSize: 24 }} color={colors.accent} accessibilityLabel="hueco">
                {" _____ "}
              </AppText>
            )}
            {exercise.after}
          </AppText>
          <AppText variant="muted">{exercise.translation}</AppText>
          <AppText variant="small">
            Pista: <AppText variant="small" color={colors.ink} style={{ fontWeight: "600" }}>{word.translation}</AppText>
            {words > 1 ? ` · ${words} palabras` : ""}
          </AppText>
        </View>
      )}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        editable={check === null}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        returnKeyType="done"
        submitBehavior="submit"
        placeholder="Escribe aquí"
        placeholderTextColor={colors["ink-soft"]}
        accessibilityLabel="Tu respuesta en inglés"
        style={{
          minHeight: 52,
          borderRadius: RADIUS.lg,
          borderWidth: 1.5,
          borderColor: check === null ? colors.line : good ? colors.learned : colors.review,
          backgroundColor: colors.paper,
          color: colors.ink,
          paddingHorizontal: 14,
          fontSize: 20,
        }}
      />

      {check === null ? (
        <View style={{ gap: 8 }}>
          <Button title="Comprobar" disabled={value.trim() === ""} onPress={submit} />
          <Button title="No lo sé" variant="ghost" icon={<CircleHelp size={18} color={colors["ink-soft"]} />} onPress={giveUp} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={[styles.result, { backgroundColor: good ? colors["learned-soft"] : colors["review-soft"] }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {good ? <Check size={20} color={colors.learned} /> : <X size={20} color={colors.review} />}
              <AppText variant="subheading" color={good ? colors.learned : colors.review}>
                {check.result === "correct" && "¡Correcto!"}
                {check.result === "almost" && "¡Casi! Cuenta como acierto."}
                {check.result === "wrong" && "No es correcto. Queda para repasar."}
              </AppText>
            </View>
            {check.note && <AppText color={good ? colors.learned : colors.review}>{check.note}</AppText>}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText accessibilityLanguage="en-US" style={{ fontFamily: FONTS.display, fontSize: 22 }}>
                  {exercise.answer}
                </AppText>
                <AppText variant="muted">{word.translation}</AppText>
              </View>
              <SpeakButton text={exercise.answer} label={`Escuchar «${exercise.answer}»`} />
            </View>
            {dictation && word.examples[0] && (
              <AppText variant="small">
                <AppText variant="small" color={colors.ink} accessibilityLanguage="en-US">
                  {word.examples[0].en}
                </AppText>{" "}
                {word.examples[0].es}
              </AppText>
            )}
          </View>
          <Button title={last ? "Ver resultados" : "Siguiente"} onPress={onNext} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingBottom: 6 },
  dots: { flex: 1, flexDirection: "row", gap: 3, marginHorizontal: 4 },
  card: { borderRadius: RADIUS.xl, padding: 20, gap: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  result: { borderRadius: RADIUS.lg, padding: 14, gap: 8 },
});

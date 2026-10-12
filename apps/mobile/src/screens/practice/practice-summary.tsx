import { getWord } from "@lexi/core/data/catalog";
import { summarize, summaryTitle, type PracticeSession } from "@lexi/core/domain/session";
import type { WordId } from "@lexi/core/domain/types";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { FONTS, RADIUS, useTheme } from "@/theme";

interface PracticeSummaryProps {
  session: PracticeSession;
  onRestart: () => void;
  onChooseCategory: () => void;
}

export function PracticeSummary({ session, onRestart, onChooseCategory }: PracticeSummaryProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const summary = summarize(session);
  const answered = summary.learned.length + summary.review.length;
  const title = summaryTitle(summary);

  const counts = [
    { label: "Aprendidas", value: summary.learned.length, bg: colors["learned-soft"], fg: colors.learned },
    { label: "Por repasar", value: summary.review.length, bg: colors["review-soft"], fg: colors.review },
    { label: "Sin responder", value: summary.skipped.length, bg: colors["surface-sunken"], fg: colors["ink-soft"] },
  ];

  return (
    <Screen>
      <Card>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="muted">
          {answered === 0
            ? "No respondiste ninguna palabra, así que no hay cambios en tu progreso."
            : `Respondiste ${answered} de ${summary.total} palabras. Ya está todo guardado.`}
        </AppText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {counts.map((c) => (
            <View
              key={c.label}
              accessible
              accessibilityLabel={`${c.label}: ${c.value}`}
              style={{ flex: 1, backgroundColor: c.bg, borderRadius: RADIUS.lg, padding: 12, alignItems: "center" }}
            >
              <AppText style={{ fontFamily: FONTS.display, fontSize: 28, lineHeight: 34 }} color={c.fg}>
                {c.value}
              </AppText>
              <AppText variant="label" color={c.fg}>
                {c.label}
              </AppText>
            </View>
          ))}
        </View>
        <Button title="Otra sesión" onPress={onRestart} />
        <Button title="Elegir otra categoría" variant="secondary" onPress={onChooseCategory} />
        <Button title="Volver al inicio" variant="ghost" onPress={() => router.navigate("/")} />
      </Card>

      <WordList title="Para repasar" ids={summary.review} />
      <WordList title="Aprendidas" ids={summary.learned} />
      <WordList title="Sin responder" ids={summary.skipped} />
    </Screen>
  );
}

function WordList({ title, ids }: { title: string; ids: WordId[] }) {
  const { colors } = useTheme();
  const router = useRouter();
  if (ids.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="heading">{title}</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ids.map((id) => {
          const word = getWord(id);
          if (!word) return null;
          return (
            <Pressable
              key={id}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: "/palabra/[id]", params: { id } })}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
              }}
            >
              <AppText variant="subheading" accessibilityLanguage="en-US">
                {word.term}
              </AppText>
              <AppText variant="muted">{word.translation}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

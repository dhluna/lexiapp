import { getWord } from "@lexi/core/data/catalog";
import { getWordStatus } from "@lexi/core/domain/progress";
import { Check, Repeat, RotateCcw } from "lucide-react-native";
import { View } from "react-native";
import { StatusBadge } from "@/components/status-badge";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { WordDetails, WordHeading } from "@/components/word";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { useTheme } from "@/theme";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });

export function WordSheetScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const { state } = useProgress();
  const { setWordStatus } = useProgressActions();
  const word = getWord(id);

  if (!word) {
    return (
      <Screen>
        <AppText variant="heading">Esta palabra ya no está en el catálogo</AppText>
      </Screen>
    );
  }

  const progress = state.words[word.id];
  const status = getWordStatus(state, word.id);

  return (
    <Screen>
      <Card>
        <WordHeading word={word} />
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <WordDetails word={word} />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="heading">Tu progreso</AppText>
          <StatusBadge status={status} />
        </View>
        <AppText variant="muted" accessibilityLiveRegion="polite">
          {progress
            ? progress.timesSeen > 0
              ? `Practicada ${progress.timesSeen} ${progress.timesSeen === 1 ? "vez" : "veces"}. Último cambio: ${DATE.format(new Date(progress.updatedAt))}.`
              : `Marcada a mano el ${DATE.format(new Date(progress.updatedAt))}.`
            : "Todavía no la has practicado."}
        </AppText>
        <Button
          title={status === "learned" ? "Ya la aprendiste" : "Marcar como aprendida"}
          disabled={status === "learned"}
          icon={<Check size={18} color={colors["accent-ink"]} strokeWidth={2.75} />}
          onPress={() => setWordStatus(word.id, "learned")}
        />
        <Button
          title={status === "review" ? "Está para repasar" : "Marcar para repasar"}
          variant="sunken"
          disabled={status === "review"}
          icon={<Repeat size={18} color={colors.review} />}
          onPress={() => setWordStatus(word.id, "review")}
        />
        {status !== "new" && (
          <Button
            title="Reiniciar esta palabra"
            variant="ghost"
            icon={<RotateCcw size={16} color={colors["ink-soft"]} />}
            onPress={() => setWordStatus(word.id, "new")}
          />
        )}
      </Card>
    </Screen>
  );
}

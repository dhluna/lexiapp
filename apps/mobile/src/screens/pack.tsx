import { isPackActive, WORDS } from "@lexi/core/data/catalog";
import { getPack, isPackId } from "@lexi/core/data/packs";
import { STATUS_LABELS } from "@lexi/core/domain/labels";
import { getWordStatus } from "@lexi/core/domain/progress";
import { filterWords } from "@lexi/core/domain/search";
import type { LearningStatus } from "@lexi/core/domain/types";
import { Check, Minus, Plus } from "lucide-react-native";
import { useDeferredValue, useState } from "react";
import { ScrollView, View } from "react-native";
import { SearchField } from "@/components/search-field";
import { AppText, Button, Chip, Screen } from "@/components/ui";
import { WordRow } from "@/components/word-row";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { useTheme } from "@/theme";

const STATUSES: readonly LearningStatus[] = ["new", "review", "learned"];

export function PackScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const { state } = useProgress();
  const { setPackActive } = useProgressActions();
  const packId = isPackId(id) ? id : null;
  const pack = packId ? getPack(packId) : undefined;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LearningStatus | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const deferred = useDeferredValue(query);

  const results = filterWords(WORDS, state, { query: deferred, packId, status });
  const counts: Record<LearningStatus, number> = { new: 0, review: 0, learned: 0 };
  for (const word of filterWords(WORDS, state, { query: deferred, packId })) {
    counts[getWordStatus(state, word.id)] += 1;
  }

  if (!pack) {
    return (
      <Screen>
        <AppText variant="heading">Este paquete no existe</AppText>
      </Screen>
    );
  }

  const active = isPackActive(state, pack.id);
  const toggle = (next: boolean) => {
    setPackActive(pack.id, next);
    setConfirmation(next ? `${pack.name} se añadió a tu práctica.` : `${pack.name} ya no está en tu práctica. Su progreso se conserva.`);
  };

  return (
    <Screen>
      <AppText variant="muted">{pack.description}</AppText>
      {pack.core ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Check color={colors.learned} size={16} accessibilityElementsHidden importantForAccessibility="no" />
          <AppText variant="label">Siempre en tu práctica</AppText>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {active ? (
            <Button
              title="Quitar de mi práctica"
              variant="secondary"
              icon={<Minus color={colors.ink} size={16} />}
              onPress={() => toggle(false)}
            />
          ) : (
            <>
              <Button title="Añadir a mi práctica" icon={<Plus color={colors["accent-ink"]} size={16} />} onPress={() => toggle(true)} />
              <AppText variant="small">
                Puedes ver y escuchar sus palabras. Al añadirlo, entrarán en tu práctica diaria y en tu progreso.
              </AppText>
            </>
          )}
        </View>
      )}
      {confirmation !== "" && (
        <AppText variant="label" color={colors.learned} accessibilityLiveRegion="polite">
          {confirmation}
        </AppText>
      )}
      <SearchField value={query} onChange={setQuery} placeholder={`Buscar en ${pack.name}`} label={`Buscar en ${pack.name}`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="radiogroup">
        <Chip label="Todas" selected={status === null} onPress={() => setStatus(null)} />
        {STATUSES.map((s) => (
          <Chip key={s} label={`${STATUS_LABELS[s]} ${counts[s]}`} selected={status === s} onPress={() => setStatus(s)} />
        ))}
      </ScrollView>
      <AppText variant="label" accessibilityLiveRegion="polite">
        {results.length === 1 ? "1 palabra" : `${results.length} palabras`}
      </AppText>
      {results.length === 0 ? (
        <View style={{ gap: 12 }}>
          <AppText variant="heading">No hay palabras con estos filtros</AppText>
          <Button
            title="Quitar filtros"
            variant="secondary"
            onPress={() => {
              setQuery("");
              setStatus(null);
            }}
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {results.map((word) => (
            <WordRow key={word.id} word={word} state={state} />
          ))}
        </View>
      )}
    </Screen>
  );
}

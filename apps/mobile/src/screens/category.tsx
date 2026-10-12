import { getCategory, isCategoryId } from "@lexi/core/data/categories";
import { WORDS } from "@lexi/core/data/catalog";
import { STATUS_LABELS } from "@lexi/core/domain/labels";
import { getWordStatus } from "@lexi/core/domain/progress";
import { filterWords } from "@lexi/core/domain/search";
import type { LearningStatus } from "@lexi/core/domain/types";
import { useDeferredValue, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, Button, Chip, Screen } from "@/components/ui";
import { WordRow } from "@/components/word-row";
import { useProgress } from "@/hooks/use-progress";
import { SearchField } from "@/components/search-field";

const STATUSES: readonly LearningStatus[] = ["new", "review", "learned"];

export function CategoryScreen({ id }: { id: string }) {
  const { state } = useProgress();
  const categoryId = isCategoryId(id) ? id : null;
  const category = categoryId ? getCategory(categoryId) : undefined;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LearningStatus | null>(null);
  const deferred = useDeferredValue(query);

  const results = useMemo(
    () => filterWords(WORDS, state, { query: deferred, categoryId, status }),
    [state, deferred, categoryId, status],
  );
  const counts = useMemo(() => {
    const result: Record<LearningStatus, number> = { new: 0, review: 0, learned: 0 };
    for (const word of filterWords(WORDS, state, { query: deferred, categoryId })) {
      result[getWordStatus(state, word.id)] += 1;
    }
    return result;
  }, [state, deferred, categoryId]);

  if (!category) {
    return (
      <Screen>
        <AppText variant="heading">Esta categoría no existe</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="muted">{category.description}</AppText>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={`Buscar en ${category.name}`}
        label={`Buscar en ${category.name}`}
      />
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

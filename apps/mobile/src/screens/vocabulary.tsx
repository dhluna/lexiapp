import { CATEGORIES } from "@lexi/core/data/categories";
import { WORDS } from "@lexi/core/data/catalog";
import { filterWords } from "@lexi/core/domain/search";
import { useRouter } from "expo-router";
import { useDeferredValue, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { CategoryIcon } from "@/components/category-icon";
import { SearchField } from "@/components/search-field";
import { AppText, ProgressBar, Screen } from "@/components/ui";
import { WordRow } from "@/components/word-row";
import { useProgress, useStats } from "@/hooks/use-progress";
import { RADIUS, useTheme } from "@/theme";

/** Entry to the catalog: category cards with real progress, or results while searching. */
export function VocabularyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useProgress();
  const stats = useStats();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = useMemo(() => filterWords(WORDS, state, { query: deferred }), [state, deferred]);
  const searching = deferred.trim() !== "";

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <AppText variant="title" accessibilityRole="header">
          Vocabulario
        </AppText>
        <AppText variant="muted">
          {WORDS.length} palabras en {CATEGORIES.length} categorías. Elige una o busca en inglés o en español.
        </AppText>
      </View>
      <SearchField value={query} onChange={setQuery} placeholder="Busca «deadline» o «plazo»" label="Buscar palabra o traducción" />

      {searching ? (
        <View style={{ gap: 8 }}>
          <AppText variant="label" accessibilityLiveRegion="polite">
            {results.length === 1 ? "1 palabra" : `${results.length} palabras`}
          </AppText>
          {results.length === 0 ? (
            <AppText variant="muted">No hay palabras con «{deferred}». Prueba en inglés o en español.</AppText>
          ) : (
            results.map((word) => <WordRow key={word.id} word={word} state={state} />)
          )}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <AppText variant="heading">Categorías</AppText>
          {CATEGORIES.map((category) => {
            const c = stats.byCategory[category.id];
            return (
              <Pressable
                key={category.id}
                accessibilityRole="link"
                accessibilityLabel={`${category.name}: ${c.learned} de ${c.total} aprendidas`}
                onPress={() => router.push({ pathname: "/categoria/[id]", params: { id: category.id } })}
                style={({ pressed }) => ({
                  gap: 10,
                  padding: 14,
                  borderRadius: RADIUS.lg,
                  borderWidth: 1,
                  borderColor: pressed ? colors.accent : colors.line,
                  backgroundColor: colors.surface,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: RADIUS.md,
                      backgroundColor: colors["accent-soft"],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CategoryIcon id={category.id} color={colors.accent} />
                  </View>
                  <View>
                    <AppText variant="subheading">{category.name}</AppText>
                    <AppText variant="small">
                      {c.learned} de {c.total} aprendidas
                    </AppText>
                  </View>
                </View>
                <ProgressBar value={c.learned} secondary={c.review} max={c.total} label={`Progreso en ${category.name}`} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

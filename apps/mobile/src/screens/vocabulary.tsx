import { activePackIds, getWordsByPack, WORDS } from "@lexi/core/data/catalog";
import { getPack, PACKS, type Pack } from "@lexi/core/data/packs";
import { getWordStatus } from "@lexi/core/domain/progress";
import { filterWords } from "@lexi/core/domain/search";
import type { UserProgressState } from "@lexi/core/domain/types";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useDeferredValue, useState } from "react";
import { Pressable, View } from "react-native";
import { PackIcon } from "@/components/pack-icon";
import { SearchField } from "@/components/search-field";
import { AppText, Button, ProgressBar, Screen } from "@/components/ui";
import { WordRow } from "@/components/word-row";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { RADIUS, useTheme } from "@/theme";

/** Entry to the catalog: the packs in practice with real progress, the ones to add, or search results. */
export function VocabularyScreen() {
  const { colors } = useTheme();
  const { state } = useProgress();
  const { setPackActive } = useProgressActions();
  const [query, setQuery] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const deferred = useDeferredValue(query);
  const results = filterWords(WORDS, state, { query: deferred });
  const searching = deferred.trim() !== "";

  const active = activePackIds(state);
  const mine = PACKS.filter((p) => active.includes(p.id));
  const more = PACKS.filter((p) => !active.includes(p.id));

  const add = (pack: Pack) => {
    setPackActive(pack.id, true);
    setConfirmation(`${pack.name} se añadió a tu práctica.`);
  };

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <AppText variant="title" accessibilityRole="header">
          Vocabulario
        </AppText>
        <AppText variant="muted">
          {WORDS.length} palabras en {PACKS.length} paquetes. Elige uno o busca en inglés o en español.
        </AppText>
      </View>
      <SearchField value={query} onChange={setQuery} placeholder="Busca «deadline» o «plazo»" label="Buscar palabra o traducción" />
      {confirmation !== "" && (
        <AppText variant="label" color={colors.learned} accessibilityLiveRegion="polite">
          {confirmation}
        </AppText>
      )}

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
        <>
          <View style={{ gap: 10 }}>
            <AppText variant="heading" accessibilityRole="header">
              En tu práctica
            </AppText>
            {mine.map((pack) => (
              <PackCard key={pack.id} pack={pack} state={state} active />
            ))}
          </View>
          {more.length > 0 && (
            <View style={{ gap: 10 }}>
              <View style={{ gap: 2 }}>
                <AppText variant="heading" accessibilityRole="header">
                  Más paquetes
                </AppText>
                <AppText variant="muted">Añade los que te interesen: sus palabras entrarán en tu práctica diaria.</AppText>
              </View>
              {more.map((pack) => (
                <PackCard key={pack.id} pack={pack} state={state} active={false} onAdd={() => add(pack)} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function PackCard({
  pack,
  state,
  active,
  onAdd,
}: {
  pack: Pack;
  state: UserProgressState;
  active: boolean;
  onAdd?: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const words = getWordsByPack(pack.id);
  let learned = 0;
  let review = 0;
  for (const word of words) {
    const status = getWordStatus(state, word.id);
    if (status === "learned") learned += 1;
    else if (status === "review") review += 1;
  }
  const summary = active ? `${learned} de ${words.length} aprendidas` : `${words.length} palabras`;

  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${pack.name}: ${summary}`}
        onPress={() => router.push({ pathname: "/paquete/[id]", params: { id: pack.id } })}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}
      >
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
          <PackIcon id={pack.id} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{pack.name}</AppText>
          <AppText variant="small">{summary}</AppText>
        </View>
      </Pressable>
      {active ? (
        <ProgressBar value={learned} secondary={review} max={words.length} label={`Progreso en ${pack.name}`} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppText variant="small" style={{ flex: 1 }}>
            {getPack(pack.id)?.description}
          </AppText>
          {onAdd && (
            <Button
              title="Añadir"
              variant="secondary"
              icon={<Plus color={colors.ink} size={16} />}
              accessibilityLabel={`Añadir ${pack.name} a mi práctica`}
              onPress={onAdd}
            />
          )}
        </View>
      )}
    </View>
  );
}

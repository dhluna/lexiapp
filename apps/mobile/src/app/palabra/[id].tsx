import { getWord } from "@lexi/core/data/catalog";
import { Stack, useLocalSearchParams } from "expo-router";
import { WordSheetScreen } from "@/screens/word-sheet";

export default function WordRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: getWord(id)?.term ?? "Palabra" }} />
      <WordSheetScreen id={id} />
    </>
  );
}

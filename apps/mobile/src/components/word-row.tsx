import { getWordStatus } from "@lexi/core/domain/progress";
import type { UserProgressState, Word } from "@lexi/core/domain/types";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { RADIUS, useTheme } from "@/theme";
import { SpeakButton } from "./speak-button";
import { StatusBadge } from "./status-badge";
import { AppText } from "./ui";

/** One word in a list: opens its page; the listen button sits apart so it is its own target. */
export function WordRow({ word, state }: { word: Word; state: UserProgressState }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 8,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${word.term}: ${word.translation}`}
        onPress={() => router.push({ pathname: "/palabra/[id]", params: { id: word.id } })}
        style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
      >
        <AppText variant="heading" numberOfLines={1} accessibilityLanguage="en-US">
          {word.term}
        </AppText>
        <AppText variant="muted" numberOfLines={1}>
          {word.translation}
        </AppText>
      </Pressable>
      <StatusBadge status={getWordStatus(state, word.id)} />
      <SpeakButton text={word.term} label={`Escuchar ${word.term}`} size={44} />
    </View>
  );
}

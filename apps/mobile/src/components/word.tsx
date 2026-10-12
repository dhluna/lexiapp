import { getCategory } from "@lexi/core/data/categories";
import { PART_OF_SPEECH_LABELS } from "@lexi/core/domain/labels";
import { termScale } from "@lexi/core/domain/term-scale";
import type { Word } from "@lexi/core/domain/types";
import { StyleSheet, View } from "react-native";
import { FONTS, RADIUS, useTheme } from "@/theme";
import { SpeakButton } from "./speak-button";
import { AppText } from "./ui";

const TERM_SIZE = { lg: 46, md: 36, sm: 26 } as const;

function Pill({ label, tone }: { label: string; tone: "accent" | "neutral" }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tone === "accent" ? colors["accent-soft"] : colors["surface-sunken"],
        borderRadius: RADIUS.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <AppText variant="label" color={tone === "accent" ? colors.accent : colors["ink-soft"]}>
        {label}
      </AppText>
    </View>
  );
}

/** Term with the highlighter stroke, its IPA and the listen button (same layout as the web). */
export function WordHeading({ word }: { word: Word }) {
  const { colors } = useTheme();
  const size = TERM_SIZE[termScale(word.term)];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pill label={PART_OF_SPEECH_LABELS[word.partOfSpeech]} tone="accent" />
        <Pill label={getCategory(word.category)?.name ?? word.category} tone="neutral" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ alignSelf: "flex-start" }}>
            {/* The highlighter: a band behind the lower part of the word. */}
            <View
              style={[styles.marker, { backgroundColor: colors.marker, top: size * 0.55, height: size * 0.42 }]}
            />
            <AppText
              accessibilityRole="header"
              accessibilityLanguage="en-US"
              style={{ fontFamily: FONTS.display, fontSize: size, lineHeight: size * 1.12, letterSpacing: -0.5 }}
            >
              {word.term}
            </AppText>
          </View>
          <AppText
            variant="muted"
            accessibilityLabel={`Transcripción fonética: ${word.ipa}`}
            style={{ fontFamily: FONTS.ipa, fontSize: 18 }}
          >
            /{word.ipa}/
          </AppText>
        </View>
        <SpeakButton text={word.term} label={`Escuchar la pronunciación de ${word.term}`} />
      </View>
    </View>
  );
}

/** Meaning, verb forms and examples. */
export function WordDetails({ word }: { word: Word }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <AppText style={{ fontFamily: FONTS.displaySemi, fontSize: 24, lineHeight: 30 }} color={colors.accent}>
          {word.translation}
        </AppText>
        <AppText>{word.definition}</AppText>
      </View>

      {word.verbForms && (
        <View style={{ gap: 8 }}>
          <AppText variant="label" color={colors["ink-soft"]}>
            Formas del verbo{word.verbForms.irregular ? " (irregular)" : ""}
          </AppText>
          <View style={[styles.forms, { borderColor: colors.line }]}>
            {(
              [
                ["Infinitivo", word.term],
                ["Pasado", word.verbForms.past],
                ["Participio", word.verbForms.pastParticiple],
              ] as const
            ).map(([label, value], i) => (
              <View key={label} style={[styles.form, i > 0 && { borderLeftWidth: 1, borderColor: colors.line }]}>
                <AppText variant="small">{label}</AppText>
                <AppText variant="subheading" accessibilityLanguage="en-US" style={{ textAlign: "center" }}>
                  {value}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors["ink-soft"]}>
          Ejemplos
        </AppText>
        {word.examples.map((example) => (
          <View key={example.en} style={[styles.example, { backgroundColor: colors["surface-sunken"] }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="subheading" accessibilityLanguage="en-US">
                {example.en}
              </AppText>
              <AppText variant="muted">{example.es}</AppText>
            </View>
            <SpeakButton text={example.en} label={`Escuchar el ejemplo: ${example.en}`} size={40} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: { position: "absolute", left: -2, right: -2, borderRadius: 2 },
  forms: { flexDirection: "row", borderWidth: 1, borderRadius: RADIUS.md, overflow: "hidden" },
  form: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: "center", gap: 2 },
  example: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: RADIUS.md },
});

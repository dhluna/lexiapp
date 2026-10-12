import { Search } from "lucide-react-native";
import { TextInput, View } from "react-native";
import { FONTS, RADIUS, useTheme } from "@/theme";

export function SearchField({ value, onChange, placeholder, label }: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 52,
        paddingHorizontal: 14,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <Search size={20} color={colors["ink-soft"]} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors["ink-soft"]}
        accessibilityLabel={label}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        returnKeyType="search"
        style={{ flex: 1, fontFamily: FONTS.body, fontSize: 17, color: colors.ink, paddingVertical: 12 }}
      />
    </View>
  );
}

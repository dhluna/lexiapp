import { Platform } from "react-native";
import { useSpeech } from "@/hooks/use-speech";
import { Notice } from "./ui";

/** Shown when the device has no English voice: another language's voice would teach the wrong sounds. */
export function VoiceNotice() {
  const { availability } = useSpeech();
  if (availability !== "fallback") return null;
  return (
    <Notice title="Tu dispositivo no tiene una voz en inglés">
      {Platform.OS === "ios"
        ? "Instálala en Ajustes › Accesibilidad › Contenido leído › Voces › Inglés y vuelve a abrir Lexi."
        : "Instálala en Ajustes › Sistema › Idiomas › Salida de texto a voz › Instalar datos de voz › Inglés, y vuelve a abrir Lexi."}
    </Notice>
  );
}

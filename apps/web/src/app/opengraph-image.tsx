import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { WORDS } from "@lexi/core/data/catalog";
import { PACKS } from "@lexi/core/data/packs";

export const alt = "Lexi: vocabulario en inglés para practicar cada día";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#16193b";
const INK_SOFT = "#4b5070";
const ACCENT = "#3a3ed6";
const MARKER = "#ffe45c";

/** Cached so the image is rendered once at build time (cacheComponents treats file reads as uncached). */
async function loadFonts(): Promise<[ArrayBuffer, ArrayBuffer]> {
  "use cache";
  cacheLife("max"); // The fonts never change between deployments.
  const dir = join(process.cwd(), "assets/fonts");
  const read = async (file: string) => {
    const data = await readFile(join(dir, file));
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  };
  return Promise.all([read("BricolageGrotesque_700Bold.ttf"), read("AtkinsonHyperlegibleNext_400Regular.ttf")]);
}

/** The preview shown when a Lexi link is shared (WhatsApp, redes, Slack…). */
export default async function OpenGraphImage() {
  const [display, body] = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 72px",
          background: "#f3f5fb",
          fontFamily: "Atkinson",
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 64, letterSpacing: -2 }}>
            lexi<span style={{ color: ACCENT }}>.</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 28, fontFamily: "Bricolage", fontSize: 66, lineHeight: 1.08, letterSpacing: -2 }}>
            <span>Vocabulario en inglés,&nbsp;</span>
            <span style={{ backgroundImage: `linear-gradient(transparent 58%, ${MARKER} 58%, ${MARKER} 92%, transparent 92%)` }}>
              cada día
            </span>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: INK_SOFT }}>
            {WORDS.length} palabras en {PACKS.length} paquetes · pronunciación · ejemplos traducidos
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 340,
            padding: 36,
            borderRadius: 36,
            background: "#ffffff",
            boxShadow: "0 24px 60px rgba(22, 25, 59, 0.12)",
            transform: "rotate(3deg)",
          }}
        >
          <div style={{ display: "flex", alignSelf: "flex-start", padding: "6px 16px", borderRadius: 999, background: "#e6e7fd", color: ACCENT, fontSize: 22 }}>
            Viajes
          </div>
          <div style={{ display: "flex", marginTop: 22, fontFamily: "Bricolage", fontSize: 58, letterSpacing: -1 }}>luggage</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 30, color: INK_SOFT }}>equipaje</div>
          <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
            <div style={{ display: "flex", flex: 1, justifyContent: "center", padding: "14px 0", borderRadius: 16, background: "#fff0d6", color: "#9a5600", fontSize: 22 }}>
              Repasar
            </div>
            <div style={{ display: "flex", flex: 1, justifyContent: "center", padding: "14px 0", borderRadius: 16, background: "#0f7448", color: "#ffffff", fontSize: 22 }}>
              La sé
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: display, weight: 700, style: "normal" },
        { name: "Atkinson", data: body, weight: 400, style: "normal" },
      ],
    },
  );
}

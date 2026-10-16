import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Same mark as icon.svg ("l" + the yellow dot of "lexi."), full-bleed: iOS rounds the corners. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#3a3ed6", position: "relative" }}>
        <div style={{ position: "absolute", left: 53, top: 31, width: 31, height: 112, borderRadius: 16, background: "#ffffff" }} />
        <div style={{ position: "absolute", left: 101, top: 108, width: 37, height: 37, borderRadius: 999, background: "#ffe45c" }} />
      </div>
    ),
    size,
  );
}

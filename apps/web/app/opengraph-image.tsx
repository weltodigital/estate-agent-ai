import { ImageResponse } from "next/og";

// TODO(logo): PLACEHOLDER OG image — Bone wordmark + tagline on Hedge Green,
// rendered via ImageResponse with the bundled font. Swap in a static asset or
// load the real Newsreader font file once the logo/brand assets are finalised.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Privett: Marketing for property, done properly.";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#2E3B36", // Hedge Green
        fontFamily: "serif",
      }}
    >
      <div
        style={{
          fontSize: 120,
          color: "#F5F1E8", // Bone
          letterSpacing: "-0.015em",
          lineHeight: 1,
        }}
      >
        Privett
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 32,
          color: "#C9B8A0", // Sand
          fontFamily: "sans-serif",
        }}
      >
        Marketing for property, done properly.
      </div>
    </div>,
    { ...size },
  );
}

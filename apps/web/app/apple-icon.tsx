import { ImageResponse } from "next/og";

// TODO(logo): PLACEHOLDER Apple touch icon — same approach as icon.tsx, 180×180.
// Replace with a static apple-icon.png when the real logo arrives.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2E3B36", // Hedge Green
        color: "#F5F1E8", // Bone
        borderRadius: 40,
        fontSize: 120,
        fontWeight: 400,
        fontFamily: "serif",
        paddingBottom: 8,
      }}
    >
      P
    </div>,
    { ...size },
  );
}

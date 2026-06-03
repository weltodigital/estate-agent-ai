import { ImageResponse } from "next/og";

// TODO(logo): PLACEHOLDER favicon — a Newsreader-ish "P" in Bone on a Hedge
// Green rounded square, rendered via ImageResponse. When the real logo lands,
// delete this file and drop a static `favicon.ico` into app/ — a one-file swap.
// (ImageResponse uses its bundled font; the brand serif is approximated here.)

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        borderRadius: 7,
        fontSize: 22,
        fontWeight: 400,
        fontFamily: "serif",
        paddingBottom: 2,
      }}
    >
      P
    </div>,
    { ...size },
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Newsreader, Inter } from "next/font/google";
import { PRODUCT_NAME, PRODUCT_TAGLINE_DESCRIPTION } from "@/lib/copy";
import "./globals.css";

// Display / headings / wordmark. Loaded as a variable font so we can drive the
// opsz axis (range 6–72) via font-variation-settings (see globals.css /
// BRANDING.md). The wght axis is included by default; we only ever use 400 and
// 500 in CSS.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
  // Next has no fallback-metric data for Newsreader, so the automatic
  // size-adjust fallback can't run; disable it explicitly to avoid the
  // build-time "Failed to find font override values" warning.
  adjustFontFallback: false,
  fallback: ["Georgia", "serif"],
});

// Body, UI labels, navigation, numbers. Variable wght; we use 400 and 500 only.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: PRODUCT_TAGLINE_DESCRIPTION,
  applicationName: PRODUCT_NAME,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${newsreader.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

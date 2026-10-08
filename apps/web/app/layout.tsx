import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/lib/copy";
import "./globals.css";

// Headings and wordmark. Variable font so we can drive the opsz axis (see
// globals.css / BRANDING.md). Only weights 400 and 500 are used.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
  adjustFontFallback: false,
  fallback: ["Georgia", "serif"],
});

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: `${PRODUCT_NAME}: AI search visibility for estate agents`, template: `%s · ${PRODUCT_NAME}` },
  description: PRODUCT_DESCRIPTION,
  applicationName: PRODUCT_NAME,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${newsreader.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

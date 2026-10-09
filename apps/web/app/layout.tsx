import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/copy";
import { THEME_INIT_SCRIPT } from "@/components/brand/theme-toggle";
import "./globals.css";

// Instrument Sans for reading text, Geist Mono for numbers and raw AI
// answers, so evidence always looks like evidence. See BRANDING.md.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-instrument",
});

const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: `${PRODUCT_NAME}: ${PRODUCT_TAGLINE.replace(/\.$/, "")}`, template: `%s · ${PRODUCT_NAME}` },
  description: PRODUCT_DESCRIPTION,
  applicationName: PRODUCT_NAME,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${instrument.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

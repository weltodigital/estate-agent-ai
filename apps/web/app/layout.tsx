import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estate Agent AI",
  description:
    "Marketing tools for UK estate agents — AI-enhanced photos, AI staging, and AI floor plans.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}

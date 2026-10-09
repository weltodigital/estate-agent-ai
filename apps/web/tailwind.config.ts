import type { Config } from "tailwindcss";

// Privett design tokens. Colours resolve to CSS variables defined in
// app/globals.css (light + dark). See BRANDING.md.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: v("surface"), raised: v("surface-raised"), sunken: v("surface-sunken") },
        hairline: v("hairline"),
        ink: { DEFAULT: v("ink"), muted: v("ink-muted") },
        brand: { DEFAULT: v("brand"), tint: v("brand-tint") },
        "on-brand": v("on-brand"),
        signal: v("signal"),
        "on-signal": v("on-signal"),
        rival: { DEFAULT: v("data-rival"), soft: v("data-rival-soft") },
        up: v("up"),
        down: v("down"),
        warn: v("warn"),
        focus: v("focus"),
      },
      fontFamily: {
        sans: ["var(--font-instrument)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      fontSize: {
        display: ["44px", { lineHeight: "48px", letterSpacing: "-0.025em", fontWeight: "600" }],
        title: ["26px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "600" }],
        heading: ["17px", { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px" }],
        small: ["13px", { lineHeight: "18px" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "600" }],
        metric: ["36px", { lineHeight: "40px", letterSpacing: "-0.03em", fontWeight: "500" }],
        data: ["13px", { lineHeight: "20px" }],
      },
      borderRadius: { sm: "6px", md: "10px", lg: "16px" },
      boxShadow: { pop: "var(--shadow-pop)" },
    },
  },
  plugins: [],
};

export default config;

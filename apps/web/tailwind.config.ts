import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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
      // Motion tokens (docs/ux-spec.md section 8). Never ease-in for UI.
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: { 120: "120ms", 150: "150ms", 160: "160ms", 180: "180ms", 240: "240ms" },
      keyframes: {
        "fade-in-up": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        "pop-in": { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "none" } },
        "tick-pop": { "0%": { transform: "scale(0.6)", opacity: "0" }, "60%": { transform: "scale(1.15)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        pulse: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
      },
      animation: {
        "fade-in-up": "fade-in-up 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "pop-in": "pop-in 150ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "tick-pop": "tick-pop 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
        skeleton: "pulse 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [
    // hover-fine: only on devices with a real pointer, so taps don't stick.
    plugin(({ addVariant }) => {
      addVariant("hover-fine", "@media (hover: hover) and (pointer: fine) { &:hover }");
    }),
  ],
};

export default config;

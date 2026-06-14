import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Privett brand palette — see BRANDING.md. Literal defaults; per-agency
        // colour overrides happen via the CSS custom properties below, not here.
        brand: {
          hedge: "#2E3B36",
          "hedge-hover": "#364741", // primary button hover (~6% lighter)
          bone: "#F5F1E8",
          terracotta: "#B5663D",
          "terracotta-cream": "#FAEFE2", // warm cream for text on terracotta
          sand: "#C9B8A0",
          ink: "#1A1F1C",
          cream: "#FAF7F0",
          stone: "#E4DFD0",
          slate: "#9A968A",
          walnut: "#4A453A",
          // Semantic brand tokens, overridable per-agency at runtime via
          // CSS custom properties. Default to the Privett palette.
          primary: "var(--brand-primary)",
          secondary: "var(--brand-secondary)",
        },
        // Semantic tokens point at the brand palette by default so per-agency
        // overrides (which set these CSS custom properties inline) keep working.
        primary: "var(--brand-primary)",
        background: "var(--brand-background)",
        foreground: "var(--brand-foreground)",
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Newsreader", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Barely-there lift for cards on Bone — see BRANDING.md / design pass.
        card: "0 1px 2px rgba(26, 31, 28, 0.04), 0 4px 12px rgba(26, 31, 28, 0.04)",
        "card-hover": "0 2px 4px rgba(26, 31, 28, 0.06), 0 8px 24px rgba(26, 31, 28, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;

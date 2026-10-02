import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Radius scale: 8 / 12 / 16 / 24. `rounded-md` is the common control and tile radius.
    borderRadius: {
      none: "0",
      sm: "6px",
      DEFAULT: "8px",
      md: "12px",
      lg: "16px",
      xl: "24px",
      "2xl": "32px",
      full: "9999px",
    },
    // Type scale: Small 12/14, Body 16, H3 18/20, H2 24, H1 32/36. Body copy runs at 1.6, headings at 1.3 to 1.4.
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1.5" }],
      sm: ["0.875rem", { lineHeight: "1.5" }],
      base: ["1rem", { lineHeight: "1.6" }],
      lg: ["1.125rem", { lineHeight: "1.4" }],
      xl: ["1.25rem", { lineHeight: "1.4" }],
      "2xl": ["1.5rem", { lineHeight: "1.4" }],
      "3xl": ["2rem", { lineHeight: "1.3" }],
      "4xl": ["2.25rem", { lineHeight: "1.3" }],
      "5xl": ["3rem", { lineHeight: "1.15" }],
      "6xl": ["3.75rem", { lineHeight: "1.1" }],
    },
    extend: {
      colors: {
        teal: { ...colors.teal, DEFAULT: "#2dd4bf" }, // keep the full scale; DEFAULT is the brain-icon accent
      },
      fontFamily: {
        display: ["Barlow Semi Condensed", "Arial Narrow", "sans-serif"],
      },
      boxShadow: {
        // Tinted with the brand teal so depth reads as part of the palette, never as grey smudge.
        "mb-sm": "0 1px 2px rgba(13, 70, 82, 0.06), 0 1px 3px rgba(13, 70, 82, 0.08)",
        "mb-md": "0 4px 12px -2px rgba(13, 70, 82, 0.1), 0 2px 6px -2px rgba(13, 70, 82, 0.08)",
        "mb-lg": "0 16px 40px -12px rgba(13, 70, 82, 0.28), 0 6px 16px -6px rgba(13, 70, 82, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;

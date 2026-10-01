import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: { ...colors.teal, DEFAULT: "#2dd4bf" }, // keep the full scale; DEFAULT is the brain-icon accent
      },
      fontFamily: {
        display: ["Barlow Semi Condensed", "Arial Narrow", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

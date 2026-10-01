import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
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

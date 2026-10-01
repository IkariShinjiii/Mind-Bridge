import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f1c3f",      // deep indigo from the proposal deck
        ink2: "#14112b",     // deeper shade, used for gradient depth
        teal: { ...colors.teal, DEFAULT: "#2dd4bf" }, // keep the full scale; DEFAULT is the brain-icon accent
        mist: "#f4f5f9",     // light background for content screens
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f1c3f",      // deep indigo from the proposal deck
        ink2: "#14112b",     // deeper shade, used for gradient depth
        teal: "#2dd4bf",     // accent from the brain icon
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

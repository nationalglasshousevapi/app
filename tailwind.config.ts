import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f9",
          100: "#d6e9ee",
          500: "#1f748e",
          600: "#046380",
          700: "#03526a",
          900: "#013342",
        },
        secondary: {
          50: "#fffbeb",
          100: "#fef3c7",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          900: "#713f12",
        },
        tertiary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          900: "#581c87",
        },
      },
      fontSize: {
        "2xl": ["1.375rem", { lineHeight: "1.875rem" }],
        "3xl": ["1.625rem", { lineHeight: "2.125rem" }],
      },
    },
  },
  plugins: [],
};
export default config;

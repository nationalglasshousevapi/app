import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eaf0f1",
          100: "#c7d7db",
          200: "#a3bec6",
          300: "#7fa6b1",
          400: "#6d99a7",
          500: "#5B93A3",
          600: "#0F3A44",
          700: "#0c2e36",
          800: "#091f25",
          900: "#081e23",
        },
        brass: {
          50: "#f8f2e8",
          100: "#edddc2",
          400: "#d4a34e",
          500: "#B8863B",
          600: "#936b2f",
          700: "#6e5023",
          900: "#4a3517",
        },
        frost: "#F4F7F8",
        ink: "#1C2A2D",
        signal: {
          green: "#3F7D5C",
          rust: "#B4553E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
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

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sleeper: {
          dark: "#1a1d2e",
          darker: "#151728",
          accent: "#01b0a8",
          "accent-light": "#00d4c8",
          surface: "#232640",
          muted: "#8e92a4",
        },
      },
    },
  },
  plugins: [],
};

export default config;

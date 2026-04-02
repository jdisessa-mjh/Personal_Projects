import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#019a93",
          light: "#01b0a8",
          dark: "#017d77",
          50: "#f0fdfc",
          100: "#ccfbf1",
        },
      },
    },
  },
  plugins: [],
};

export default config;

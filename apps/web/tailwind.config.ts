import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "var(--color-navy, #182453)",
          50: "#e8ebf3",
          100: "#d1d7e8",
          800: "#182453",
          900: "#0f1738",
        },
        orange: {
          DEFAULT: "var(--color-orange, #F68B46)",
          500: "#F68B46",
          600: "#e07530",
        },
      },
    },
  },
  plugins: [],
};
export default config;

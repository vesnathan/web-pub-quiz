import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/theme";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        buzzer: {
          ready: "#22c55e",
          pressed: "#f59e0b",
          disabled: "#6b7280",
        },
        quiz: {
          bg: {
            dark: "#0B1020",
            darker: "#070B16",
            card: "#121833",
          },
          primary: {
            DEFAULT: "#38BDF8",
            glow: "#7DD3FC",
          },
          secondary: {
            DEFAULT: "#FACC15",
            glow: "#FDE047",
          },
          accent: {
            purple: "#A855F7",
            green: "#22C55E",
            red: "#EF4444",
          },
          live: {
            DEFAULT: "#EF4444",
            hover: "#DC2626",
          },
          text: {
            primary: "#E5E7EB",
            secondary: "#9CA3AF",
            inverted: "#020617",
          },
          border: {
            subtle: "#1E293B",
            glow: "#38BDF8",
          },
        },
      },
      animation: {
        "pulse-fast": "pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        buzz: "buzz 0.1s ease-in-out infinite",
      },
      keyframes: {
        buzz: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        dark: {
          colors: {
            background: "#00001B",
            foreground: "#f8fafc",
            primary: {
              50: "#f0f9ff",
              100: "#e0f2fe",
              200: "#bae6fd",
              300: "#7dd3fc",
              400: "#38bdf8",
              500: "#0ea5e9",
              600: "#0284c7",
              700: "#0369a1",
              800: "#075985",
              900: "#0c4a6e",
              DEFAULT: "#0ea5e9",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#22c55e",
              foreground: "#ffffff",
            },
            danger: {
              DEFAULT: "#ef4444",
              foreground: "#ffffff",
            },
            focus: "#0ea5e9",
          },
        },
      },
    }),
  ],
};

export default config;

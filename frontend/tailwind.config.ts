import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#edfcfb",
          100: "#d0f7f4",
          200: "#a5eeea",
          300: "#6de1db",
          400: "#30c8c2",
          500: "#17aaa4",
          600: "#108886",
          700: "#126264",
          800: "#134f51",
          900: "#133f41",
          950: "#062728"
        }
      },
      boxShadow: {
        panel: "0 1px 3px 0 rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.08)",
        "panel-lg": "0 4px 6px -2px rgba(0,0,0,0.05), 0 10px 40px -8px rgba(0,0,0,0.12)"
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.22s ease-out",
        "modal-in": "modal-in 0.2s ease-out"
      }
    }
  },
  plugins: []
} satisfies Config;

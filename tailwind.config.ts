import type { Config } from "tailwindcss";

// Paleta: verde escuro, verde claro, azul petróleo e branco.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        floresta: "#0f3d2e",   // verde escuro
        folha: "#2f9e62",      // verde médio (ações)
        brota: "#dff3e6",      // verde claro (fundos)
        petroleo: "#0e5a66",   // azul petróleo
        musgo: "#f4f8f5",      // fundo da página
      },
      keyframes: {
        screenIn: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.14)" }, "100%": { transform: "scale(1)" } },
        countIn: { from: { opacity: "0", transform: "scale(1.7)" }, to: { opacity: "1", transform: "scale(1)" } },
        softPulse: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
      },
      animation: {
        "screen-in": "screenIn .35s ease-out both",
        pop: "pop .5s ease-out",
        "count-in": "countIn .8s ease-out both",
        "soft-pulse": "softPulse 1s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

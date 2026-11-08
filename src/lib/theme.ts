import type { DimId } from "./scoring.ts";

// Identidade visual FIXA de cada dimensão (mesma cor e ícone em todos os gráficos e telas).
export const DIM_META: Record<DimId, { color: string; icon: "Sprout" | "Car" | "Zap" | "ShoppingBag" | "Droplets"; short: string }> = {
  alimentacao: { color: "#2f9e62", icon: "Sprout", short: "Alimentação" },
  transporte: { color: "#0e5a66", icon: "Car", short: "Transporte" },
  energia: { color: "#d9a21b", icon: "Zap", short: "Energia" },
  consumo: { color: "#7c6a9e", icon: "ShoppingBag", short: "Consumo" },
  residuos: { color: "#38a8c8", icon: "Droplets", short: "Resíduos e água" },
};

export const CLASS_COLORS = {
  muito_baixa: "#7bc99a", baixa_moderada: "#2f9e62", alta: "#0e5a66", muito_alta: "#0f3d2e",
} as const;

export const fmt = (n: number, decimals = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: decimals });

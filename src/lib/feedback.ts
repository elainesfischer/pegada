import type { DimId } from "./scoring.ts";

// Sugestões simples, sem tom moralista.
export const TIPS: Record<DimId, string[]> = {
  alimentacao: [
    "Reduzir o desperdício de alimentos em casa.",
    "Experimentar mais refeições vegetais ao longo da semana.",
    "Priorizar alimentos locais e da estação.",
  ],
  transporte: [
    "Utilizar transporte coletivo quando for possível.",
    "Caminhar ou usar bicicleta em trajetos curtos.",
    "Compartilhar deslocamentos com colegas ou familiares.",
  ],
  energia: [
    "Desligar aparelhos que não estão em uso.",
    "Trocar lâmpadas por modelos LED.",
    "Reduzir o uso desnecessário de climatização.",
  ],
  consumo: [
    "Prolongar a vida útil dos produtos que você já tem.",
    "Consertar antes de substituir.",
    "Considerar troca, empréstimo e produtos usados.",
  ],
  residuos: [
    "Separar materiais recicláveis.",
    "Utilizar garrafas, copos e sacolas reutilizáveis.",
    "Reduzir o tempo de banho e evitar desperdício de água.",
  ],
};

export const METHOD_NOTE =
  "Este instrumento foi desenvolvido para fins educativos e de sensibilização ambiental. A pontuação permite comparar padrões de hábitos dentro da atividade, mas não corresponde diretamente à metodologia internacional de cálculo da Pegada Ecológica em hectares globais (gha).";

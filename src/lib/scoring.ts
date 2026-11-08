// Cálculo do índice educativo de Pegada Ecológica.
// A função SQL submit_response (supabase/schema.sql) é a fonte oficial; esta cópia
// serve para testes automáticos e para exibir dados no painel.

export const DIM_IDS = ["alimentacao", "transporte", "energia", "consumo", "residuos"] as const;
export type DimId = (typeof DIM_IDS)[number];
export const DIM_LABELS: Record<DimId, string> = {
  alimentacao: "Alimentação",
  transporte: "Transporte",
  energia: "Energia e moradia",
  consumo: "Consumo",
  residuos: "Resíduos e água",
};
export const DIM_MAX = 12;
export const TOTAL_MAX = 60;

export type ClassKey = "muito_baixa" | "baixa_moderada" | "alta" | "muito_alta";
export const CLASS_KEYS: ClassKey[] = ["muito_baixa", "baixa_moderada", "alta", "muito_alta"];
export const CLASS_LABELS: Record<ClassKey, string> = {
  muito_baixa: "Pegada ecológica muito baixa",
  baixa_moderada: "Pegada ecológica baixa a moderada",
  alta: "Pegada ecológica alta",
  muito_alta: "Pegada ecológica muito alta",
};
export const CLASS_SHORT: Record<ClassKey, string> = {
  muito_baixa: "Muito baixa",
  baixa_moderada: "Baixa a moderada",
  alta: "Alta",
  muito_alta: "Muito alta",
};
export const CLASS_RANGES: Record<ClassKey, string> = {
  muito_baixa: "0–15", baixa_moderada: "16–30", alta: "31–45", muito_alta: "46–60",
};

export function classify(total: number): ClassKey {
  if (total <= 15) return "muito_baixa";
  if (total <= 30) return "baixa_moderada";
  if (total <= 45) return "alta";
  return "muito_alta";
}

/** answers: 20 valores (0–3). Retorna as 5 pontuações por dimensão, o total e a classificação. */
export function computeScores(answers: number[]) {
  if (answers.length !== 20 || answers.some((v) => !Number.isInteger(v) || v < 0 || v > 3)) {
    throw new Error("Respostas inválidas: são necessárias 20 respostas entre 0 e 3.");
  }
  const scores = [0, 1, 2, 3, 4].map((d) =>
    answers.slice(d * 4, d * 4 + 4).reduce((a, b) => a + b, 0)
  );
  const total = scores.reduce((a, b) => a + b, 0);
  return { scores, total, classification: classify(total) };
}

/** Dimensão(ões) de maior pontuação. Em empate, devolve a primeira (ordem do questionário). */
export function topDimension(scores: number[]): number {
  return scores.indexOf(Math.max(...scores));
}

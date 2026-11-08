import { CLASS_KEYS, type ClassKey, DIM_MAX } from "./scoring.ts";

export type ResponseRow = {
  id: string;
  participant_id: string;
  session_id: string;
  answers: number[];
  score_alimentacao: number;
  score_transporte: number;
  score_energia: number;
  score_consumo: number;
  score_residuos: number;
  total: number;
  classification: ClassKey;
  created_at: string;
};

export type ParticipantRow = {
  id: string;
  session_id: string;
  nickname: string | null;
  status: "answering" | "completed";
  created_at: string;
};

export function rowScores(r: ResponseRow): number[] {
  return [r.score_alimentacao, r.score_transporte, r.score_energia, r.score_consumo, r.score_residuos];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type ClassStats = {
  n: number;
  mean: number; min: number; max: number; median: number;
  distribution: Record<ClassKey, number>;
  dimMeans: number[];      // 0–12
  dimPercents: number[];   // 0–100
  highest: number;         // índice da dimensão com maior média
  lowest: number;          // índice da dimensão com menor média
};

export function computeStats(rows: ResponseRow[]): ClassStats | null {
  if (!rows.length) return null;
  const totals = rows.map((r) => r.total);
  const distribution = Object.fromEntries(CLASS_KEYS.map((k) => [k, 0])) as Record<ClassKey, number>;
  rows.forEach((r) => (distribution[r.classification] += 1));
  const dimMeans = [0, 1, 2, 3, 4].map((d) => round1(rows.reduce((a, r) => a + rowScores(r)[d], 0) / rows.length));
  const dimPercents = dimMeans.map((m) => Math.round((m / DIM_MAX) * 100));
  return {
    n: rows.length,
    mean: round1(totals.reduce((a, b) => a + b, 0) / rows.length),
    min: Math.min(...totals),
    max: Math.max(...totals),
    median: median(totals),
    distribution,
    dimMeans,
    dimPercents,
    highest: dimMeans.indexOf(Math.max(...dimMeans)),
    lowest: dimMeans.indexOf(Math.min(...dimMeans)),
  };
}

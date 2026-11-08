import { CLASS_KEYS, CLASS_SHORT, CLASS_LABELS, DIM_IDS, DIM_LABELS, classify, type ClassKey } from "./scoring.ts";
import type { ClassStats } from "./stats.ts";
import { fmt } from "./theme.ts";

/** Faixa(s) com mais participantes (pode haver empate). */
export function predominantClasses(dist: Record<ClassKey, number>): ClassKey[] {
  const max = Math.max(...CLASS_KEYS.map((k) => dist[k]));
  return max === 0 ? [] : CLASS_KEYS.filter((k) => dist[k] === max);
}

export const meanClass = (mean: number): ClassKey => classify(Math.round(mean));
const pct = (count: number, n: number) => Math.round((count / n) * 100);
const lower = (s: string) => s.toLowerCase();

/** Frases simples e factuais sobre os resultados (sem exageros). */
export function resultSentences(stats: ClassStats): string[] {
  const hi = DIM_LABELS[DIM_IDS[stats.highest]];
  const lo = DIM_LABELS[DIM_IDS[stats.lowest]];
  const out: string[] = [];
  if (stats.dimMeans[stats.highest] === stats.dimMeans[stats.lowest]) {
    out.push("As cinco dimensões apresentaram a mesma pontuação média.");
  } else {
    out.push(`A dimensão ${hi} apresentou a maior pontuação média da turma.`);
    out.push(`A dimensão ${lo} apresentou a menor pontuação média.`);
  }
  const pre = predominantClasses(stats.distribution);
  if (pre.length === 1) {
    out.push(`${pct(stats.distribution[pre[0]], stats.n)}% dos participantes ficaram na faixa de pegada ${lower(CLASS_SHORT[pre[0]])}.`);
  } else if (pre.length > 1) {
    out.push(`Houve empate entre as faixas ${pre.map((k) => lower(CLASS_SHORT[k])).join(" e ")} (${pct(stats.distribution[pre[0]], stats.n)}% cada).`);
  }
  out.push(`A pontuação média foi ${fmt(stats.mean)} de 60 (${lower(CLASS_LABELS[meanClass(stats.mean)])}).`);
  return out;
}

/** Três perguntas que mudam conforme os resultados reais. */
export function discussionQuestions(stats: ClassStats): string[] {
  const hi = DIM_LABELS[DIM_IDS[stats.highest]];
  const lo = DIM_LABELS[DIM_IDS[stats.lowest]];
  const spread = stats.dimPercents[stats.highest] - stats.dimPercents[stats.lowest];
  const highShare = pct(stats.distribution.alta + stats.distribution.muito_alta, stats.n);

  const q1 = spread < 10
    ? "As cinco dimensões ficaram com pontuações próximas. O que isso diz sobre os hábitos da turma?"
    : `Por que a dimensão "${hi}" pode ter apresentado a maior pressão ambiental?`;
  const q2 = highShare >= 50
    ? `Quais mudanças seriam viáveis na rotina da turma para reduzir a pressão em "${hi}"?`
    : `O que ajuda a turma a manter hábitos de menor pressão ambiental e o que ainda poderia melhorar em "${hi}"?`;
  const q3 = spread < 10
    ? "Quais hábitos sustentáveis a turma já apresenta no dia a dia?"
    : `Em quais hábitos, como em "${lo}", a turma já apresenta melhor desempenho ambiental?`;
  return [q1, q2, q3];
}

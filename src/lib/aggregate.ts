import { DIM_MAX, type ClassKey } from "./scoring.ts";
import type { ClassStats } from "./stats.ts";

/** Monta ClassStats a partir do resultado agregado da página pública. */
export function computeStatsFromAggregate(d: {
  n: number; mean: number; min: number; max: number; median: number;
  distribution: Record<ClassKey, number>; dimMeans: number[];
}): ClassStats {
  const dimMeans = d.dimMeans.map(Number);
  return {
    n: d.n, mean: Number(d.mean), min: d.min, max: d.max, median: Number(d.median),
    distribution: d.distribution, dimMeans,
    dimPercents: dimMeans.map((m) => Math.round((m / DIM_MAX) * 100)),
    highest: dimMeans.indexOf(Math.max(...dimMeans)),
    lowest: dimMeans.indexOf(Math.min(...dimMeans)),
  };
}

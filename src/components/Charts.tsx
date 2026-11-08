"use client";
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { DIM_IDS, DIM_LABELS, CLASS_KEYS, CLASS_SHORT } from "@/lib/scoring";
import type { ClassKey } from "@/lib/scoring";
import { CLASS_COLORS, DIM_META } from "@/lib/theme";

const DARK = "#0f3d2e";
// Os gráficos mantêm a mesma instância ao receber novos dados: o Recharts anima a transição
// (as barras crescem/encolhem suavemente) em vez de redesenhar do zero.
const ANIM = { isAnimationActive: true, animationDuration: 700, animationEasing: "ease-out" as const };

/** Radar das 5 dimensões (valores de 0 a 12). */
export function DimRadar({ values, height = 300, big = false, light = false }: { values: number[]; height?: number; big?: boolean; light?: boolean }) {
  const data = DIM_IDS.map((id, i) => ({ dim: DIM_META[id].short, valor: values[i] }));
  const ink = light ? "#ffffff" : DARK;
  return (
    <div style={{ height }} role="img" aria-label="Gráfico radar das cinco dimensões">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke={light ? "#ffffff55" : "#cfe3d6"} />
          <PolarAngleAxis dataKey="dim" tick={{ fill: ink, fontSize: big ? 20 : 12, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 12]} tickCount={5} tick={{ fontSize: big ? 14 : 10, fill: light ? "#ffffffaa" : "#6b8a7a" }} />
          <Radar dataKey="valor" stroke="#0e5a66" strokeWidth={big ? 4 : 2} fill="#2f9e62" fillOpacity={0.5} {...ANIM} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontais das 5 dimensões. unit="score": 0–12; unit="percent": 0–100%. */
export function DimBars({ values, height = 280, big = false, unit = "score" }: {
  values: number[]; height?: number; big?: boolean; unit?: "score" | "percent";
}) {
  const percent = unit === "percent";
  const data = DIM_IDS.map((id, i) => ({
    id, dim: DIM_LABELS[id],
    valor: percent ? Math.round((values[i] / 12) * 100) : values[i],
  }));
  const fs = big ? 20 : 12;
  return (
    <div style={{ height }} role="img" aria-label="Gráfico de barras das cinco dimensões">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: big ? 70 : 40 }}>
          <CartesianGrid horizontal={false} stroke="#e3efe7" />
          <XAxis type="number" domain={[0, percent ? 100 : 12]} tick={{ fill: DARK, fontSize: big ? 16 : 12 }} />
          <YAxis type="category" dataKey="dim" width={big ? 210 : 120} tick={{ fill: DARK, fontSize: fs, fontWeight: 600 }} />
          <Tooltip formatter={(v: number) => [percent ? `${v}%` : `${v}/12`, "Turma"]} />
          <Bar dataKey="valor" radius={[0, 6, 6, 0]} {...ANIM}
            label={{ position: "right", fill: DARK, fontSize: fs, fontWeight: 700, formatter: (v: number) => (percent ? `${v}%` : `${v}/12`) }}>
            {data.map((d) => <Cell key={d.id} fill={DIM_META[d.id].color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Distribuição de alunos por classificação. */
export function DistributionChart({ distribution, height = 260, big = false }: { distribution: Record<ClassKey, number>; height?: number; big?: boolean }) {
  const data = CLASS_KEYS.map((k) => ({ nome: CLASS_SHORT[k], alunos: distribution[k], k }));
  const fs = big ? 20 : 12;
  return (
    <div style={{ height }} role="img" aria-label="Distribuição dos resultados da turma">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 28 }}>
          <CartesianGrid vertical={false} stroke="#e3efe7" />
          <XAxis dataKey="nome" tick={{ fill: DARK, fontSize: fs, fontWeight: 600 }} />
          <YAxis allowDecimals={false} tick={{ fill: DARK, fontSize: big ? 16 : 12 }} />
          <Tooltip formatter={(v: number) => [`${v} aluno(s)`, ""]} />
          <Bar dataKey="alunos" radius={[6, 6, 0, 0]} {...ANIM} label={{ position: "top", fill: DARK, fontSize: big ? 24 : 12, fontWeight: 700 }}>
            {data.map((d) => <Cell key={d.k} fill={CLASS_COLORS[d.k]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

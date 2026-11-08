"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Leaf, Loader2, Lock } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { DIM_IDS, DIM_LABELS, CLASS_SHORT, type ClassKey } from "@/lib/scoring";
import { fmt } from "@/lib/theme";
import { meanClass, resultSentences } from "@/lib/insights";
import { computeStatsFromAggregate } from "@/lib/aggregate";
import { DimBars, DimRadar, DistributionChart } from "@/components/Charts";
import { MethodNote } from "@/components/MethodNote";

type Public = { name: string; date: string; n: number; mean: number; min: number; max: number; median: number;
  distribution: Record<ClassKey, number>; dimMeans: number[] };

/** Página pública: SOMENTE dados coletivos. Não existe nenhum dado individual nesta tela. */
export default function PublicResults() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<Public | null | undefined>(undefined);

  useEffect(() => {
    getSupabase().rpc("get_public_results", { p_code: String(code) }).then(({ data, error }) => setData(error ? null : (data as Public | null)));
  }, [code]);

  if (data === undefined) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-folha" aria-label="Carregando" /></main>;
  if (!data || !data.n) return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
      <Lock className="h-10 w-10 text-petroleo" aria-hidden />
      <h1 className="text-xl font-bold">Resultados indisponíveis</h1>
      <p className="text-floresta/75">Esta página não está ativada ou a atividade ainda não foi encerrada.</p>
    </main>
  );

  const stats = computeStatsFromAggregate(data);
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <header>
        <Leaf className="mb-2 h-8 w-8 text-folha" aria-hidden />
        <h1 className="text-2xl font-extrabold">Pegada Ecológica da Turma</h1>
        <p className="text-floresta/75">{data.name} · {new Date(data.date).toLocaleDateString("pt-BR")} · {data.n} participantes</p>
      </header>
      <section className="rounded-xl bg-floresta p-6 text-white">
        <p className="text-sm text-white/70">Média da turma (índice educativo)</p>
        <p className="text-5xl font-extrabold">{fmt(data.mean)}<span className="text-2xl text-white/70"> / 60</span></p>
        <p className="mt-2 font-semibold">Classificação média: {CLASS_SHORT[meanClass(data.mean)]}</p>
      </section>
      <section className="card"><h2 className="mb-1 font-bold">Média por dimensão (0 a 12)</h2><DimBars values={data.dimMeans} /><DimRadar values={data.dimMeans} /></section>
      <section className="card"><h2 className="mb-1 font-bold">Distribuição</h2><DistributionChart distribution={data.distribution} /></section>
      <section className="card">
        <ul className="list-disc space-y-1 pl-5">{resultSentences(stats).map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="mt-2 text-sm text-floresta/60">Maior pressão relativa: {DIM_LABELS[DIM_IDS[stats.highest]]} · Menor: {DIM_LABELS[DIM_IDS[stats.lowest]]}</p>
      </section>
      <MethodNote />
    </main>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getSupabase } from "@/lib/supabase/client";
import { DIM_IDS, DIM_LABELS } from "@/lib/scoring";
import { DIM_META, fmt } from "@/lib/theme";
import { MethodNote } from "@/components/MethodNote";

type Session = { id: string; name: string; created_at: string };
type Summary = Record<string, number | null> & { session_id: string };
const COLORS = ["#0f3d2e", "#2f9e62", "#0e5a66", "#8fbfa6", "#5b6b64", "#38a8c8"];
const MAX = 6;
const KEYS = ["mean_alimentacao", "mean_transporte", "mean_energia", "mean_consumo", "mean_residuos"] as const;

/** Área separada do Modo Aula: compara médias geral e por dimensão entre turmas. */
export default function ComparePage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sums, setSums] = useState<Record<string, Summary>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const [s, m] = await Promise.all([
        supabase.from("sessions").select("id,name,created_at").order("created_at", { ascending: false }),
        supabase.from("session_summaries").select("*"),
      ]);
      if (s.error || m.error) { setError("Não foi possível carregar os dados. Confirme que a atualização 2 (migration-v2.sql) foi executada."); return; }
      const map: Record<string, Summary> = {};
      ((m.data ?? []) as Summary[]).forEach((x) => (map[x.session_id as string] = x));
      setSums(map);
      setSessions((s.data as Session[]).filter((x) => (map[x.id]?.completed ?? 0) > 0));
    })();
  }, []);

  const chosen = useMemo(() => (sessions ?? []).filter((s) => picked.includes(s.id)), [sessions, picked]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));

  const label = (s: Session) => s.name.length > 28 ? `${s.name.slice(0, 27)}…` : s.name;
  const data = DIM_IDS.map((d, i) => {
    const row: Record<string, string | number> = { dim: DIM_META[d].short };
    chosen.forEach((s) => (row[s.id] = Number(sums[s.id]?.[KEYS[i]] ?? 0)));
    return row;
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Link href="/professor" className="inline-flex items-center gap-1 text-sm text-petroleo"><ArrowLeft className="h-4 w-4" aria-hidden /> Turmas</Link>
      <h1 className="text-2xl font-bold">COMPARAR TURMAS</h1>
      <p className="text-floresta/75">Escolha de 2 a {MAX} turmas com respostas para comparar a média geral e as cinco dimensões.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="card">
        <h2 className="mb-2 font-bold">Turmas</h2>
        {sessions === null ? <p className="text-floresta/60">Carregando…</p> : sessions.length === 0 ? <p>Nenhuma turma com respostas ainda.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 ${picked.includes(s.id) ? "border-folha bg-brota" : "border-floresta/15"}`}>
                  <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} className="h-5 w-5 accent-folha" />
                  <span><span className="block font-medium">{s.name}</span>
                    <span className="text-xs text-floresta/60">{new Date(s.created_at).toLocaleDateString("pt-BR")} · {sums[s.id]?.completed} respostas</span></span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {chosen.length >= 2 && (
        <>
          <section className="card">
            <h2 className="mb-2 font-bold">Média por dimensão (0 a 12)</h2>
            <div style={{ height: 340 }} role="img" aria-label="Comparação das dimensões entre turmas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid vertical={false} stroke="#e3efe7" />
                  <XAxis dataKey="dim" tick={{ fill: "#0f3d2e", fontSize: 12 }} />
                  <YAxis domain={[0, 12]} tick={{ fill: "#0f3d2e", fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {chosen.map((s, i) => <Bar key={s.id} dataKey={s.id} name={label(s)} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-floresta/15"><th className="py-2 pr-3">Indicador</th>
                {chosen.map((s, i) => <th key={s.id} className="pr-3"><span className="mr-1 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: COLORS[i % COLORS.length] }} />{label(s)}</th>)}</tr></thead>
              <tbody>
                <tr className="border-b border-floresta/10 font-semibold"><td className="py-2 pr-3">Média geral (0–60)</td>{chosen.map((s) => <td key={s.id}>{fmt(Number(sums[s.id]?.mean_total ?? 0))}</td>)}</tr>
                {DIM_IDS.map((d, i) => (
                  <tr key={d} className="border-b border-floresta/10"><td className="py-2 pr-3">{DIM_LABELS[d]} (0–12)</td>
                    {chosen.map((s) => <td key={s.id}>{fmt(Number(sums[s.id]?.[KEYS[i]] ?? 0))}</td>)}</tr>
                ))}
                <tr><td className="py-2 pr-3">Participantes concluídos</td>{chosen.map((s) => <td key={s.id}>{sums[s.id]?.completed}</td>)}</tr>
              </tbody>
            </table>
          </section>
        </>
      )}
      <MethodNote />
    </main>
  );
}

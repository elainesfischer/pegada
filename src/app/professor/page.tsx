"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GitCompare, Leaf, LogOut, Plus, Search, Users } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { DIM_IDS, DIM_LABELS } from "@/lib/scoring";
import { fmt } from "@/lib/theme";
import { DimGlyph } from "@/components/DimIcon";

type Session = { id: string; name: string; code: string; status: "open" | "closed"; created_at: string };
type Summary = {
  session_id: string; participants: number; completed: number; mean_total: number | null;
  mean_alimentacao: number | null; mean_transporte: number | null; mean_energia: number | null;
  mean_consumo: number | null; mean_residuos: number | null;
};

function summaryDims(s?: Summary): (number | null)[] {
  if (!s) return [null, null, null, null, null];
  return [s.mean_alimentacao, s.mean_transporte, s.mean_energia, s.mean_consumo, s.mean_residuos].map((v) => (v === null ? null : Number(v)));
}
function extremes(dims: (number | null)[]) {
  if (dims.some((d) => d === null)) return null;
  const v = dims as number[];
  return { hi: DIM_IDS[v.indexOf(Math.max(...v))], lo: DIM_IDS[v.indexOf(Math.min(...v))] };
}

export default function ProfessorHome() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [s, m] = await Promise.all([
      supabase.from("sessions").select("id,name,code,status,created_at").order("created_at", { ascending: false }),
      supabase.from("session_summaries").select("*"),
    ]);
    if (s.error) { setError("Não foi possível carregar as turmas."); return; }
    setSessions(s.data as Session[]);
    // Se a atualização 2 ainda não foi aplicada, a lista funciona sem os resumos.
    const map: Record<string, Summary> = {};
    ((m.data ?? []) as Summary[]).forEach((x) => (map[x.session_id] = x));
    setSummaries(map);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError("");
    const { data, error } = await getSupabase().from("sessions").insert({ name: name.trim() }).select("id").single();
    setBusy(false);
    if (error || !data) { setError("Não foi possível criar a turma. Tente novamente."); return; }
    router.push(`/professor/sessao/${data.id}`);
  }
  async function logout() {
    await getSupabase().auth.signOut();
    router.replace("/professor/login"); router.refresh();
  }

  const filtered = useMemo(
    () => (sessions ?? []).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())),
    [sessions, query]
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Leaf className="h-6 w-6 text-folha" aria-hidden /> Painel do professor</h1>
        <button onClick={logout} className="btn-secondary"><LogOut className="h-4 w-4" aria-hidden /> Sair</button>
      </header>

      <form onSubmit={create} className="card space-y-3">
        <label htmlFor="name" className="font-semibold">Nova turma</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="name" className="input" maxLength={120} placeholder="Ex.: Pegada Ecológica — SI 1º semestre" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary whitespace-nowrap px-5" disabled={busy || !name.trim()}><Plus className="h-4 w-4" aria-hidden /> Iniciar atividade</button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </form>

      <section aria-label="Histórico de turmas" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Histórico</h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-floresta/50" aria-hidden />
              <input className="input py-2 pl-9 text-sm" placeholder="Buscar turma" aria-label="Buscar turma" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Link href="/professor/comparar" className="btn-secondary"><GitCompare className="h-4 w-4" aria-hidden /> COMPARAR TURMAS</Link>
          </div>
        </div>

        {sessions === null ? <p className="text-floresta/60">Carregando…</p> :
         filtered.length === 0 ? <p className="card text-floresta/70">{sessions.length ? "Nenhuma turma encontrada." : "Nenhuma turma ainda. Crie a primeira acima."}</p> : (
          <ul className="space-y-2">
            {filtered.map((s) => {
              const sum = summaries[s.id];
              const ex = extremes(summaryDims(sum));
              return (
                <li key={s.id}>
                  <Link href={`/professor/sessao/${s.id}`} className="card block hover:border-folha">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-sm text-floresta/60">{new Date(s.created_at).toLocaleDateString("pt-BR")} · Código {s.code}</p>
                      </div>
                      <span className="text-sm">{s.status === "open" ? "🟢 Aberto" : "🔴 Encerrado"}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-floresta/60">Participantes</dt><dd className="flex items-center gap-1 font-semibold"><Users className="h-4 w-4" aria-hidden />{sum?.participants ?? 0}</dd></div>
                      <div><dt className="text-floresta/60">Média</dt><dd className="font-semibold">{sum?.mean_total != null ? `${fmt(Number(sum.mean_total))}/60` : "—"}</dd></div>
                      <div><dt className="text-floresta/60">Maior impacto</dt><dd className="flex items-center gap-1 font-semibold">{ex ? <><DimGlyph dim={ex.hi} className="h-4 w-4" />{DIM_LABELS[ex.hi]}</> : "—"}</dd></div>
                      <div><dt className="text-floresta/60">Menor impacto</dt><dd className="flex items-center gap-1 font-semibold">{ex ? <><DimGlyph dim={ex.lo} className="h-4 w-4" />{DIM_LABELS[ex.lo]}</> : "—"}</dd></div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

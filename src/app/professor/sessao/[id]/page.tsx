"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Copy, CopyPlus, Download, Expand, FileSpreadsheet, LockOpen, Monitor, RotateCcw, Square, Trash2,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { CLASS_KEYS, CLASS_LABELS, CLASS_RANGES, CLASS_SHORT, DIM_IDS, DIM_LABELS, TOTAL_MAX } from "@/lib/scoring";
import { exportCSV, exportXLSX } from "@/lib/export";
import { discussionQuestions, meanClass } from "@/lib/insights";
import type { ResultImageData } from "@/lib/resultImage";
import { fmt } from "@/lib/theme";
import { useSessionLive } from "@/hooks/useSessionLive";
import { useClassTimer } from "@/hooks/useClassTimer";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { ClassMode } from "@/components/ClassMode";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DimBars, DimRadar, DistributionChart } from "@/components/Charts";
import { DimGlyph } from "@/components/DimIcon";
import { MethodNote } from "@/components/MethodNote";
import { PublicResultsControl } from "@/components/PublicResultsControl";
import { ResultImageButton } from "@/components/ResultImageButton";
import { TimerControl, TimerExpiredDialog } from "@/components/TimerControl";

type Confirm = "end" | "reset" | "delete" | null;

export default function SessionDashboard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabase();
  const { session, participants, responses, counts, stats, live, missing, refresh, patchSession, clearLocal } = useSessionLive(id);

  const open = session?.status !== "closed";
  const timer = useClassTimer(id, open);
  const [classMode, setClassMode] = useState<null | { qr: boolean }>(null);
  const [revealed, setRevealed] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setOrigin(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin); }, []);
  const link = `${origin}/p/${session?.code ?? ""}`;
  const publicLink = `${origin}/r/${session?.code ?? ""}`;
  const nickById = useMemo(() => new Map(participants.map((p) => [p.id, p.nickname])), [participants]);

  const imageData: ResultImageData | null = useMemo(() => {
    if (!stats || !session) return null;
    return {
      sessionName: session.name, dateLabel: new Date(session.created_at).toLocaleDateString("pt-BR"),
      n: stats.n, mean: stats.mean, classLabel: CLASS_SHORT[meanClass(stats.mean)],
      dimMeans: stats.dimMeans, highest: stats.highest, lowest: stats.lowest,
    };
  }, [stats, session]);

  const setStatus = useCallback(async (status: "open" | "closed") => {
    const { error } = await supabase.from("sessions").update({ status }).eq("id", id);
    if (error) { setError("Não foi possível alterar o status da atividade."); return; }
    setError(""); patchSession({ status });
  }, [supabase, id, patchSession]);

  const endActivity = useCallback(async () => { timer.stop(); await setStatus("closed"); }, [timer, setStatus]);
  const togglePublic = useCallback(async (v: boolean) => {
    const { error } = await supabase.from("sessions").update({ public_results: v }).eq("id", id);
    if (error) { setError("Não foi possível alterar a página pública. Rode a atualização 2 (migration-v2.sql)."); return; }
    patchSession({ public_results: v });
  }, [supabase, id, patchSession]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignora */ }
  }
  async function reset() {
    const { error } = await supabase.from("participants").delete().eq("session_id", id);
    if (error) { setError("Não foi possível zerar os resultados."); return; }
    clearLocal(); refresh(); setRevealed(false);
  }
  async function duplicate() {
    if (!session) return;
    const { data, error } = await supabase.from("sessions").insert({ name: `${session.name} (cópia)` }).select("id").single();
    if (error || !data) { setError("Não foi possível duplicar."); return; }
    router.push(`/professor/sessao/${data.id}`);
  }
  async function remove() {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) { setError("Não foi possível excluir."); return; }
    router.replace("/professor");
  }
  function openClassMode(qr = false) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setClassMode({ qr });
  }

  if (missing) return <main className="p-8">Turma não encontrada. <Link className="underline" href="/professor">Voltar</Link></main>;
  if (!session) return <main className="p-8 text-floresta/60">Carregando…</main>;

  const hi = stats ? DIM_IDS[stats.highest] : null;
  const lo = stats ? DIM_IDS[stats.lowest] : null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Link href="/professor" className="inline-flex items-center gap-1 text-sm text-petroleo"><ArrowLeft className="h-4 w-4" aria-hidden /> Turmas</Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="mt-1 text-sm text-floresta/70">
            Código <strong className="tracking-widest">{session.code}</strong> ·{" "}
            <span className={live ? "text-folha" : "text-amber-700"}>{live ? "● ao vivo" : "● reconectando…"}</span>
          </p>
        </div>
        <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-floresta/15" role="status">
          {open ? "🟢 Questionário aberto" : "🔴 Questionário encerrado"}
        </p>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="card space-y-3" aria-label="Controles da sessão">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary px-6 py-3 text-base" onClick={() => openClassMode(false)}><Monitor className="h-5 w-5" aria-hidden /> MODO AULA</button>
          <button className="btn-secondary" onClick={() => openClassMode(true)}><Expand className="h-4 w-4" aria-hidden /> AMPLIAR QR CODE</button>
          {open
            ? <button className="btn-secondary" onClick={() => setConfirm("end")}><Square className="h-4 w-4" aria-hidden /> ENCERRAR ATIVIDADE</button>
            : <button className="btn-secondary" onClick={() => setStatus("open")}><LockOpen className="h-4 w-4" aria-hidden /> Reabrir respostas</button>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-floresta/10 pt-3">
          <button className="btn-secondary" disabled={!responses.length} onClick={() => exportCSV(responses, session.name)}><Download className="h-4 w-4" aria-hidden /> EXPORTAR CSV</button>
          <button className="btn-secondary" disabled={!responses.length} onClick={() => exportXLSX(responses, session.name)}><FileSpreadsheet className="h-4 w-4" aria-hidden /> EXPORTAR XLSX</button>
          <ResultImageButton data={imageData} />
          <button className="btn-secondary" onClick={duplicate}><CopyPlus className="h-4 w-4" aria-hidden /> Duplicar</button>
          <button className="btn-danger" onClick={() => setConfirm("reset")}><RotateCcw className="h-4 w-4" aria-hidden /> Zerar resultados</button>
          <button className="btn-danger" onClick={() => setConfirm("delete")}><Trash2 className="h-4 w-4" aria-hidden /> Excluir</button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <section className="card flex flex-col items-center gap-2 text-center">
          <p className="font-bold">ESCANEIE PARA PARTICIPAR</p>
          {origin && <QRCodeSVG value={link} size={176} fgColor="#0f3d2e" level="M" />}
          <p className="text-sm">Código da turma: <strong className="tracking-widest">{session.code}</strong></p>
          <button className="btn-secondary w-full" onClick={copyLink}><Copy className="h-4 w-4" aria-hidden /> {copied ? "Link copiado!" : "COPIAR LINK"}</button>
        </section>
        <div className="space-y-4">
          <section className="grid grid-cols-3 gap-3" aria-label="Participação">
            <Big label="Participantes" value={counts.total} />
            <Big label="Concluíram" value={counts.completed} accent />
            <Big label="Respondendo" value={counts.answering} />
          </section>
          <section className="card"><TimerControl timer={timer} /></section>
        </div>
      </div>

      {!stats ? (
        <p className="card text-center text-floresta/70">Aguardando as primeiras respostas. Abra o Modo aula para projetar o QR Code.</p>
      ) : (
        <>
          {!open && (
            <section className="rounded-xl bg-floresta p-6 text-white">
              <h2 className="text-xl font-bold">PEGADA ECOLÓGICA DA TURMA</h2>
              <p className="mt-2 text-3xl font-extrabold">Pontuação média: {fmt(stats.mean)}/{TOTAL_MAX}</p>
              <p className="mt-2">Categoria com maior pressão ambiental: <strong>{DIM_LABELS[hi!]}</strong></p>
              <p>Categoria com menor pressão ambiental: <strong>{DIM_LABELS[lo!]}</strong></p>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Indicadores gerais">
            <Big label="Participantes" value={stats.n} />
            <Big label="Média da turma" value={stats.mean} decimals={1} />
            <Big label="Menor pontuação" value={stats.min} />
            <Big label="Maior pontuação" value={stats.max} />
            <Big label="Mediana" value={stats.median} decimals={1} />
          </section>

          <section className="card">
            <h2 className="mb-1 font-bold">Distribuição dos resultados</h2>
            <ul className="mb-2 grid gap-x-6 text-sm sm:grid-cols-2">
              {CLASS_KEYS.map((k) => (
                <li key={k} className="flex justify-between border-b border-floresta/10 py-1">
                  <span>{CLASS_SHORT[k]} <span className="text-floresta/50">({CLASS_RANGES[k]})</span></span><strong>{stats.distribution[k]} alunos</strong>
                </li>
              ))}
            </ul>
            <DistributionChart distribution={stats.distribution} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card"><h2 className="mb-1 font-bold">Média por dimensão (0 a 12)</h2><DimBars values={stats.dimMeans} /></div>
            <div className="card"><h2 className="mb-1 font-bold">Radar da turma</h2><DimRadar values={stats.dimMeans} /></div>
          </section>

          <section className="card">
            <h2 className="mb-2 font-bold">Resultado normalizado (pressão ambiental relativa)</h2>
            <ul className="space-y-2">
              {DIM_IDS.map((d, i) => (
                <li key={d}>
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><DimGlyph dim={d} className="h-4 w-4" />{DIM_LABELS[d]}</span><strong>{stats.dimPercents[i]}%</strong></div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-brota"><div className="h-full bg-petroleo transition-[width] duration-700" style={{ width: `${stats.dimPercents[i]}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-floresta/60">Percentual = (média / 12) × 100. Quanto maior, maior a pressão ambiental relativa da turma naquela dimensão.</p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card border-l-4 border-l-petroleo"><p className="text-xs font-bold text-petroleo">MAIOR PEGADA DA TURMA</p><p className="mt-1">{DIM_LABELS[hi!]} apresentou a maior pontuação média da turma.</p></div>
            <div className="card border-l-4 border-l-folha"><p className="text-xs font-bold text-folha">MENOR PEGADA DA TURMA</p><p className="mt-1">{DIM_LABELS[lo!]} apresentou a menor pontuação média da turma.</p></div>
          </section>

          <section className="card">
            <h2 className="mb-2 font-bold">PARA DISCUTIR COM A TURMA</h2>
            <ol className="list-decimal space-y-1.5 pl-5">{discussionQuestions(stats).map((q) => <li key={q}>{q}</li>)}</ol>
          </section>
        </>
      )}

      <section className="card"><PublicResultsControl enabled={session.public_results} closed={!open} publicLink={publicLink} onToggle={togglePublic} /></section>

      {responses.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-bold">Respostas individuais (somente professor)</h2>
          <p className="mb-2 text-xs text-floresta/60">Não compartilhe esta área na projeção. O Modo aula nunca mostra nomes ou resultados individuais.</p>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-floresta/15"><th className="py-1 pr-2">Participante</th><th className="pr-2">Total</th><th>Classificação</th></tr></thead>
              <tbody>
                {[...responses].reverse().map((r) => (
                  <tr key={r.id} className="border-b border-floresta/10">
                    <td className="py-1 pr-2">{nickById.get(r.participant_id) || `Anônimo ${r.participant_id.slice(0, 4)}`}</td>
                    <td className="pr-2 font-semibold">{r.total}/{TOTAL_MAX}</td><td>{CLASS_LABELS[r.classification]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <MethodNote />

      {classMode && (
        <ClassMode
          session={session} link={link} publicLink={publicLink} counts={counts} stats={stats} timer={timer}
          revealed={revealed || !open} setRevealed={setRevealed} imageData={imageData} initialQrFull={classMode.qr}
          onExit={() => setClassMode(null)} onEndActivity={endActivity} onReopen={() => setStatus("open")} onTogglePublic={togglePublic}
        />
      )}
      <TimerExpiredDialog timer={timer} onEnd={endActivity} />

      {confirm === "end" && <ConfirmDialog title="Tem certeza de que deseja encerrar esta atividade?" text="Novas respostas serão bloqueadas. Você poderá reabrir depois."
        confirmLabel="Encerrar atividade" danger onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); endActivity(); }} />}
      {confirm === "reset" && <ConfirmDialog title="Zerar todos os resultados desta turma?" text="Participantes e respostas serão apagados. Esta ação não pode ser desfeita."
        confirmLabel="Zerar resultados" danger onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); reset(); }} />}
      {confirm === "delete" && <ConfirmDialog title="Excluir esta turma?" text="A turma e todos os resultados serão apagados. Esta ação não pode ser desfeita."
        confirmLabel="Excluir turma" danger onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); remove(); }} />}
    </main>
  );
}

function Big({ label, value, accent = false, decimals = 0 }: { label: string; value: number; accent?: boolean; decimals?: number }) {
  return (
    <div className={`card text-center ${accent ? "bg-brota" : ""}`}>
      <p className="text-3xl font-extrabold"><AnimatedNumber value={value} decimals={decimals} /></p>
      <p className="text-xs font-medium text-floresta/70">{label}</p>
    </div>
  );
}

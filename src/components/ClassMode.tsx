"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, ArrowRight, Clock, Copy, Expand, EyeOff, HelpCircle, LogOut, Maximize, PartyPopper, Square, X,
} from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { ConfirmDialog } from "./ConfirmDialog";
import { TimerControl } from "./TimerControl";
import { DimBars, DimRadar, DistributionChart } from "./Charts";
import { DimGlyph } from "./DimIcon";
import { MethodNote } from "./MethodNote";
import { PublicResultsControl } from "./PublicResultsControl";
import { ResultImageButton } from "./ResultImageButton";
import { celebrate } from "@/lib/confetti";
import { CLASS_LABELS, CLASS_SHORT, DIM_IDS, DIM_LABELS } from "@/lib/scoring";
import type { ClassStats } from "@/lib/stats";
import { discussionQuestions, meanClass, predominantClasses, resultSentences } from "@/lib/insights";
import { formatClock } from "@/lib/timer";
import { fmt } from "@/lib/theme";
import type { ResultImageData } from "@/lib/resultImage";
import type { SessionRow } from "@/lib/live";
import type { ClassTimer } from "@/hooks/useClassTimer";

export type ScreenId = "qr" | "progress" | "general" | "dims" | "dist" | "radar" | "discussion" | "final";
const BASE: ScreenId[] = ["qr", "progress", "general", "dims", "dist", "radar", "discussion"];
const NAMES: Record<ScreenId, string> = {
  qr: "QR Code", progress: "Progresso", general: "Resultado geral", dims: "Dimensões",
  dist: "Distribuição", radar: "Radar", discussion: "Discussão", final: "Resultado final",
};
const KEY_TO_SCREEN: Record<string, ScreenId> = { q: "qr", p: "progress", "1": "general", "2": "dims", "3": "dist", "4": "radar", "5": "discussion" };

type Counts = { total: number; completed: number; answering: number };
type Props = {
  session: SessionRow; link: string; publicLink: string; counts: Counts; stats: ClassStats | null;
  timer: ClassTimer; revealed: boolean; setRevealed: (v: boolean) => void; imageData: ResultImageData | null;
  initialQrFull?: boolean; onExit: () => void;
  onEndActivity: () => Promise<void>; onReopen: () => Promise<void>; onTogglePublic: (v: boolean) => Promise<void>;
};

const cbtn = "inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-40";

function useViewportHeight() {
  const [h, setH] = useState(typeof window === "undefined" ? 800 : window.innerHeight);
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return h;
}

export function ClassMode(p: Props) {
  const { session, counts, stats, timer, revealed, setRevealed } = p;
  const closed = session.status === "closed";
  const screens: ScreenId[] = closed ? [...BASE, "final"] : BASE;
  const vh = useViewportHeight();

  const [screen, setScreen] = useState<ScreenId>(closed ? "final" : "qr");
  const [qrFull, setQrFull] = useState(!!p.initialQrFull);
  const [help, setHelp] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [timerPanel, setTimerPanel] = useState(false);
  const [unit, setUnit] = useState<"score" | "percent">("score");
  const [copied, setCopied] = useState(false);

  // Ao encerrar a atividade, vai direto para o resultado final.
  const wasClosed = useRef(closed);
  useEffect(() => {
    if (closed && !wasClosed.current) setScreen("final");
    wasClosed.current = closed;
  }, [closed]);

  const go = useCallback((delta: number) => {
    setScreen((cur) => {
      const list = closed ? [...BASE, "final" as ScreenId] : BASE;
      const i = Math.min(Math.max(list.indexOf(cur) + delta, 0), list.length - 1);
      return list[i];
    });
  }, [closed]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    p.onExit();
  }, [p]);

  const startReveal = useCallback(() => { if (!revealed && countdown === null) setCountdown(3); }, [revealed, countdown]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { setRevealed(true); setCountdown(null); setScreen("general"); return; }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 900);
    return () => clearTimeout(t);
  }, [countdown, setRevealed]);

  const copyLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(p.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignora */ }
  }, [p.link]);

  // ---- atalhos de teclado ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|SELECT|TEXTAREA/.test(t?.tagName)) return;
      if (confirmEnd || timer.expired || countdown !== null) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "Escape") {
        if (help) setHelp(false); else if (qrFull) setQrFull(false); else if (timerPanel) setTimerPanel(false); else exit();
      } else if (k === "ArrowRight" || k === "PageDown" || k === " ") { e.preventDefault(); go(1); }
      else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); go(-1); }
      else if (k === "f") toggleFullscreen();
      else if (k === "r") startReveal();
      else if (k === "?") setHelp((h) => !h);
      else if (k in KEY_TO_SCREEN) { const s = KEY_TO_SCREEN[k]; if (screens.includes(s)) { setScreen(s); setQrFull(false); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmEnd, timer.expired, countdown, help, qrFull, timerPanel, exit, go, toggleFullscreen, startReveal, screens]);

  const chartH = Math.max(300, Math.round(vh * 0.55));
  const idx = screens.indexOf(screen);
  const phase = timer.phase;

  const clock = timer.remaining !== null && timer.running ? (
    <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${
      phase === "warn30" || phase === "final10" ? "animate-soft-pulse bg-amber-400 text-floresta"
      : phase === "warn60" ? "bg-amber-400/25 text-amber-200" : "bg-white/10"}`}>
      Tempo restante: {formatClock(timer.remaining)}
      {phase === "warn60" && " · falta 1 minuto"}
      {phase === "warn30" && " · últimos 30 segundos"}
    </span>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-floresta text-white" role="dialog" aria-label="Modo aula">
      {/* Barra superior */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-6 py-3">
        <p className="truncate text-sm font-semibold text-white/80">{session.name}</p>
        <nav className="flex items-center gap-1.5" aria-label="Telas">
          {screens.map((s) => (
            <button key={s} onClick={() => setScreen(s)} title={NAMES[s]} aria-label={NAMES[s]} aria-current={s === screen}
              className={`h-3 rounded-full transition-all ${s === screen ? "w-8 bg-white" : "w-3 bg-white/35 hover:bg-white/60"}`} />
          ))}
        </nav>
        <div className="relative flex items-center gap-2">
          {clock}
          <button className={cbtn} onClick={() => setTimerPanel((v) => !v)} aria-expanded={timerPanel}><Clock className="h-4 w-4" aria-hidden /> Cronômetro</button>
          <button className={cbtn} onClick={exit}><LogOut className="h-4 w-4" aria-hidden /> Sair</button>
          {timerPanel && (
            <div className="absolute right-0 top-12 z-10 w-[min(92vw,26rem)] rounded-xl bg-white p-4 shadow-xl">
              <TimerControl timer={timer} />
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo da tela atual */}
      <main key={screen} className="flex-1 animate-screen-in overflow-auto px-6 py-6 md:px-12">
        {screen === "qr" && (
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">PEGADA ECOLÓGICA DA TURMA</h1>
            {closed
              ? <p className="text-2xl text-amber-200">Atividade encerrada — novas respostas bloqueadas</p>
              : <p className="text-2xl text-white/85 md:text-3xl">Escaneie o QR Code para participar</p>}
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={p.link} size={512} level="M" fgColor="#0f3d2e" style={{ width: "min(34vh, 60vw)", height: "min(34vh, 60vw)" }} />
            </div>
            <p className="text-2xl md:text-3xl">Código da turma: <strong className="tracking-[0.25em]">{session.code}</strong></p>
            <p className="break-all text-lg text-white/75">Link curto: {p.link.replace(/^https?:\/\//, "")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button className={cbtn} onClick={copyLink}><Copy className="h-4 w-4" aria-hidden /> {copied ? "Link copiado!" : "COPIAR LINK"}</button>
              <button className={cbtn} onClick={() => setQrFull(true)}><Expand className="h-4 w-4" aria-hidden /> AMPLIAR QR CODE</button>
            </div>
            <p className="text-3xl font-bold md:text-4xl" aria-live="polite">
              Alunos conectados: <AnimatedNumber value={counts.total} className="text-brota" />
            </p>
          </div>
        )}

        {screen === "progress" && (
          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center gap-10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Big label="Participantes" value={counts.total} />
              <Big label="Concluíram" value={counts.completed} />
              <Big label="Respondendo" value={counts.answering} />
            </div>
            <ProgressBar counts={counts} />
            <p className="text-center text-3xl font-bold">
              {timer.running && timer.remaining !== null ? `Tempo restante: ${formatClock(timer.remaining)}`
                : <span className="text-xl font-medium text-white/60">Cronômetro desligado — use o botão "Cronômetro" acima</span>}
            </p>
          </div>
        )}

        {["general", "dims", "dist", "radar", "discussion"].includes(screen) && !revealed && (
          <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-8 text-center">
            <EyeOff className="h-14 w-14 text-white/70" aria-hidden />
            <h2 className="text-4xl font-extrabold md:text-5xl">Resultados ocultos</h2>
            <div className="grid w-full grid-cols-3 gap-4">
              <Big label="Participantes" value={counts.total} />
              <Big label="Concluíram" value={counts.completed} />
              <Big label="Respondendo" value={counts.answering} />
            </div>
            {timer.running && timer.remaining !== null && <p className="text-3xl font-bold">Tempo restante: {formatClock(timer.remaining)}</p>}
            <div className="flex flex-wrap justify-center gap-3">
              <button className="rounded-xl bg-white px-8 py-4 text-xl font-extrabold text-floresta hover:bg-brota" onClick={startReveal}>REVELAR RESULTADOS</button>
              <button className={`${cbtn} py-4 text-base`} onClick={() => setRevealed(true)}>MOSTRAR RESULTADOS</button>
            </div>
          </div>
        )}

        {revealed && screen === "general" && (!stats ? <Waiting /> : <General stats={stats} />)}
        {revealed && screen === "dims" && (!stats ? <Waiting /> : (
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-3xl font-extrabold md:text-4xl">Pressão ambiental por dimensão</h2>
              <div className="flex rounded-lg bg-white/10 p-1 text-sm font-semibold" role="group" aria-label="Escala">
                {(["score", "percent"] as const).map((u) => (
                  <button key={u} onClick={() => setUnit(u)} aria-pressed={unit === u}
                    className={`rounded-md px-4 py-1.5 ${unit === u ? "bg-white text-floresta" : "text-white"}`}>{u === "score" ? "0 a 12" : "0% a 100%"}</button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 text-floresta"><DimBars values={stats.dimMeans} height={chartH} big unit={unit} /></div>
          </div>
        ))}
        {revealed && screen === "dist" && (!stats ? <Waiting /> : (
          <div className="mx-auto max-w-6xl space-y-4">
            <h2 className="text-3xl font-extrabold md:text-4xl">Distribuição da pegada na turma</h2>
            <div className="rounded-2xl bg-white p-4 text-floresta"><DistributionChart distribution={stats.distribution} height={chartH} big /></div>
            <p className="text-xl text-white/85">{resultSentences(stats).find((s) => s.includes("faixa")) ?? ""}</p>
          </div>
        ))}
        {revealed && screen === "radar" && (!stats ? <Waiting /> : (
          <div className="mx-auto max-w-4xl space-y-4">
            <h2 className="text-3xl font-extrabold md:text-4xl">Radar da turma</h2>
            <div className="rounded-2xl bg-white p-4 text-floresta"><DimRadar values={stats.dimMeans} height={chartH} big /></div>
          </div>
        ))}
        {revealed && screen === "discussion" && (!stats ? <Waiting /> : (
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-3xl font-extrabold">O QUE OS RESULTADOS NOS MOSTRAM?</h2>
              <ul className="mt-5 space-y-4 text-2xl leading-snug">
                {resultSentences(stats).map((s) => <li key={s} className="border-l-4 border-folha pl-4">{s}</li>)}
              </ul>
            </section>
            <section>
              <h2 className="text-3xl font-extrabold">PARA DISCUTIR COM A TURMA</h2>
              <ol className="mt-5 list-decimal space-y-4 pl-7 text-2xl leading-snug">
                {discussionQuestions(stats).map((q) => <li key={q}>{q}</li>)}
              </ol>
            </section>
          </div>
        ))}

        {screen === "final" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <h2 className="text-3xl font-extrabold md:text-5xl">RESULTADO FINAL DA TURMA</h2>
            {!stats ? <p className="text-2xl text-white/70">Nenhuma resposta foi registrada.</p> : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Fact label="Participantes" value={String(counts.total)} />
                <Fact label="Média" value={`${fmt(stats.mean)}/60`} />
                <Fact label="Classificação predominante"
                  value={predominantClasses(stats.distribution).map((k) => CLASS_SHORT[k]).join(" / ")} />
                <Fact label="Maior impacto" value={DIM_LABELS[DIM_IDS[stats.highest]]} />
                <Fact label="Menor impacto" value={DIM_LABELS[DIM_IDS[stats.lowest]]} />
                <Fact label="Classificação média" value={CLASS_SHORT[meanClass(stats.mean)]} />
              </div>
            )}
            <div className="flex flex-wrap items-start gap-4">
              <ResultImageButton data={p.imageData} className="rounded-xl bg-white px-6 py-3 font-bold text-floresta hover:bg-brota inline-flex items-center gap-2" />
              <button className={cbtn} onClick={p.onReopen}>Reabrir respostas</button>
              <button className={cbtn} onClick={() => celebrate()}><PartyPopper className="h-4 w-4" aria-hidden /> Celebrar participação</button>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <PublicResultsControl enabled={session.public_results} closed={closed} publicLink={p.publicLink} onToggle={p.onTogglePublic} />
            </div>
            <MethodNote light />
          </div>
        )}
      </main>

      {/* Barra inferior */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 px-6 py-3">
        <div className="flex items-center gap-2">
          <button className={cbtn} onClick={() => go(-1)} disabled={idx <= 0} aria-label="Tela anterior"><ArrowLeft className="h-4 w-4" aria-hidden /></button>
          <span className="min-w-[8rem] text-center text-sm text-white/80">{NAMES[screen]} ({idx + 1}/{screens.length})</span>
          <button className={cbtn} onClick={() => go(1)} disabled={idx >= screens.length - 1} aria-label="Próxima tela"><ArrowRight className="h-4 w-4" aria-hidden /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={cbtn} onClick={() => celebrate()}><PartyPopper className="h-4 w-4" aria-hidden /> Celebrar participação</button>
          {revealed && !closed
            ? <button className={cbtn} onClick={() => setRevealed(false)}><EyeOff className="h-4 w-4" aria-hidden /> Ocultar resultados</button>
            : !revealed && <button className={cbtn} onClick={startReveal}>REVELAR RESULTADOS (R)</button>}
          <button className={cbtn} onClick={toggleFullscreen}><Maximize className="h-4 w-4" aria-hidden /> Tela cheia (F)</button>
          <button className={cbtn} onClick={() => setHelp(true)}><HelpCircle className="h-4 w-4" aria-hidden /> Atalhos (?)</button>
          {!closed && <button className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-floresta hover:bg-amber-300" onClick={() => setConfirmEnd(true)}><Square className="h-4 w-4" aria-hidden /> ENCERRAR ATIVIDADE</button>}
        </div>
      </footer>

      {/* Contagem final dos últimos 10 s */}
      {phase === "final10" && timer.remaining !== null && timer.running && (
        <div key={timer.remaining} className="pointer-events-none fixed bottom-24 right-8 z-[60] flex h-32 w-32 animate-count-in items-center justify-center rounded-full bg-amber-400 text-6xl font-extrabold text-floresta shadow-2xl" aria-live="assertive">
          {timer.remaining}
        </div>
      )}

      {/* 3 · 2 · 1 */}
      {countdown !== null && countdown > 0 && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-floresta/95" aria-live="assertive">
          <span key={countdown} className="animate-count-in text-[16rem] font-extrabold leading-none">{countdown}</span>
        </div>
      )}

      {/* QR ampliado */}
      {qrFull && (
        <div className="fixed inset-0 z-[62] flex flex-col items-center justify-center gap-5 bg-white p-6 text-center text-floresta" role="dialog" aria-label="QR Code ampliado">
          <h2 className="text-3xl font-extrabold md:text-5xl">{session.name}</h2>
          <QRCodeSVG value={p.link} size={800} level="M" fgColor="#0f3d2e" style={{ width: "min(62vh, 85vw)", height: "min(62vh, 85vw)" }} />
          <p className="text-3xl">Código da turma: <strong className="tracking-[0.25em]">{session.code}</strong></p>
          <p className="text-2xl font-semibold text-petroleo">Aponte a câmera do celular para o QR Code</p>
          <button className="btn-secondary absolute right-4 top-4 text-base" onClick={() => setQrFull(false)}><X className="h-4 w-4" aria-hidden /> Voltar ao painel</button>
        </div>
      )}

      {/* Ajuda de atalhos */}
      {help && (
        <div className="fixed inset-0 z-[66] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-label="Atalhos de teclado" onClick={() => setHelp(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 text-floresta" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-xl font-bold">Atalhos de teclado</h2>
            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-sm">
              {[
                ["→  PgDn  Espaço", "Próxima tela"], ["←  PgUp", "Tela anterior"], ["F", "Tela cheia"], ["Q", "QR Code"],
                ["P", "Progresso"], ["R", "Revelar resultados (3-2-1)"], ["1", "Resultado geral"], ["2", "Dimensões"],
                ["3", "Distribuição"], ["4", "Radar"], ["5", "Discussão"], ["?", "Mostrar/ocultar esta ajuda"], ["Esc", "Sair do modo aula"],
              ].map(([k, d]) => (<div key={k} className="contents"><dt className="font-mono font-bold">{k}</dt><dd>{d}</dd></div>))}
            </dl>
            <button className="btn-primary mt-4 w-full" onClick={() => setHelp(false)}>Fechar</button>
          </div>
        </div>
      )}

      {confirmEnd && (
        <ConfirmDialog title="Tem certeza de que deseja encerrar esta atividade?"
          text="Novas respostas serão bloqueadas. Você poderá reabrir depois, se precisar."
          confirmLabel="Encerrar atividade" danger
          onCancel={() => setConfirmEnd(false)}
          onConfirm={async () => { setConfirmEnd(false); await p.onEndActivity(); }} />
      )}
    </div>
  );
}

function Big({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-6">
      <p className="text-6xl font-extrabold md:text-8xl"><AnimatedNumber value={value} /></p>
      <p className="mt-2 text-lg text-white/75 md:text-2xl">{label}</p>
    </div>
  );
}

function ProgressBar({ counts }: { counts: Counts }) {
  const pct = counts.total ? Math.round((counts.completed / counts.total) * 100) : 0;
  return (
    <div>
      <div className="h-10 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso da turma">
        <div className="h-full rounded-full bg-folha transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-center text-5xl font-extrabold"><AnimatedNumber value={pct} />%</p>
    </div>
  );
}

function Waiting() {
  return <p className="mt-24 text-center text-3xl text-white/70">Aguardando as primeiras respostas…</p>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-5">
      <p className="text-sm font-semibold text-white/70">{label}</p>
      <p className="mt-1 text-3xl font-extrabold leading-tight">{value}</p>
    </div>
  );
}

function General({ stats }: { stats: ClassStats }) {
  const hi = DIM_IDS[stats.highest], lo = DIM_IDS[stats.lowest];
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col justify-center gap-8">
      <section className="text-center">
        <p className="text-xl font-bold tracking-wide text-white/80 md:text-2xl">MÉDIA DA PEGADA DA TURMA</p>
        <p className="mt-1 text-8xl font-extrabold md:text-[10rem] md:leading-none">
          <AnimatedNumber value={stats.mean} decimals={1} duration={800} /> <span className="text-4xl text-white/60 md:text-6xl">/ 60</span>
        </p>
        <p className="mt-2 text-2xl md:text-3xl">Classificação média: <strong>{CLASS_SHORT[meanClass(stats.mean)]}</strong>
          <span className="text-white/60"> · {stats.n} participante{stats.n === 1 ? "" : "s"}</span></p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <ImpactCard title="MAIOR PRESSÃO AMBIENTAL" dim={hi} pct={stats.dimPercents[stats.highest]} text="Esta foi a dimensão com maior pressão ambiental relativa da turma." />
        <ImpactCard title="MENOR PRESSÃO AMBIENTAL" dim={lo} pct={stats.dimPercents[stats.lowest]} text="Esta foi a dimensão com menor pressão ambiental relativa." />
      </section>
    </div>
  );
}

function ImpactCard({ title, dim, pct, text }: { title: string; dim: (typeof DIM_IDS)[number]; pct: number; text: string }): ReactNode {
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-white p-6 text-floresta">
      <div className="rounded-full bg-musgo p-4"><DimGlyph dim={dim} className="h-12 w-12" /></div>
      <div>
        <p className="text-sm font-bold text-petroleo">{title}</p>
        <p className="text-3xl font-extrabold md:text-4xl">{DIM_LABELS[dim]} · <AnimatedNumber value={pct} />%</p>
        <p className="mt-1 text-base text-floresta/75">{text}</p>
      </div>
    </div>
  );
}

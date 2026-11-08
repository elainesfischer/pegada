"use client";
import { useState } from "react";
import { Play, Square, Volume2, VolumeX } from "lucide-react";
import { TIMER_PRESETS, formatClock } from "@/lib/timer";
import type { ClassTimer } from "@/hooks/useClassTimer";
import { ConfirmDialog } from "./ConfirmDialog";

/** Seleção e controle do cronômetro (opcional). */
export function TimerControl({ timer }: { timer: ClassTimer }) {
  const [choice, setChoice] = useState("null");
  const [custom, setCustom] = useState(7);
  const seconds = choice === "custom" ? Math.round(Math.min(Math.max(custom || 1, 1), 180) * 60)
    : choice === "null" ? null : Number(choice);

  return (
    <div className="space-y-3 text-floresta">
      <p className="font-bold">Cronômetro (opcional)</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="timer-choice">Duração</label>
        <select id="timer-choice" className="input w-auto py-2" value={choice} onChange={(e) => setChoice(e.target.value)} disabled={timer.running}>
          {TIMER_PRESETS.map((p) => <option key={p.label} value={String(p.seconds)}>{p.label}</option>)}
          <option value="custom">Personalizado</option>
        </select>
        {choice === "custom" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="number" min={1} max={180} className="input w-20 py-2" value={custom} disabled={timer.running}
              onChange={(e) => setCustom(Number(e.target.value))} aria-label="Minutos" /> minutos
          </label>
        )}
        {timer.running
          ? <button className="btn-secondary" onClick={timer.stop}><Square className="h-4 w-4" aria-hidden /> Parar</button>
          : <button className="btn-primary" disabled={seconds === null} onClick={() => timer.start(seconds)}><Play className="h-4 w-4" aria-hidden /> Iniciar cronômetro</button>}
      </div>
      {timer.remaining !== null && timer.running && <p className="text-lg font-semibold">Tempo restante: {formatClock(timer.remaining)}</p>}
      <button className="btn-secondary" onClick={timer.toggleSound} aria-pressed={timer.sound}>
        {timer.sound ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        Sons de aviso: {timer.sound ? "ligados" : "desligados"}
      </button>
    </div>
  );
}

/** Quando o tempo acaba, o professor escolhe o que fazer. */
export function TimerExpiredDialog({ timer, onEnd }: { timer: ClassTimer; onEnd: () => void }) {
  if (!timer.expired) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal aria-label="Tempo esgotado">
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-floresta shadow-xl">
        <h2 className="text-xl font-bold">Tempo esgotado</h2>
        <p className="mt-2 text-floresta/80">O que deseja fazer com o questionário?</p>
        <div className="mt-5 flex flex-col gap-3">
          <button className="btn-primary py-3" onClick={() => { timer.stop(); onEnd(); }}>Encerrar automaticamente</button>
          <button className="btn-secondary py-3" onClick={timer.dismissExpired}>Permitir continuar respondendo</button>
        </div>
      </div>
    </div>
  );
}
export { ConfirmDialog };

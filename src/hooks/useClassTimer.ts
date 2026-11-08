"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { phaseOf, remainingSeconds, type TimerPhase } from "@/lib/timer";

type Saved = { endsAt: number | null; limit: number | null; sound: boolean };

/** Cronômetro opcional da aula. Sobrevive a recarregar a página (guarda o horário final). */
export function useClassTimer(sessionId: string, sessionOpen: boolean) {
  const key = `pegada:timer:${sessionId}`;
  const [limit, setLimit] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expired, setExpired] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const lastBeep = useRef<number | null>(null);

  useEffect(() => {
    try {
      const s: Saved = JSON.parse(localStorage.getItem(key) || "null");
      if (s) { setLimit(s.limit); setEndsAt(s.endsAt); setSound(false); }
    } catch { /* ignora */ }
  }, [key]);

  const persist = useCallback((patch: Partial<Saved>) => {
    try {
      const cur = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...cur, ...patch }));
    } catch { /* ignora */ }
  }, [key]);

  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);

  const remaining = endsAt ? remainingSeconds(endsAt, now) : null;
  const phase: TimerPhase = phaseOf(remaining);

  const beep = useCallback((freq: number, ms: number) => {
    const ctx = audio.current;
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = 0.06;
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + ms / 1000);
  }, []);

  // Fim do tempo: o professor decide (nada acontece automaticamente sem escolha).
  useEffect(() => {
    if (endsAt && remaining === 0 && !expired) {
      setExpired(true);
      if (sound) beep(520, 700);
    }
  }, [endsAt, remaining, expired, sound, beep]);

  // Sons opcionais: um bip por segundo nos últimos 10 s.
  useEffect(() => {
    if (!sound || remaining === null || remaining <= 0 || remaining > 10) return;
    if (lastBeep.current !== remaining) { lastBeep.current = remaining; beep(880, 120); }
  }, [remaining, sound, beep]);

  const start = useCallback((seconds: number | null) => {
    setLimit(seconds); setExpired(false);
    if (seconds === null) { setEndsAt(null); persist({ endsAt: null, limit: null }); return; }
    const end = Date.now() + seconds * 1000;
    setNow(Date.now()); setEndsAt(end); persist({ endsAt: end, limit: seconds });
  }, [persist]);

  const stop = useCallback(() => { setEndsAt(null); setExpired(false); persist({ endsAt: null }); }, [persist]);

  const toggleSound = useCallback(() => {
    setSound((s) => {
      if (!s && !audio.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audio.current = new AC();
      }
      return !s;
    });
  }, []);

  return {
    limit, remaining, phase, sound, toggleSound, start, stop,
    running: endsAt !== null && !expired,
    expired: expired && sessionOpen,
    /** "Permitir continuar respondendo": dispensa o aviso e desliga o cronômetro. */
    dismissExpired: stop,
  };
}
export type ClassTimer = ReturnType<typeof useClassTimer>;

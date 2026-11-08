"use client";
import { useEffect, useRef, useState } from "react";

/** Número com animação curta de contagem (ex.: 21 → 22 → 23, 28,4 → 28,7). */
export function AnimatedNumber({ value, decimals = 0, duration = 600, className = "" }: {
  value: number; decimals?: number; duration?: number; className?: string;
}) {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(0);
  const current = useRef(value);
  const raf = useRef<number>();

  useEffect(() => {
    const from = current.current, to = value;
    if (from === to) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { current.current = to; setShown(to); return; }
    if (to > from) setBump((b) => b + 1);
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
      current.current = v; setShown(v);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else { current.current = to; setShown(to); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  const text = shown.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span key={bump} className={`inline-block tabular-nums ${bump ? "animate-pop" : ""} ${className}`}>{text}</span>;
}

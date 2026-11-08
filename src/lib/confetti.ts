/** Confetes breves em canvas (sem bibliotecas). Só roda quando o professor pede. */
export function celebrate(durationMs = 2600) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }

  const colors = ["#2f9e62", "#0e5a66", "#d9a21b", "#7bc99a", "#ffffff", "#38a8c8"];
  const pieces = Array.from({ length: 150 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
    y: canvas.height * 0.75,
    vx: (Math.random() - 0.5) * 16, vy: -(8 + Math.random() * 14),
    size: 6 + Math.random() * 7, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - durationMs * 0.6) / (durationMs * 0.4));
    for (const p of pieces) {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t < durationMs) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

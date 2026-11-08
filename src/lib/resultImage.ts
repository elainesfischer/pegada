import { DIM_IDS, DIM_LABELS } from "./scoring.ts";
import { DIM_META, fmt } from "./theme.ts";

export type ResultImageData = {
  sessionName: string;
  dateLabel: string;
  n: number;
  mean: number;
  classLabel: string;
  dimMeans: number[];   // 0–12
  highest: number;      // índice da dimensão
  lowest: number;
};

export const IMAGE_SIZE = 1080;
const FONT = '"Segoe UI", system-ui, -apple-system, Arial, sans-serif';

function rrect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/** Escreve texto reduzindo a fonte até caber em maxW. */
function fitText(ctx: any, text: string, x: number, y: number, maxW: number, size: number, weight = "600") {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && s > 18) { s -= 2; ctx.font = `${weight} ${s}px ${FONT}`; }
  ctx.fillText(text, x, y);
}

/** Desenha a imagem 1080×1080. Não contém nomes ou dados individuais. */
export function drawResultImage(ctx: any, d: ResultImageData, W = IMAGE_SIZE, H = IMAGE_SIZE) {
  // fundo
  ctx.fillStyle = "#f4f8f5"; ctx.fillRect(0, 0, W, H);
  // cabeçalho
  ctx.fillStyle = "#0f3d2e"; ctx.fillRect(0, 0, W, 250);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = "#9fe0bb"; ctx.font = `600 28px ${FONT}`;
  ctx.fillText("Índice educativo de Pegada Ecológica", 64, 82);
  ctx.fillStyle = "#ffffff"; fitText(ctx, "Pegada Ecológica da Turma", 64, 150, W - 128, 66, "800");
  ctx.fillStyle = "#d6efe0"; fitText(ctx, d.sessionName, 64, 200, W - 128, 36, "500");
  ctx.fillStyle = "#9fe0bb"; ctx.font = `500 26px ${FONT}`;
  ctx.fillText(`${d.dateLabel}  ·  ${d.n} participante${d.n === 1 ? "" : "s"}`, 64, 236);

  // média
  ctx.fillStyle = "#0f3d2e"; ctx.font = `800 120px ${FONT}`;
  const meanText = fmt(d.mean);
  ctx.fillText(meanText, 64, 400);
  const mw = ctx.measureText(meanText).width;
  ctx.fillStyle = "#5a7a6a"; ctx.font = `600 48px ${FONT}`; ctx.fillText("/ 60", 64 + mw + 14, 400);
  ctx.fillStyle = "#0e5a66"; ctx.font = `700 34px ${FONT}`;
  ctx.fillText(`Média da turma · ${d.classLabel}`, 64, 452);

  // barras das dimensões
  const x0 = 330, barMax = W - x0 - 130, top = 500, rowH = 60;
  DIM_IDS.forEach((id, i) => {
    const y = top + i * rowH;
    ctx.fillStyle = "#0f3d2e"; ctx.font = `600 28px ${FONT}`; ctx.textAlign = "left";
    ctx.fillText(DIM_LABELS[id], 64, y + 34);
    ctx.fillStyle = "#e1ede5"; rrect(ctx, x0, y + 6, barMax, 38, 10); ctx.fill();
    const w = Math.max(10, (d.dimMeans[i] / 12) * barMax);
    ctx.fillStyle = DIM_META[id].color; rrect(ctx, x0, y + 6, w, 38, 10); ctx.fill();
    ctx.fillStyle = "#0f3d2e"; ctx.font = `700 28px ${FONT}`;
    ctx.fillText(`${fmt(d.dimMeans[i])}/12`, x0 + barMax + 16, y + 36);
  });

  // maior e menor impacto
  const cy = 830, cw = (W - 128 - 24) / 2, ch = 150;
  const card = (x: number, label: string, dim: number, accent: string) => {
    ctx.fillStyle = "#ffffff"; rrect(ctx, x, cy, cw, ch, 18); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(x, cy + 18, 8, ch - 36);
    ctx.fillStyle = accent; ctx.font = `700 24px ${FONT}`; ctx.fillText(label, x + 30, cy + 44);
    ctx.fillStyle = "#0f3d2e"; fitText(ctx, DIM_LABELS[DIM_IDS[dim]], x + 30, cy + 92, cw - 50, 38, "800");
    ctx.fillStyle = "#5a7a6a"; ctx.font = `600 26px ${FONT}`;
    ctx.fillText(`${Math.round((d.dimMeans[dim] / 12) * 100)}% da pressão máxima`, x + 30, cy + 130);
  };
  card(64, "Maior pressão ambiental", d.highest, "#0e5a66");
  card(64 + cw + 24, "Menor pressão ambiental", d.lowest, "#2f9e62");

  // rodapé
  ctx.fillStyle = "#6b8a7a"; ctx.font = `400 20px ${FONT}`;
  ctx.fillText("Instrumento educativo; não corresponde ao cálculo da Pegada Ecológica em hectares globais (gha).", 64, 1034);
}

export async function generateResultPng(d: ResultImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE; canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  drawResultImage(ctx, d);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem."))), "image/png")
  );
}

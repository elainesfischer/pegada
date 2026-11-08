import { DIM_LABELS, DIM_IDS, CLASS_LABELS } from "./scoring.ts";
import { type ResponseRow, rowScores } from "./stats.ts";

const HEADERS = [
  "ID anônimo", "Data/hora", "Turma",
  ...Array.from({ length: 20 }, (_, i) => `Q${i + 1} (pontos)`),
  ...DIM_IDS.map((d) => `${DIM_LABELS[d]} (0-12)`),
  "Pontuação total (0-60)", "Classificação",
];

export function buildRows(rows: ResponseRow[], sessionName: string): (string | number)[][] {
  return rows.map((r) => [
    r.participant_id.slice(0, 8),
    new Date(r.created_at).toLocaleString("pt-BR"),
    sessionName,
    ...r.answers,
    ...rowScores(r),
    r.total,
    CLASS_LABELS[r.classification],
  ]);
}

function cell(v: string | number) {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const safeName = (n: string) => n.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 50) || "turma";

/** CSV com ";" e BOM UTF-8: abre corretamente no Excel em português. */
export function exportCSV(rows: ResponseRow[], sessionName: string) {
  const lines = [HEADERS, ...buildRows(rows, sessionName)].map((r) => r.map(cell).join(";"));
  download(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `pegada_${safeName(sessionName)}.csv`);
}

export async function exportXLSX(rows: ResponseRow[], sessionName: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...buildRows(rows, sessionName)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  XLSX.writeFile(wb, `pegada_${safeName(sessionName)}.xlsx`);
}

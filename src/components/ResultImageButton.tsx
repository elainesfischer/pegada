"use client";
import { useEffect, useState } from "react";
import { ImageDown, Loader2, Share2, X } from "lucide-react";
import { generateResultPng, type ResultImageData } from "@/lib/resultImage";

/** Gera a imagem PNG 1080×1080 (somente dados coletivos) e mostra uma prévia para baixar. */
export function ResultImageButton({ data, className = "btn-secondary" }: { data: ResultImageData | null; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function generate() {
    if (!data) return;
    setBusy(true); setError("");
    try {
      const b = await generateResultPng(data);
      setBlob(b); setUrl(URL.createObjectURL(b));
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  function close() { setUrl(null); setBlob(null); }
  async function share() {
    if (!blob) return;
    const file = new File([blob], "pegada-ecologica-turma.png", { type: "image/png" });
    try { await navigator.share({ files: [file], title: "Pegada Ecológica da Turma" }); } catch { /* cancelado */ }
  }
  const canShare = typeof navigator !== "undefined" && !!navigator.canShare && blob &&
    navigator.canShare({ files: [new File([blob], "x.png", { type: "image/png" })] });

  return (
    <>
      <button className={className} onClick={generate} disabled={!data || busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImageDown className="h-4 w-4" aria-hidden />} GERAR IMAGEM DO RESULTADO
      </button>
      {error && <span role="alert" className="text-sm text-red-300">{error}</span>}
      {url && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-black/80 p-4" role="dialog" aria-label="Imagem do resultado">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Resultado da turma (1080 por 1080)" className="max-h-[75vh] max-w-full rounded-lg shadow-2xl" />
          <div className="flex flex-wrap justify-center gap-3">
            <a href={url} download="pegada-ecologica-turma.png" className="btn-primary">Baixar PNG</a>
            {canShare && <button className="btn-secondary" onClick={share}><Share2 className="h-4 w-4" aria-hidden /> Compartilhar</button>}
            <button className="btn-secondary" onClick={close}><X className="h-4 w-4" aria-hidden /> Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}

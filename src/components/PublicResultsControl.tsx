"use client";
import { useState } from "react";
import { Copy, Globe } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

/** Liga/desliga a página pública com resultados agregados (disponível após encerrar). */
export function PublicResultsControl({ enabled, closed, publicLink, onToggle }: {
  enabled: boolean; closed: boolean; publicLink: string; onToggle: (v: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  async function toggle() { setBusy(true); await onToggle(!enabled); setBusy(false); }
  async function copy() {
    try { await navigator.clipboard.writeText(publicLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignora */ }
  }
  return (
    <div className="space-y-3 text-floresta">
      <p className="flex items-center gap-2 font-bold"><Globe className="h-5 w-5 text-petroleo" aria-hidden /> Página pública de resultados</p>
      <p className="text-sm text-floresta/70">Mostra apenas dados coletivos (média, dimensões e distribuição). Nunca exibe nomes, identificadores ou respostas individuais.</p>
      {!closed ? (
        <p className="rounded-lg bg-brota p-3 text-sm">Disponível depois que a atividade for encerrada.</p>
      ) : (
        <>
          <button className={enabled ? "btn-primary" : "btn-secondary"} onClick={toggle} disabled={busy} aria-pressed={enabled}>
            {enabled ? "Página ativada — clique para desativar" : "Ativar página pública"}
          </button>
          {enabled && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-lg border border-floresta/15 bg-white p-2"><QRCodeSVG value={publicLink} size={120} fgColor="#0f3d2e" /></div>
              <div className="min-w-0 space-y-2">
                <p className="break-all text-sm">{publicLink}</p>
                <button className="btn-secondary" onClick={copy}><Copy className="h-4 w-4" aria-hidden /> {copied ? "Copiado!" : "Copiar link"}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

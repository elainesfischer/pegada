"use client";
import { useEffect } from "react";

export function ConfirmDialog({ title, text, confirmLabel, danger = false, onConfirm, onCancel }: {
  title: string; text?: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal aria-label={title}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-floresta shadow-xl">
        <h2 className="text-xl font-bold">{title}</h2>
        {text && <p className="mt-2 text-floresta/80">{text}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel} autoFocus>Cancelar</button>
          <button className={danger ? "btn bg-red-700 text-white hover:bg-red-800" : "btn-primary"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

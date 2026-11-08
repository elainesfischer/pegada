"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Leaf } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div>
        <Leaf className="mb-3 h-9 w-9 text-folha" aria-hidden />
        <h1 className="text-3xl font-bold">Pegada Ecológica em Sala</h1>
        <p className="mt-2 text-floresta/80">Escaneie o QR Code projetado pelo professor ou digite o código da turma.</p>
      </div>
      <form
        className="card space-y-3"
        onSubmit={(e) => { e.preventDefault(); if (code.trim()) router.push(`/p/${code.trim().toUpperCase()}`); }}
      >
        <label htmlFor="code" className="text-sm font-semibold">Código da turma</label>
        <input id="code" className="input text-center text-2xl font-bold uppercase tracking-widest" maxLength={5}
          value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
        <button className="btn-primary w-full py-3 text-base" disabled={!code.trim()}>Entrar na atividade</button>
      </form>
      <Link href="/professor" className="text-center text-sm text-petroleo underline">Sou professor(a): abrir painel</Link>
    </main>
  );
}

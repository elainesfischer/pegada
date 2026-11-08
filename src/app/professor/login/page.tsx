"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError("E-mail ou senha incorretos."); return; }
    router.replace("/professor");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-5">
      <div>
        <Leaf className="mb-2 h-8 w-8 text-folha" aria-hidden />
        <h1 className="text-2xl font-bold">Painel do professor</h1>
        <p className="text-sm text-floresta/70">Entre para criar e acompanhar suas turmas.</p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-semibold">E-mail</label>
          <input id="email" type="email" required autoComplete="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pw" className="text-sm font-semibold">Senha</label>
          <input id="pw" type="password" required autoComplete="current-password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Entrar</button>
      </form>
    </main>
  );
}

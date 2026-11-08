"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Leaf, Lock, Loader2, SearchX } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, LETTERS, TOTAL_QUESTIONS } from "@/lib/questions";
import { CLASS_LABELS, DIM_IDS, DIM_LABELS, TOTAL_MAX, topDimension, type ClassKey } from "@/lib/scoring";
import { TIPS } from "@/lib/feedback";
import { DimIcon } from "@/components/DimIcon";
import { DimBars, DimRadar } from "@/components/Charts";
import { MethodNote } from "@/components/MethodNote";

/** Reenvia com pausa aleatória se a rede falhar (útil quando a turma toda envia ao mesmo tempo).
 *  Seguro: submit_response é idempotente (reenviar não duplica a resposta). */
async function submitWithRetry(args: Record<string, unknown>) {
  let res = await getSupabase().rpc("submit_response", args);
  for (let i = 1; i < 4 && res.error && !/SESSAO_|PARTICIPANTE_|RESPOSTAS_/.test(res.error.message); i++) {
    await new Promise((r) => setTimeout(r, 600 * i + Math.random() * 500));
    res = await getSupabase().rpc("submit_response", args);
  }
  return res;
}

type Result = { total: number; classification: ClassKey; scores: number[] };
type Saved = { participantId?: string; answers?: (number | null)[]; result?: Result };
type Phase = "loading" | "notfound" | "closed" | "intro" | "quiz" | "result" | "error";

export default function StudentPage() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = String(rawCode).toUpperCase();
  const storageKey = `pegada:${code}`;

  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionName, setSessionName] = useState("");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(TOTAL_QUESTIONS).fill(null));
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = useCallback((patch: Saved) => {
    try {
      const cur: Saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      localStorage.setItem(storageKey, JSON.stringify({ ...cur, ...patch }));
    } catch { /* armazenamento indisponível: segue sem salvar */ }
  }, [storageKey]);

  // Carrega a sessão e recupera o progresso deste aparelho (evita duplicar ao recarregar).
  useEffect(() => {
    (async () => {
      const { data, error } = await getSupabase().rpc("get_public_session", { p_code: code });
      if (error) { setError("Não foi possível carregar a atividade. Verifique sua conexão."); setPhase("error"); return; }
      if (!data) { setPhase("notfound"); return; }
      setSessionName(data.name);

      let saved: Saved = {};
      try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch {}
      if (saved.result) { setResult(saved.result); setPhase("result"); return; }
      if (data.status !== "open") { setPhase("closed"); return; }
      if (saved.participantId) {
        setParticipantId(saved.participantId);
        if (saved.answers) setAnswers(saved.answers);
        setPhase("quiz");
        return;
      }
      setPhase("intro");
    })();
  }, [code, storageKey]);

  async function start() {
    setBusy(true); setError("");
    const { data, error } = await getSupabase().rpc("start_participant", { p_code: code, p_nickname: nickname || null });
    setBusy(false);
    if (error) {
      if (error.message.includes("SESSAO_ENCERRADA")) setPhase("closed");
      else setError("Não foi possível iniciar. Tente novamente.");
      return;
    }
    setParticipantId(data as string);
    save({ participantId: data as string });
    setPhase("quiz");
  }

  function choose(q: number, value: number) {
    const next = [...answers];
    next[q] = value;
    setAnswers(next);
    save({ answers: next });
  }

  async function submit() {
    if (busy || !participantId) return;
    setBusy(true); setError("");
    const { data, error } = await submitWithRetry({ p_participant: participantId, p_answers: answers });
    setBusy(false);
    if (error) {
      if (error.message.includes("SESSAO_ENCERRADA")) setPhase("closed");
      else setError("Não foi possível enviar suas respostas. Tente novamente.");
      return;
    }
    const r = data as Result;
    setResult(r); save({ result: r }); setPhase("result");
  }

  const cat = CATEGORIES[step];
  const base = step * 4;
  const stepDone = answers.slice(base, base + 4).every((a) => a !== null);
  const isLast = step === CATEGORIES.length - 1;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
      {phase === "loading" && <Center><Loader2 className="h-8 w-8 animate-spin text-folha" aria-label="Carregando" /></Center>}

      {phase === "notfound" && (
        <Center>
          <SearchX className="h-10 w-10 text-petroleo" aria-hidden />
          <h1 className="text-xl font-bold">Atividade não encontrada</h1>
          <p className="text-floresta/80">Confira o código <strong>{code}</strong> ou escaneie o QR Code novamente.</p>
        </Center>
      )}

      {phase === "closed" && (
        <Center>
          <Lock className="h-10 w-10 text-petroleo" aria-hidden />
          <h1 className="text-xl font-bold">Questionário encerrado</h1>
          <p className="text-floresta/80">O professor não está recebendo novas respostas nesta atividade.</p>
        </Center>
      )}

      {phase === "error" && <Center><p role="alert" className="text-red-700">{error}</p></Center>}

      {phase === "intro" && (
        <div className="space-y-5">
          <header>
            <Leaf className="mb-2 h-9 w-9 text-folha" aria-hidden />
            <h1 className="text-3xl font-extrabold tracking-tight">PEGADA ECOLÓGICA</h1>
            <p className="mt-1 text-sm font-semibold text-petroleo">Índice educativo de Pegada Ecológica</p>
          </header>
          <div className="card space-y-3 text-floresta/90">
            <p>Descubra como seus hábitos de alimentação, transporte, consumo, energia e uso dos recursos naturais influenciam sua pegada ecológica.</p>
            <p>Não existem respostas certas ou erradas. Responda considerando seus hábitos reais.</p>
            <p>As respostas serão utilizadas para uma atividade educativa e os resultados coletivos da turma.</p>
          </div>
          <div className="card space-y-4">
            <div>
              <span className="block text-sm font-semibold">Turma</span>
              <p className="mt-1 rounded-lg bg-brota px-3 py-3 font-medium">{sessionName}</p>
            </div>
            <div>
              <label htmlFor="nick" className="block text-sm font-semibold">Nome ou apelido <span className="font-normal text-floresta/60">(opcional)</span></label>
              <input id="nick" className="input mt-1" maxLength={40} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Você pode participar sem se identificar" autoComplete="off" />
              <p className="mt-1 text-xs text-floresta/60">Se informado, aparece apenas para o professor, nunca no painel projetado.</p>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button onClick={start} disabled={busy} className="btn-primary w-full py-4 text-lg">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null} COMEÇAR QUESTIONÁRIO
          </button>
          <MethodNote />
        </div>
      )}

      {phase === "quiz" && (
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between text-sm font-semibold">
              <span>Etapa {step + 1} de {CATEGORIES.length}</span>
              <span className="text-floresta/60">{answers.filter((a) => a !== null).length}/{TOTAL_QUESTIONS} respondidas</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brota" role="progressbar" aria-valuemin={0} aria-valuemax={CATEGORIES.length} aria-valuenow={step + 1}>
              <div className="h-full bg-folha transition-all" style={{ width: `${((step + 1) / CATEGORIES.length) * 100}%` }} />
            </div>
          </div>

          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <DimIcon name={cat.icon} className="h-7 w-7 text-petroleo" /> {cat.title}
          </h2>

          {cat.questions.map((q, qi) => {
            const idx = base + qi;
            return (
              <fieldset key={idx} className="card space-y-3">
                <legend className="mb-1 font-semibold leading-snug"><span className="text-petroleo">{idx + 1}.</span> {q.text}</legend>
                {q.options.map((opt, oi) => {
                  const selected = answers[idx] === oi;
                  return (
                    <label key={oi} className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-3 transition ${selected ? "border-folha bg-brota" : "border-floresta/15 bg-white hover:border-folha/60"}`}>
                      <input type="radio" name={`q${idx}`} className="sr-only" checked={selected} onChange={() => choose(idx, oi)} />
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-folha text-white" : "bg-musgo text-floresta"}`}>{LETTERS[oi]}</span>
                      <span className="leading-snug">{opt}</span>
                    </label>
                  );
                })}
              </fieldset>
            );
          })}

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            {step > 0 && (
              <button className="btn-secondary px-5 py-4" onClick={() => { setStep(step - 1); window.scrollTo(0, 0); }}>
                <ArrowLeft className="h-5 w-5" aria-label="Voltar" />
              </button>
            )}
            {!isLast ? (
              <button className="btn-primary flex-1 py-4 text-lg" disabled={!stepDone} onClick={() => { setStep(step + 1); window.scrollTo(0, 0); }}>
                Próxima etapa <ArrowRight className="h-5 w-5" aria-hidden />
              </button>
            ) : (
              <button className="btn-primary flex-1 py-4 text-lg" disabled={!stepDone || busy} onClick={submit}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null} Ver meu resultado
              </button>
            )}
          </div>
          {!stepDone && <p className="text-center text-sm text-floresta/60">Responda as 4 perguntas para continuar.</p>}
        </div>
      )}

      {phase === "result" && result && <ResultView result={result} />}
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">{children}</div>;
}

function ResultView({ result }: { result: Result }) {
  const top = topDimension(result.scores);
  const topId = DIM_IDS[top];
  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-floresta p-6 text-white">
        <p className="text-sm text-white/70">Índice educativo de Pegada Ecológica</p>
        <p className="mt-1 text-5xl font-extrabold">{result.total}<span className="text-2xl font-semibold text-white/70">/{TOTAL_MAX}</span></p>
        <p className="mt-1 text-sm text-white/70">Sua pontuação</p>
        <p className="mt-4 text-lg font-bold">Classificação: {CLASS_LABELS[result.classification]}</p>
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">Suas cinco dimensões</h2>
        <ul className="mb-2 grid grid-cols-1 gap-1 text-sm">
          {DIM_IDS.map((id, i) => (
            <li key={id} className="flex justify-between border-b border-floresta/10 py-1"><span>{DIM_LABELS[id]}</span><strong>{result.scores[i]}/12</strong></li>
          ))}
        </ul>
        <DimRadar values={result.scores} height={280} />
        <DimBars values={result.scores} height={240} />
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">Onde sua pegada foi maior?</h2>
        <p className="mt-1">Em <strong>{DIM_LABELS[topId]}</strong> ({result.scores[top]}/12). Algumas ideias simples para experimentar:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {TIPS[topId].map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="mt-3 text-sm text-floresta/70">Pequenas mudanças somadas fazem diferença. O importante é conhecer seus hábitos e escolher o que faz sentido para você.</p>
      </section>

      <p className="rounded-lg bg-brota p-3 text-sm">Seu resultado foi enviado ao painel da turma. Obrigado por participar!</p>
      <MethodNote />
    </div>
  );
}

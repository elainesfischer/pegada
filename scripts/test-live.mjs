// Testes do tempo real (reducer incremental), cronômetro, textos e imagem. Rode: npm run test:live
import assert from "node:assert/strict";
import { applyChanges, countsOf, emptyState, normalizeResponse, responseList } from "../src/lib/live.ts";
import { computeStats } from "../src/lib/stats.ts";
import { computeScores } from "../src/lib/scoring.ts";
import { discussionQuestions, predominantClasses, resultSentences } from "../src/lib/insights.ts";
import { formatClock, phaseOf, remainingSeconds } from "../src/lib/timer.ts";
import { drawResultImage } from "../src/lib/resultImage.ts";

const iso = (i) => new Date(Date.UTC(2026, 10, 2, 12, 0, i)).toISOString();
const part = (i, status = "answering") => ({ id: `p${i}`, session_id: "s", nickname: null, status, created_at: iso(i) });
function resp(i, answers) {
  const r = computeScores(answers);
  return { id: `r${i}`, participant_id: `p${i}`, session_id: "s", answers,
    score_alimentacao: r.scores[0], score_transporte: r.scores[1], score_energia: r.scores[2],
    score_consumo: r.scores[3], score_residuos: r.scores[4], total: r.total, classification: r.classification, created_at: iso(i) };
}

// --- 10 alunos entram, contadores sobem um a um ---
let st = emptyState();
for (let i = 1; i <= 10; i++) {
  st = applyChanges(st, [{ kind: "participant", type: "INSERT", row: part(i) }]);
  assert.deepEqual(countsOf(st), { total: i, completed: 0, answering: i });
}
// --- respostas chegam (transporte alto: 3 nas perguntas 5-8) ---
const mkAnswers = (i) => { const a = Array(20).fill(1); for (let q = 4; q < 8; q++) a[q] = 3; for (let q = 16; q < 20; q++) a[q] = 0; return a; };
for (let i = 1; i <= 4; i++) st = applyChanges(st, [
  { kind: "response", type: "INSERT", row: resp(i, mkAnswers(i)) },
  { kind: "participant", type: "UPDATE", row: part(i, "completed") }]);
assert.deepEqual(countsOf(st), { total: 10, completed: 4, answering: 6 });
let stats = computeStats(responseList(st));
assert.equal(stats.n, 4);
assert.equal(stats.mean, 4 + 12 + 4 + 4 + 0 === 24 ? 24 : 24); // 4+12+4+4+0 = 24
assert.deepEqual(stats.dimMeans, [4, 12, 4, 4, 0]);
assert.equal(stats.highest, 1); assert.equal(stats.lowest, 4);
assert.deepEqual(stats.dimPercents, [33, 100, 33, 33, 0]);

// --- eventos fora de ordem: resposta antes do participante; UPDATE antigo não regride ---
st = applyChanges(st, [{ kind: "response", type: "INSERT", row: resp(11, mkAnswers(11)) }]);
assert.deepEqual(countsOf(st), { total: 11, completed: 5, answering: 6 });
st = applyChanges(st, [{ kind: "participant", type: "UPDATE", row: part(1, "answering") }]);
assert.equal(st.participants.p1.status, "completed");

// --- 100 alunos quase simultâneos em um único lote ---
let big = emptyState();
const batch = [];
for (let i = 1; i <= 100; i++) { batch.push({ kind: "participant", type: "INSERT", row: part(i) }); batch.push({ kind: "response", type: "INSERT", row: resp(i, Array(20).fill(i % 4)) }); }
big = applyChanges(big, batch);
assert.deepEqual(countsOf(big), { total: 100, completed: 100, answering: 0 });
assert.equal(computeStats(responseList(big)).n, 100);

// --- status da sessão chega por tempo real ---
st = applyChanges({ ...st, session: { id: "s", name: "T", code: "ABCDE", status: "open", created_at: iso(0), public_results: false } },
  [{ kind: "session", row: { status: "closed" } }]);
assert.equal(st.session.status, "closed");

// --- zerar e exclusão em cascata ---
st = applyChanges(st, [{ kind: "participant", type: "DELETE", id: "p1" }]);
assert.ok(!Object.values(st.responses).some((r) => r.participant_id === "p1"));
st = applyChanges(st, [{ kind: "reset" }]);
assert.deepEqual(countsOf(st), { total: 0, completed: 0, answering: 0 });

// --- normalização de array vindo como texto ---
assert.deepEqual(normalizeResponse({ ...resp(1, Array(20).fill(2)), answers: "{" + Array(20).fill(2).join(",") + "}" }).answers, Array(20).fill(2));

// --- textos e perguntas dependem dos resultados ---
const s1 = computeStats(responseList(applyChanges(emptyState(), [1, 2, 3].map((i) => ({ kind: "response", type: "INSERT", row: resp(i, mkAnswers(i)) })))));
const sentences = resultSentences(s1);
assert.ok(sentences[0].includes("Transporte") && sentences[1].includes("Resíduos e água"));
assert.ok(sentences.some((s) => /100% dos participantes ficaram na faixa de pegada/.test(s)));
const q = discussionQuestions(s1); assert.equal(q.length, 3); assert.ok(q[0].includes("Transporte"));
const flat = computeStats([resp(1, Array(20).fill(1))]);
assert.ok(discussionQuestions(flat)[0].includes("próximas")); // perguntas mudam
assert.deepEqual(predominantClasses({ muito_baixa: 2, baixa_moderada: 2, alta: 0, muito_alta: 0 }), ["muito_baixa", "baixa_moderada"]);

// --- cronômetro ---
assert.equal(remainingSeconds(10_000, 5_500), 5);
assert.equal(formatClock(272), "04:32");
assert.deepEqual([null, 300, 60, 45, 30, 11, 10, 1, 0].map(phaseOf),
  ["off", "running", "warn60", "warn60", "warn30", "warn30", "final10", "final10", "expired"]);

// --- imagem 1080x1080 (contexto simulado: verifica que desenha tudo sem erro) ---
const calls = { text: [], rects: 0 };
const ctx = new Proxy({}, { get: (_, p) => {
  if (p === "measureText") return (t) => ({ width: String(t).length * 14 });
  if (p === "fillText") return (t) => calls.text.push(t);
  if (p === "fillRect") return () => calls.rects++;
  return () => {};
}, set: () => true });
drawResultImage(ctx, { sessionName: "Pegada Ecológica — SI 1º semestre com um nome bem longo para testar o ajuste", dateLabel: "02/11/2026", n: 32, mean: 28.4, classLabel: "Baixa a moderada", dimMeans: [4, 9, 6, 5, 3.7], highest: 1, lowest: 4 });
for (const t of ["Pegada Ecológica da Turma", "28,4", "Alimentação", "Transporte", "Resíduos e água", "Maior pressão ambiental", "Menor pressão ambiental", "75% da pressão máxima"])
  assert.ok(calls.text.includes(t), `texto ausente na imagem: ${t}`);
assert.ok(calls.text.some((t) => t.includes("32 participantes")));

console.log("✔ Tempo real, cronômetro, textos e imagem: todos os testes passaram.");

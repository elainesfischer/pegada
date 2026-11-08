// Testes da lógica de pontuação e estatísticas. Rode com: npm test
import assert from "node:assert/strict";
import { computeScores, classify } from "../src/lib/scoring.ts";
import { computeStats } from "../src/lib/stats.ts";
import { discussionQuestions } from "../src/lib/insights.ts";
import { CATEGORIES, TOTAL_QUESTIONS } from "../src/lib/questions.ts";

// Questionário
assert.equal(CATEGORIES.length, 5);
assert.equal(CATEGORIES.reduce((n, c) => n + c.questions.length, 0), TOTAL_QUESTIONS);
CATEGORIES.forEach((c) => c.questions.forEach((q) => assert.equal(q.options.length, 4)));

// Pontuação
const zeros = computeScores(Array(20).fill(0));
assert.equal(zeros.total, 0); assert.equal(zeros.classification, "muito_baixa");
const threes = computeScores(Array(20).fill(3));
assert.equal(threes.total, 60); assert.deepEqual(threes.scores, [12, 12, 12, 12, 12]);
assert.equal(threes.classification, "muito_alta");
const mixed = computeScores([3,3,3,3, 0,0,0,0, 1,1,1,1, 2,2,2,2, 0,1,2,3]);
assert.deepEqual(mixed.scores, [12, 0, 4, 8, 6]); assert.equal(mixed.total, 30);
assert.equal(mixed.classification, "baixa_moderada");

// Faixas de classificação
[[0,"muito_baixa"],[15,"muito_baixa"],[16,"baixa_moderada"],[30,"baixa_moderada"],
 [31,"alta"],[45,"alta"],[46,"muito_alta"],[60,"muito_alta"]]
  .forEach(([t, c]) => assert.equal(classify(t), c, `total ${t}`));

// Entradas inválidas
assert.throws(() => computeScores(Array(19).fill(0)));
assert.throws(() => computeScores(Array(20).fill(4)));

// Estatísticas da turma (2 alunos)
const mk = (answers, i) => {
  const r = computeScores(answers);
  return { id: `r${i}`, participant_id: `p${i}`, session_id: "s", answers,
    score_alimentacao: r.scores[0], score_transporte: r.scores[1], score_energia: r.scores[2],
    score_consumo: r.scores[3], score_residuos: r.scores[4], total: r.total,
    classification: r.classification, created_at: new Date().toISOString() };
};
assert.equal(computeStats([]), null);
const one = computeStats([mk(Array(20).fill(3), 1)]);
assert.equal(one.n, 1); assert.equal(one.mean, 60);
const two = computeStats([mk(Array(20).fill(3), 1), mk(Array(20).fill(0), 2)]);
assert.equal(two.n, 2); assert.equal(two.mean, 30); assert.equal(two.min, 0);
assert.equal(two.max, 60); assert.equal(two.median, 30);
assert.deepEqual(two.dimMeans, [6, 6, 6, 6, 6]); assert.deepEqual(two.dimPercents, [50, 50, 50, 50, 50]);
assert.equal(two.distribution.muito_alta, 1); assert.equal(two.distribution.muito_baixa, 1);
assert.equal(discussionQuestions(two).length, 3);

console.log("✔ Todos os testes de pontuação e estatística passaram.");

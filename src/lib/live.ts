import type { ParticipantRow, ResponseRow } from "./stats.ts";

export type SessionRow = {
  id: string; name: string; code: string; status: "open" | "closed"; created_at: string; public_results: boolean;
};

export type LiveState = {
  session: SessionRow | null;
  participants: Record<string, ParticipantRow>;
  responses: Record<string, ResponseRow>;
};

export type Change =
  | { kind: "participant"; type: "INSERT" | "UPDATE"; row: ParticipantRow }
  | { kind: "participant"; type: "DELETE"; id: string }
  | { kind: "response"; type: "INSERT" | "UPDATE"; row: ResponseRow }
  | { kind: "response"; type: "DELETE"; id: string }
  | { kind: "session"; row: Partial<SessionRow> }
  | { kind: "reset" };

export const emptyState = (): LiveState => ({ session: null, participants: {}, responses: {} });

/** O Realtime pode entregar arrays do Postgres como texto "{1,2,3}". Normaliza. */
export function normalizeResponse(raw: any): ResponseRow {
  let answers = raw.answers;
  if (typeof answers === "string") answers = answers.replace(/[{}]/g, "").split(",").filter(Boolean).map(Number);
  const num = (v: unknown) => Number(v);
  return {
    ...raw, answers,
    score_alimentacao: num(raw.score_alimentacao), score_transporte: num(raw.score_transporte),
    score_energia: num(raw.score_energia), score_consumo: num(raw.score_consumo),
    score_residuos: num(raw.score_residuos), total: num(raw.total),
  } as ResponseRow;
}

/** Aplica um lote de mudanças de forma incremental (sem refazer consultas). */
export function applyChanges(state: LiveState, changes: Change[]): LiveState {
  if (!changes.length) return state;
  const participants = { ...state.participants };
  const responses = { ...state.responses };
  let session = state.session;

  for (const c of changes) {
    if (c.kind === "reset") {
      for (const k of Object.keys(participants)) delete participants[k];
      for (const k of Object.keys(responses)) delete responses[k];
    } else if (c.kind === "session") {
      session = session ? { ...session, ...c.row } : (c.row as SessionRow);
    } else if (c.kind === "participant") {
      if (c.type === "DELETE") {
        delete participants[c.id];
        for (const [rid, r] of Object.entries(responses)) if (r.participant_id === c.id) delete responses[rid];
      } else {
        const prev = participants[c.row.id];
        // nunca "regride" um participante já concluído (eventos podem chegar fora de ordem)
        participants[c.row.id] = prev?.status === "completed" ? { ...c.row, status: "completed" } : c.row;
      }
    } else if (c.kind === "response") {
      if (c.type === "DELETE") delete responses[c.id];
      else {
        responses[c.row.id] = c.row;
        const p = participants[c.row.participant_id];
        if (p && p.status !== "completed") participants[p.id] = { ...p, status: "completed" };
      }
    }
  }
  return { session, participants, responses };
}

/** Contadores: participantes = união de quem entrou e de quem já tem resposta. */
export function countsOf(state: LiveState) {
  const ids = new Set(Object.keys(state.participants));
  const list = Object.values(state.responses);
  for (const r of list) ids.add(r.participant_id);
  const completed = new Set(list.map((r) => r.participant_id)).size;
  const total = ids.size;
  return { total, completed, answering: Math.max(total - completed, 0) };
}

export function responseList(state: LiveState): ResponseRow[] {
  return Object.values(state.responses).sort((a, b) => a.created_at.localeCompare(b.created_at));
}
export function participantList(state: LiveState): ParticipantRow[] {
  return Object.values(state.participants).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

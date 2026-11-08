"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import {
  applyChanges, countsOf, emptyState, normalizeResponse, participantList, responseList,
  type Change, type LiveState, type SessionRow,
} from "@/lib/live";
import type { ParticipantRow } from "@/lib/stats";
import { computeStats } from "@/lib/stats";

/**
 * Dados da sessão em tempo real.
 * - UMA única subscription (canal) por tela, removida ao desmontar.
 * - Eventos são aplicados de forma incremental e agrupados (a cada ~150 ms),
 *   então 100 alunos respondendo juntos geram poucas atualizações de tela.
 * - Uma busca completa só ocorre ao (re)conectar e, por segurança, a cada 30 s.
 */
export function useSessionLive(sessionId: string) {
  const supabase = getSupabase();
  const [state, setState] = useState<LiveState>(emptyState());
  const [live, setLive] = useState(false);
  const [missing, setMissing] = useState(false);
  const buffer = useRef<Change[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout>>();

  const push = useCallback((c: Change) => {
    buffer.current.push(c);
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(() => {
        const batch = buffer.current; buffer.current = []; flushTimer.current = undefined;
        setState((prev) => applyChanges(prev, batch));
      }, 150);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    const [s, p, r] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
      supabase.from("participants").select("*").eq("session_id", sessionId),
      supabase.from("responses").select("*").eq("session_id", sessionId),
    ]);
    if (!s.data) { setMissing(true); return; }
    const participants: LiveState["participants"] = {};
    ((p.data ?? []) as ParticipantRow[]).forEach((x) => (participants[x.id] = x));
    const responses: LiveState["responses"] = {};
    (r.data ?? []).forEach((x) => { const n = normalizeResponse(x); responses[n.id] = n; });
    setState({ session: s.data as SessionRow, participants, responses });
  }, [supabase, sessionId]);

  useEffect(() => {
    const channel = supabase
      .channel(`live-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
        (p: any) => { if (p.eventType !== "DELETE") push({ kind: "participant", type: p.eventType, row: p.new }); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "participants" },
        (p: any) => { if (p.old?.id) push({ kind: "participant", type: "DELETE", id: p.old.id }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "responses", filter: `session_id=eq.${sessionId}` },
        (p: any) => { if (p.eventType !== "DELETE") push({ kind: "response", type: p.eventType, row: normalizeResponse(p.new) }); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "responses" },
        (p: any) => { if (p.old?.id) push({ kind: "response", type: "DELETE", id: p.old.id }); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (p: any) => push({ kind: "session", row: p.new }))
      .subscribe((status: string) => {
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") fetchAll();   // (re)sincroniza ao conectar
      });
    fetchAll();
    const reconcile = setInterval(fetchAll, 30000);
    return () => {
      clearInterval(reconcile);
      clearTimeout(flushTimer.current); flushTimer.current = undefined; buffer.current = [];
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, push, fetchAll]);

  const responses = useMemo(() => responseList(state), [state]);
  const participants = useMemo(() => participantList(state), [state]);
  const counts = useMemo(() => countsOf(state), [state]);
  const stats = useMemo(() => computeStats(responses), [responses]);

  return {
    session: state.session, participants, responses, counts, stats, live, missing,
    refresh: fetchAll,
    /** Atualização local imediata (o evento de tempo real confirma depois). */
    patchSession: (row: Partial<SessionRow>) => setState((prev) => applyChanges(prev, [{ kind: "session", row }])),
    clearLocal: () => setState((prev) => applyChanges(prev, [{ kind: "reset" }])),
  };
}

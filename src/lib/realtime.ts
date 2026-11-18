"use client";
// One SSE connection per signed-in tab (INTERFACES W2-D): POST ticket → EventSource /api/realtime/stream?ticket=…,
// resume with last_event_id after a drop, and turn each frame into TanStack Query invalidations.
import { useEffect } from "react";
import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { qk } from "@/lib/query/client";

type Frame = { type: string; conversation_id?: string } & Record<
  string,
  unknown
>;

/** Event type → query keys (prefixes) it makes stale. Unknown types are ignored. */
export function keysFor(f: Frame): QueryKey[] {
  if (f.type === "notification") return [qk.notifications];
  if (f.type.startsWith("chat.")) {
    const cid = f.conversation_id;
    return [
      ["ops", "convs"],
      ["ops", "chat-metrics"],
      ...(cid
        ? [
            ["ops", "thread", cid],
            ["c2", "msgs", cid],
          ]
        : [
            ["ops", "thread"],
            ["c2", "msgs"],
          ]),
    ];
  }
  return [];
}

function connect(qc: QueryClient) {
  let es: EventSource | null = null,
    last = "",
    tries = 0,
    stop = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  const open = async () => {
    try {
      const { ticket } = await unwrap<{ ticket: string }>(
        api.POST("/api/realtime/ticket"),
      );
      if (stop) return;
      es = new EventSource(
        `/api/realtime/stream?ticket=${encodeURIComponent(ticket)}${last ? `&last_event_id=${encodeURIComponent(last)}` : ""}`,
      );
      es.onopen = () => (tries = 0);
      es.onmessage = (e) => {
        if (e.lastEventId) last = e.lastEventId;
        try {
          for (const queryKey of keysFor(JSON.parse(e.data)))
            void qc.invalidateQueries({ queryKey });
        } catch {
          /* malformed frame */
        }
      };
      // Server closes at 30 min; tickets are single-use, so reconnect with a fresh one instead of EventSource's own retry.
      es.onerror = () => {
        es?.close();
        retry();
      };
    } catch {
      retry();
    } // no backend (dummy-data mode) or signed out: back off, queries still work
  };
  const retry = () => {
    if (!stop) timer = setTimeout(open, Math.min(30_000, 1000 * 2 ** tries++));
  };
  void open();
  return () => {
    stop = true;
    clearTimeout(timer);
    es?.close();
  };
}

/** Mount once under an authenticated session (SessionProvider does this). */
export function useRealtime(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => (enabled ? connect(qc) : undefined), [enabled, qc]);
}

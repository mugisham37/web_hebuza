"use client";
// Stage 8 §0.3: the Stage 4 agent workspace is mounted twice — /agent (internal) and /work (external).
// Route links go through wsHref() so the same components serve both; API paths stay /api/agent/x/*.
import { createContext, useContext } from "react";

export type WsKey = "agent" | "work";
export type Ws = { key: WsKey; base: "/agent" | "/work"; external: boolean };
export const WS: Record<WsKey, Ws> = {
  agent: { key: "agent", base: "/agent", external: false },
  work: { key: "work", base: "/work", external: true },
};
/** Stage 4 path names that are renamed for externals (cases → jobs). */
const RENAME: Record<string, string> = { cases: "jobs" };

export const swapBase = (ws: Ws, p: string) =>
  ws.key === "agent"
    ? p
    : p.replace(/^\/agent(?=\/|$|\?)(\/([^/?#]+))?/, (_m, _s, seg?: string) =>
        seg ? `${ws.base}/${RENAME[seg] ?? seg}` : ws.base,
      );

export const WsCtx = createContext<Ws>(WS.agent);
export function useWs() {
  const ws = useContext(WsCtx);
  return { ...ws, wsHref: (p: string) => swapBase(ws, p) };
}

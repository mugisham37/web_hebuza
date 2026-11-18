// Assistant client core (plan 11 §2.7–2.8): SSE parser, provider-agnostic transport, PII pre-scan, widget mode.
// No model ids, vendor names or user ids ever leave the browser: the HEBUZA server owns all of that.
import { api } from "@/lib/api/client";
import type { Locale } from "@/shared/i18n/config";
import type { AiErrorType, AssistantMode, AssistantStatus, HandoffData, HandoffReason, StreamEvent } from "@/shared/booking/types";

/** Parses `text/event-stream` frames from a fetch body (EventSource can't POST). Unknown events are dropped. */
export async function* parseSse(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const KNOWN = new Set(["meta", "delta", "citation", "tool_card", "notice", "handoff", "done", "error"]);
  try {
    while (true) {
      if (signal?.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
        const frame = buf.slice(0, i);
        buf = buf.slice(i).replace(/^\r?\n\r?\n/, "");
        let event = "message";
        const data: string[] = [];
        for (const line of frame.split(/\r?\n/)) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
        }
        if (!KNOWN.has(event) || !data.length) continue;
        try { yield { event, data: JSON.parse(data.join("\n")) } as StreamEvent; } catch { /* malformed frame: skip */ }
      }
    }
  } finally { reader.releaseLock(); }
}

export class AssistantHttpError extends Error {
  constructor(public status: number, public errorType: AiErrorType | "captcha_required" | "validation" | "handoff_failed" | "not_found") { super(errorType); }
}
type Raw = { data?: unknown; error?: unknown; response: Response };
async function ai<T>(call: Promise<Raw>): Promise<T> {
  const { data, error, response } = await call;
  const body = (error ?? data ?? {}) as { success?: boolean; errorType?: AiErrorType; data?: unknown };
  if (!response.ok || body.success === false) throw new AssistantHttpError(response.status, body.errorType ?? "server_error");
  return body.data as T;
}
const idem = () => ({ "Idempotency-Key": crypto.randomUUID() });
const sid = (id: string) => ({ path: { id } });

export interface AssistantTransport {
  status(): Promise<AssistantStatus>;
  start(input: { lang: Locale; context: "public" | "portal" | "staff_test"; page?: string }): Promise<{ sessionId: string }>;
  send(sessionId: string, text: string, lang: Locale, signal: AbortSignal): AsyncIterable<StreamEvent>;
  answerTool(sessionId: string, toolCallId: string, value: unknown, lang: Locale, signal: AbortSignal): AsyncIterable<StreamEvent>;
  rate(sessionId: string, messageId: string | null, value: 1 | -1, comment?: string): Promise<void>;
  handoff(sessionId: string, reason: HandoffReason): Promise<HandoffData>;
  lead(sessionId: string, body: { toolCallId: string; name: string; phone?: string; email?: string; topic: string; consent: boolean }): Promise<{ leadId: string }>;
}

async function* stream(call: Promise<Raw>, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  const { data, error, response } = await call;
  if (!response.ok || !(data instanceof ReadableStream) || !response.headers.get("content-type")?.includes("event-stream")) {
    throw new AssistantHttpError(response.status, (error as { errorType?: AiErrorType } | undefined)?.errorType ?? "server_error");
  }
  yield* parseSse(data, signal);
}

/** The only transport shipped: typed client to /api/assistant/*. The real backend slots in with zero UI change. */
export const httpTransport: AssistantTransport = {
  status: () => ai<AssistantStatus>(api.GET("/api/assistant/status")),
  start: (input) => ai<{ sessionId: string }>(api.POST("/api/assistant/sessions", { body: input, headers: idem() })),
  send: (id, text, lang, signal) => stream(api.POST("/api/assistant/sessions/{id}/messages", { params: sid(id), body: { text, lang }, headers: idem(), parseAs: "stream", signal }), signal),
  answerTool: (id, toolCallId, value, lang, signal) => stream(api.POST("/api/assistant/sessions/{id}/tool-answers", { params: sid(id), body: { toolCallId, value, lang }, headers: idem(), parseAs: "stream", signal }), signal),
  rate: (id, messageId, value, comment) => ai<void>(api.POST("/api/assistant/sessions/{id}/rating", { params: sid(id), body: { messageId, value, comment }, headers: idem() })),
  handoff: (id, reason) => ai<HandoffData>(api.POST("/api/assistant/sessions/{id}/handoff", { params: sid(id), body: { reason }, headers: idem() })),
  lead: (id, body) => ai<{ leadId: string }>(api.POST("/api/assistant/sessions/{id}/lead", { params: sid(id), body, headers: idem() })),
};

// ---------------------------------------------------------------- PII pre-send scan (F-AIA-08). Never blocks: the server masks regardless.
export type PiiKind = "nid" | "tin" | "phone" | "email" | "card" | "otp" | "password";
const luhn = (d: string) => {
  let sum = 0;
  for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
  return sum % 10 === 0;
};
export function piiScan(text: string): PiiKind[] {
  const out = new Set<PiiKind>();
  const digitRuns = text.match(/\d[\d -]{4,}\d/g) ?? [];
  for (const run of digitRuns) {
    const d = run.replace(/[ -]/g, "");
    if (/^1\d{15}$/.test(d)) out.add("nid");
    else if (d.length >= 13 && d.length <= 19 && luhn(d)) out.add("card");
    else if (/^(250)?0?7[2389]\d{7}$/.test(d)) out.add("phone");
    else if (/^\d{9}$/.test(d) && /\b(tin|nif)\b/i.test(text)) out.add("tin");
    else if (d.length >= 8 && !/,/.test(run) && !/rwf|frw/i.test(text)) out.add("nid"); // long ID-like numbers
  }
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text)) out.add("email");
  if (/\b\d{4,6}\b/.test(text) && /\b(otp|code|kode|pin)\b/i.test(text)) out.add("otp");
  if (/\b(password|mot de passe|ijambo ry'?ibanga)\b/i.test(text)) out.add("password");
  return [...out];
}

// ---------------------------------------------------------------- Widget mode (derived, never stored)
export function deriveMode(o: { status: AssistantStatus | null; online: boolean; streaming: boolean; awaitingTool: boolean; handedOff: boolean; lastError: AiErrorType | null }): AssistantMode {
  if (!o.online) return "offline";
  if (o.status && !o.status.enabled) return "off";
  if (o.lastError === "ai_disabled") return "off";
  if (o.lastError === "budget_stopped" || o.status?.budgetState === "stopped") return "busy";
  if (o.lastError === "rate_limited" || o.status?.dailyRemaining === 0) return "rate_limited";
  if (o.lastError === "session_blocked") return "blocked";
  if (o.lastError === "session_closed") return "idle_closed";
  if (o.streaming) return "streaming";
  if (o.lastError === "server_error" || o.lastError === "stream_in_progress") return "error";
  if (o.awaitingTool) return "awaiting_tool_input";
  return o.handedOff ? "handed_off" : "ready";
}

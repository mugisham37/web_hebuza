// PURE outbox core (plan §2.7): ordering, dependencies, backoff, id rewriting. No IDB, no clock reads.
import type { OpHeader, OpKind, SendResult } from "@/shared/field/types";

/** Natural visit order — the reference for display labels (board SY2). */
export const KIND_ORDER: OpKind[] = ["visit.accept", "visit.checkin", "visit.checklist", "visit.note", "scan.upload",
  "receipt.create", "custody.handover", "incident.create", "visit.checkout", "expense.create", "cash.record", "cash.deposit"];

const DONE = new Set(["sent"]);
const ATTENTION = new Set(["conflict", "rejected"]);

export const backoffMs = (attempts: number, rand: number) =>
  Math.round(Math.min(2 ** attempts * 2000, 300_000) * (0.8 + 0.4 * rand));

/** Pending = everything not yet accepted by the server (conflicts included, journey F4). */
export const pendingCount = (ops: OpHeader[]) => ops.filter((o) => !DONE.has(o.state)).length;
export const needsReview = (ops: OpHeader[]) => ops.filter((o) => o.state === "conflict").length;
export const failedCount = (ops: OpHeader[]) => ops.filter((o) => o.state === "failed" || o.state === "rejected").length;

/** Global FIFO by seq; skip ops whose dependencies aren't sent yet or whose backoff hasn't elapsed. */
export function nextSendable(ops: OpHeader[], now: number): OpHeader | null {
  const byId = new Map(ops.map((o) => [o.opId, o]));
  for (const o of [...ops].sort((a, b) => a.seq - b.seq)) {
    if (o.state !== "queued" && o.state !== "failed" && o.state !== "blocked") continue;
    if (o.nextAt > now) continue;
    const deps = o.dependsOn.map((d) => byId.get(d)).filter(Boolean) as OpHeader[];
    if (deps.some((d) => d.state !== "sent")) continue;
    return o;
  }
  return null;
}

/** Marks ops blocked when a dependency is in conflict/rejected, and un-blocks when it clears. */
export function refreshBlocked(ops: OpHeader[]): OpHeader[] {
  const byId = new Map(ops.map((o) => [o.opId, o]));
  return ops.map((o) => {
    if (o.state !== "queued" && o.state !== "blocked") return o;
    const stuck = o.dependsOn.some((d) => { const s = byId.get(d)?.state; return s && (ATTENTION.has(s) || s === "blocked"); });
    return stuck ? { ...o, state: "blocked" } : o.state === "blocked" ? { ...o, state: "queued" } : o;
  });
}

export function onResult(ops: OpHeader[], opId: string, r: SendResult, now: number, rand: number): OpHeader[] {
  const next = ops.map((o) => {
    if (o.opId !== opId) return o;
    switch (r.kind) {
      case "ok": return { ...o, state: "sent" as const, error: undefined, serverRef: r.serverRef ?? o.serverRef, sentAt: now };
      case "retry": {
        const attempts = o.attempts + 1;
        return { ...o, state: "failed" as const, attempts, error: r.error, nextAt: now + (r.retryAfterMs ?? backoffMs(attempts, rand)) };
      }
      case "conflict": return { ...o, state: "conflict" as const, error: "field_conflict" };
      case "rejected": return { ...o, state: "rejected" as const, error: r.error };
      case "revoked": return o;
    }
  });
  return refreshBlocked(next);
}

/** Crash safety: an op left `sending` after reload goes back to `queued` (requests are idempotent). */
export const recover = (ops: OpHeader[]) => ops.map((o) => (o.state === "sending" ? { ...o, state: "queued" as const } : o));

/** Replace local refs (CR-LOCAL-7F2A) with server numbers in a body before sending. */
export function rewriteIds<T>(body: T, idMap: Record<string, string>): T {
  if (!Object.keys(idMap).length) return body;
  return JSON.parse(JSON.stringify(body), (_k, v) => (typeof v === "string" && idMap[v] ? idMap[v] : v)) as T;
}

/** Dependencies for a new op on a visit: its check-in, plus anything explicitly listed. */
export function depsFor(ops: OpHeader[], kind: OpKind, visitId: string | undefined, extra: string[] = []): string[] {
  if (!visitId || kind === "visit.checkin" || kind === "visit.accept" || kind === "expense.create") return extra;
  const checkin = ops.find((o) => o.visitId === visitId && o.kind === "visit.checkin" && o.state !== "sent");
  return checkin ? [checkin.opId, ...extra] : extra;
}

/** Short local reference shown until the server numbers the item (D-7). */
export function localRef(prefix: string, opId: string) {
  return `${prefix}-LOCAL-${opId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

// Self-check (dev only): FIFO + deps + backoff bounds. Cheap enough to run once at import.
if (process.env.NODE_ENV !== "production") {
  const h = (seq: number, opId: string, dependsOn: string[] = [], state: OpHeader["state"] = "queued"): OpHeader =>
    ({ seq, opId, kind: "visit.note", dependsOn, state, attempts: 0, nextAt: 0, createdAt: 0, bytes: 0 });
  const ops = [h(1, "a", [], "conflict"), h(2, "b", ["a"]), h(3, "c")];
  console.assert(nextSendable(refreshBlocked(ops), 0)?.opId === "c", "field queue: conflict must block only dependents");
  console.assert(backoffMs(20, 1) <= 360_000 && backoffMs(1, 0) >= 3200, "field queue: backoff bounds");
  console.assert(rewriteIds({ a: "CR-LOCAL-1", b: ["CR-LOCAL-1"] }, { "CR-LOCAL-1": "CR-2026-000001" }).b[0] === "CR-2026-000001", "field queue: idMap");
}

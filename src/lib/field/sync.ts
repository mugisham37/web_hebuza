"use client";
// Field sync engine (plan §2.7–2.8): the page owns the queue. Writes land in encrypted IDB first, then replay one at a
// time in seq order, idempotent by opId, with dependency blocking, backoff, conflicts, leader tab and revoke shred.
// shortcut: files travel inline as data URLs in JSON bodies (the server stores them, 25 MB cap per op); switch to presigned direct uploads if scans outgrow that.
import { useSyncExternalStore } from "react";
import { FieldStore, expiryState, TTL_MS, type Meta } from "./store";
import { nextSendable, onResult, recover, refreshBlocked, rewriteIds, depsFor, localRef as mkLocalRef, pendingCount } from "./queue";
import { getPrefs } from "./prefs";
import type { Op, OpBody, OpKind, OpHeader, SendResult, ConflictPayload, PrepareBundle } from "@/shared/field/types";

export type EngineState = {
  status: "idle" | "booting" | "ready" | "revoked" | "error";
  userId: string | null;
  ops: Op[];
  conflicts: Record<string, ConflictPayload>;
  meta: Meta | null;
  bundle: PrepareBundle | null;
  syncing: { done: number; total: number; current?: string } | null;
  otherTab: boolean;
  lastSyncAt: number | null;
  forbidden: boolean;
  updateReady: boolean;
  now: number;
};

const INIT: EngineState = { status: "idle", userId: null, ops: [], conflicts: {}, meta: null, bundle: null, syncing: null, otherTab: false, lastSyncAt: null, forbidden: false, updateReady: false, now: 0 };
let state: EngineState = INIT;
let store: FieldStore | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let timers: number[] = [];
let pumping = false;

function set(patch: Partial<EngineState>) {
  state = { ...state, ...patch, now: Date.now() };
  listeners.forEach((f) => f());
}
const broadcast = () => { try { channel?.postMessage({ type: "changed" }); } catch {} };

// ---------------------------------------------------------------- transport
const ROUTES: Record<OpKind, (v: string, b: OpBody) => [string, string]> = {
  "visit.accept": (v) => ["POST", `/api/x_field/visits/${v}/accept`],
  "visit.checkin": (v) => ["POST", `/api/field/visits/${v}/checkin`],
  "visit.checklist": (v) => ["PATCH", `/api/x_field/visits/${v}/work`],
  "visit.note": (v) => ["PATCH", `/api/x_field/visits/${v}/work`],
  "scan.upload": (v) => ["POST", `/api/x_field/visits/${v}/scans`],
  "receipt.create": (v) => ["POST", `/api/field/visits/${v}/receipts`],
  "custody.handover": (v) => ["POST", `/api/x_field/visits/${v}/custody`],
  "incident.create": (v) => ["POST", `/api/x_field/visits/${v}/incidents`],
  "visit.checkout": (v) => ["POST", `/api/field/visits/${v}/checkout`],
  "expense.create": () => ["POST", `/api/x_field/expenses`],
  "cash.record": (v) => ["POST", `/api/field/visits/${v}/cash`],
  "cash.deposit": (_v, b) => ["POST", `/api/x_field/cash/${encodeURIComponent(String(b.cash_ref))}/deposit`],
};

export type Envelope<T> = { success: boolean; message: string; errorType: string | null; data: T | null };

/** Raw JSON call with envelope; used by the engine and by online-only UI actions (fieldApi). */
export async function call<T>(method: string, path: string, body?: unknown, idemKey?: string, timeoutMs = 30_000): Promise<{ status: number; env: Envelope<T> | null }> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(path, {
      method, credentials: "include", signal: ctl.signal,
      headers: { "content-type": "application/json", ...(idemKey && { "Idempotency-Key": idemKey }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const env = (await r.json().catch(() => null)) as Envelope<T> | null;
    return { status: r.status, env };
  } finally { clearTimeout(t); }
}

async function send(op: Op, idMap: Record<string, string>): Promise<SendResult> {
  const [method, path] = ROUTES[op.kind](op.visitId ?? "", op.body);
  const body = rewriteIds({ ...op.body, client_op_id: op.opId }, idMap);
  const big = op.bytes > 50_000;
  try {
    const { status, env } = await call<{ ref?: string; conflict?: ConflictPayload }>(method, path, body, op.opId, big ? 120_000 : 30_000);
    if (status === 401 && (env?.errorType === "device_revoked" || env?.errorType === "session_revoked")) return { kind: "revoked" };
    if (status >= 200 && status < 300) return { kind: "ok", serverRef: env?.data?.ref, data: env?.data };
    if (status === 409 && env?.errorType === "field_conflict") return { kind: "conflict", payload: (env.data as { conflict: ConflictPayload }).conflict };
    if (status === 409 && env?.errorType === "receipt_immutable") return { kind: "ok" }; // same opId already stored
    if (status === 408 || status === 429 || status >= 500) return { kind: "retry", error: env?.errorType ?? `http_${status}` };
    if (status === 404) return { kind: "conflict", payload: { office: { status: "cancelled" }, mine: op.body, autoMerged: [], needsReview: ["visit_gone"] } };
    if (status === 403 && env?.errorType === "not_field_agent") set({ forbidden: true });
    return { kind: "rejected", error: env?.errorType ?? `http_${status}` };
  } catch {
    return { kind: "retry", error: "network" };
  }
}

// ---------------------------------------------------------------- pump (leader only)
async function pumpOnce() {
  if (!store || state.status !== "ready" || !navigator.onLine) return;
  let headers: OpHeader[] = state.ops;
  const startPending = pendingCount(headers.filter((o) => o.state !== "conflict" && o.state !== "rejected"));
  if (!startPending) return;
  let done = 0;
  set({ syncing: { done, total: startPending } });
  try {
    while (navigator.onLine && store) {
      const h = nextSendable(headers, Date.now());
      if (!h) break;
      const op = state.ops.find((o) => o.opId === h.opId)!;
      const sending = { ...op, state: "sending" as const };
      await store.putHeader(stripBody(sending));
      setOps(state.ops.map((o) => (o.opId === op.opId ? sending : o)));
      set({ syncing: { done, total: startPending, current: op.kind } });
      const idMap = Object.fromEntries(state.ops.filter((o) => o.localRef && o.serverRef).map((o) => [o.localRef!, o.serverRef!]));
      const r = await send(op, idMap);
      if (!store) return; // shredded meanwhile
      if (r.kind === "revoked") { await revoke(); return; }
      if (r.kind === "conflict") { await store.putConflict(op.opId, r.payload); set({ conflicts: { ...state.conflicts, [op.opId]: r.payload } }); }
      const nextHeaders = onResult(state.ops.map(stripBody), op.opId, r, Date.now(), randUnit());
      await applyHeaders(nextHeaders);
      headers = nextHeaders;
      if (r.kind === "ok") done++;
      set({ syncing: { done, total: startPending } });
      if (r.kind === "retry" && r.error === "network") break; // connection probably gone; wait for a trigger
    }
  } finally {
    set({ syncing: null, lastSyncAt: Date.now() });
    broadcast();
  }
}

export async function syncNow() {
  if (pumping || !navigator.onLine) return;
  pumping = true;
  try {
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    if (locks) {
      await locks.request("hebuza-field-sync", { ifAvailable: true }, async (lock) => {
        if (!lock) { set({ otherTab: true }); return; }
        set({ otherTab: false });
        await pumpOnce();
      });
    } else await pumpOnce();
  } finally { pumping = false; }
}

const randUnit = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const stripBody = (o: Op): OpHeader => { const { body, ...h } = o; void body; return h; };
function setOps(ops: Op[]) { set({ ops }); }
async function applyHeaders(headers: OpHeader[]) {
  const byId = new Map(headers.map((h) => [h.opId, h]));
  const ops = state.ops.map((o) => ({ ...o, ...byId.get(o.opId)! }));
  for (const o of ops) {
    const before = state.ops.find((x) => x.opId === o.opId);
    if (before && (before.state !== o.state || before.serverRef !== o.serverRef || before.attempts !== o.attempts)) await store?.putHeader(stripBody(o));
  }
  setOps(ops);
}

// ---------------------------------------------------------------- lifecycle
async function reload() {
  if (!store) return;
  const [ops, conflicts, bundle] = await Promise.all([store.allOps(), store.allConflicts(), store.getSealed<PrepareBundle>("cache", "bundle")]);
  set({ ops, conflicts, bundle, meta: store.meta });
}

async function checkExpiry() {
  if (!store) return;
  if (expiryState(store.meta, Date.now()) === "expired") { await store.wipeReference(); set({ bundle: null, meta: store.meta }); }
  else set({});
}

export async function start(userId: string) {
  if (state.userId === userId && state.status !== "idle") return;
  stop();
  set({ ...INIT, status: "booting", userId });
  try {
    store = await FieldStore.open(userId);
    // "Sent today" only: sent ops older than 24 h leave the phone.
    for (const o of await store.allOps()) if (o.state === "sent" && (o.sentAt ?? o.createdAt) < Date.now() - 86_400_000) await store.delOp(o.seq);
    const ops = await store.allOps();
    const recovered = refreshBlocked(recover(ops.map(stripBody)));
    for (const h of recovered) if (h.state !== ops.find((o) => o.opId === h.opId)?.state) await store.putHeader(h);
    await reload();
    await applyHeaders(recovered);
    set({ status: "ready" });
    await checkExpiry();
  } catch {
    set({ status: "error" });
    return;
  }
  const kick = () => { void checkExpiry(); void syncNow(); };
  const onVis = () => document.visibilityState === "visible" && kick();
  window.addEventListener("online", kick);
  document.addEventListener("visibilitychange", onVis);
  const onSw = (e: MessageEvent) => {
    if (e.data?.type === "field-sync") kick();
    if (e.data?.type === "update-ready") set({ updateReady: true });
  };
  navigator.serviceWorker?.addEventListener("message", onSw);
  try {
    channel = new BroadcastChannel("hebuza-field");
    channel.onmessage = (e) => { if (e.data?.type === "changed") void reload(); if (e.data?.type === "wiped") void revoke(true); };
  } catch {}
  timers = [
    window.setInterval(() => { if (!getPrefs().battery && pendingCount(state.ops) > 0) void syncNow(); }, 60_000),
    window.setInterval(() => void checkExpiry(), 5 * 60_000),
  ];
  cleanup = () => { window.removeEventListener("online", kick); document.removeEventListener("visibilitychange", onVis); navigator.serviceWorker?.removeEventListener("message", onSw); };
  kick();
}
let cleanup = () => {};
export function stop() {
  cleanup(); cleanup = () => {};
  timers.forEach(clearInterval); timers = [];
  channel?.close(); channel = null;
  store?.close(); store = null;
  state = INIT;
}

// ---------------------------------------------------------------- public actions
export type EnqueueInput = { kind: OpKind; visitId?: string; body: OpBody; localPrefix?: string; dependsOn?: string[]; coalesce?: boolean };

/** Writes an op to IDB (sealed) and kicks sync. Returns the op (with its local ref when `localPrefix` is given). */
export async function enqueue(i: EnqueueInput): Promise<Op> {
  if (!store) throw new Error("field_store_unavailable");
  // Coalesce (checklist): last write wins on the still-queued op, keeping its original seq.
  if (i.coalesce) {
    const prev = state.ops.find((o) => o.kind === i.kind && o.visitId === i.visitId && (o.state === "queued" || o.state === "blocked"));
    if (prev) {
      const merged: Op = { ...prev, body: i.body, bytes: JSON.stringify(i.body).length };
      await store.putOp(merged);
      setOps(state.ops.map((o) => (o.opId === prev.opId ? merged : o)));
      broadcast();
      return merged;
    }
  }
  const opId = crypto.randomUUID();
  const seq = (state.ops.at(-1)?.seq ?? 0) + 1;
  const localRef = i.localPrefix ? mkLocalRef(i.localPrefix, opId) : undefined;
  const body = { ...i.body, ...(localRef && { local_ref: localRef }), base_version: i.body.base_version };
  const op: Op = {
    seq, opId, kind: i.kind, visitId: i.visitId, localRef, dependsOn: depsFor(state.ops, i.kind, i.visitId, i.dependsOn),
    state: "queued", attempts: 0, nextAt: 0, createdAt: Date.now(), bytes: JSON.stringify(body).length, body,
  };
  await store.putOp(op); // QuotaExceededError propagates → caller toasts, data stays in the form
  setOps(refreshBlockedOps([...state.ops, op]));
  broadcast();
  void syncNow();
  return op;
}
function refreshBlockedOps(ops: Op[]): Op[] {
  const hs = refreshBlocked(ops.map(stripBody));
  return ops.map((o, i) => ({ ...o, ...hs[i] }));
}

export async function retry(opId: string) {
  await applyHeaders(state.ops.map((o) => (o.opId === opId ? { ...stripBody(o), state: "queued" as const, nextAt: 0 } : stripBody(o))));
  void syncNow();
}

/** Edit a rejected op (reopened form) → re-queue with the new body. */
export async function replaceBody(opId: string, body: OpBody) {
  const op = state.ops.find((o) => o.opId === opId);
  if (!op || !store) return;
  const next: Op = { ...op, body: { ...op.body, ...body }, state: "queued", nextAt: 0, error: undefined };
  await store.putOp(next);
  setOps(refreshBlockedOps(state.ops.map((o) => (o.opId === opId ? next : o))));
  void syncNow();
}

/** Discard (never for signed receipts — caller hides the action). Dependents are discarded too. */
export async function discard(opId: string) {
  if (!store) return;
  const gone = new Set([opId]);
  for (const o of state.ops) if (o.dependsOn.some((d) => gone.has(d))) gone.add(o.opId);
  for (const o of state.ops) if (gone.has(o.opId)) await store.delOp(o.seq);
  await store.delConflict(opId);
  const { [opId]: _drop, ...rest } = state.conflicts; void _drop;
  set({ conflicts: rest });
  setOps(state.ops.filter((o) => !gone.has(o.opId)));
  broadcast();
}

/** U10: office version drops my change (op superseded); escalate re-sends it with resolution=escalate (SM review). */
export async function resolveConflict(opId: string, choice: "office" | "escalate") {
  if (!store) return;
  const op = state.ops.find((o) => o.opId === opId);
  if (!op) return;
  await store.delConflict(opId);
  const { [opId]: _drop, ...rest } = state.conflicts; void _drop;
  set({ conflicts: rest });
  const next: Op = choice === "office"
    ? { ...op, state: "sent", error: "superseded", sentAt: Date.now() }
    : { ...op, state: "queued", nextAt: 0, error: undefined, body: { ...op.body, resolution: "escalate" } };
  await store.putOp(next);
  setOps(refreshBlockedOps(state.ops.map((o) => (o.opId === opId ? next : o))));
  if (choice === "office") void call("POST", `/api/x_field/conflicts/${opId}/resolve`, { choice: "office" }).catch(() => {});
  broadcast();
  void syncNow();
}

/** Prepare: replace the reference cache atomically (single sealed record swap) and stamp expiry. */
export async function savePrepare(bundle: PrepareBundle) {
  if (!store) throw new Error("field_store_unavailable");
  const now = Date.now();
  await store.putSealed("cache", "bundle", bundle);
  await store.setMeta({ preparedAt: now, expiresAt: now + TTL_MS, prepareDate: bundle.date });
  set({ bundle, meta: store.meta });
  broadcast();
}

export const putDraft = (key: string, v: unknown) => store?.putSealed("drafts", key, v);
export const getDraft = <T>(key: string) => (store ? store.getSealed<T>("drafts", key) : Promise.resolve(null));
export const delDraft = (key: string) => store?.delSealed("drafts", key);

/** Sign-out / settings wipe / revoke: crypto-shred everything. */
export async function wipeAll(reason: "signout" | "revoke" | "user" = "user") {
  try { localStorage.setItem("field.wiped", JSON.stringify({ reason, at: Date.now() })); if (reason !== "user") localStorage.removeItem("field.knownAgent"); } catch {} // reported as field.device.wiped on next online
  await store?.shred();
  store = null;
  try { channel?.postMessage({ type: "wiped" }); } catch {}
  set({ ...INIT, status: reason === "revoke" ? "revoked" : "idle", userId: state.userId });
}
async function revoke(fromOtherTab = false) {
  if (fromOtherTab) { store?.close(); store = null; set({ ...INIT, status: "revoked" }); return; }
  await wipeAll("revoke");
}

/** Lets the SW swap code only when nothing is in flight (plan §2.9.7). */
export async function applyUpdate() {
  if (pendingCount(state.ops) > 0) return false;
  const reg = await navigator.serviceWorker?.getRegistration();
  reg?.waiting?.postMessage({ type: "skip-waiting" });
  return true;
}

// ---------------------------------------------------------------- React binding
const sub = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };
export const useEngine = () => useSyncExternalStore(sub, () => state, () => INIT);
export const engineState = () => state;

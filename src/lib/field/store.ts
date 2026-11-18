// Encrypted IndexedDB for the field app (plan §2.4, §2.6). Raw IDB (same idiom as src/lib/agent/outbox.ts), one DB per user.
// Headers (meta, op headers) stay plain and PII-free; every payload is AES-GCM sealed with a non-extractable key.
import { FIELD_POLICY } from "@/shared/policy";
import { newKey, seal, open, sha256Hex, type Sealed } from "./crypto";
import type { OpHeader, OpBody, Op, ConflictPayload } from "@/shared/field/types";

export type Meta = { userIdHash: string; preparedAt: number | null; expiresAt: number | null; keyId: string; schema: 1; prepareDate?: string };
const STORES = ["meta", "keys", "cache", "ops", "conflicts", "drafts"] as const;
type StoreName = (typeof STORES)[number];

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

/** Reference-cache expiry decision as a pure function (tested by assert below). Ops are never wiped by expiry (D-3). */
export function expiryState(meta: Pick<Meta, "preparedAt" | "expiresAt"> | null, now: number): "none" | "fresh" | "stale" | "expiring" | "expired" {
  if (!meta?.preparedAt || !meta.expiresAt) return "none";
  if (now >= meta.expiresAt) return "expired";
  if (meta.expiresAt - now <= 6 * 3600_000) return "expiring";
  if (now - meta.preparedAt >= 24 * 3600_000) return "stale";
  return "fresh";
}

export class FieldStore {
  private constructor(private db: IDBDatabase, private key: CryptoKey, public meta: Meta) {}

  static async open(userId: string): Promise<FieldStore> {
    const userIdHash = (await sha256Hex(`field:${userId}`)).slice(0, 16);
    const db = await openDb(`hebuza-field:${userIdHash}`);
    let meta = await req(db.transaction("meta").objectStore("meta").get("meta")) as Meta | undefined;
    let key = meta ? await req(db.transaction("keys").objectStore("keys").get(meta.keyId)) as CryptoKey | undefined : undefined;
    if (!meta || !key) {
      key = await newKey();
      meta = { userIdHash, preparedAt: null, expiresAt: null, keyId: crypto.randomUUID(), schema: 1 };
      const tx = db.transaction(["meta", "keys", "cache", "ops", "conflicts", "drafts"], "readwrite");
      for (const s of ["cache", "ops", "conflicts", "drafts"] as const) tx.objectStore(s).clear(); // stale data without a key is unreadable anyway
      tx.objectStore("keys").put(key, meta.keyId);
      tx.objectStore("meta").put(meta, "meta");
      await new Promise((r) => (tx.oncomplete = r));
    }
    return new FieldStore(db, key, meta);
  }

  private put(store: StoreName, k: IDBValidKey, v: unknown) { return req(this.db.transaction(store, "readwrite").objectStore(store).put(v, k)); }
  private get<T>(store: StoreName, k: IDBValidKey) { return req(this.db.transaction(store).objectStore(store).get(k)) as Promise<T | undefined>; }
  private del(store: StoreName, k: IDBValidKey) { return req(this.db.transaction(store, "readwrite").objectStore(store).delete(k)); }
  private async entries<T>(store: StoreName): Promise<[string, T][]> {
    const os = this.db.transaction(store).objectStore(store);
    const [keys, vals] = await Promise.all([req(os.getAllKeys()), req(os.getAll())]);
    return keys.map((k, i) => [String(k), vals[i] as T]);
  }

  async setMeta(patch: Partial<Meta>) { this.meta = { ...this.meta, ...patch }; await this.put("meta", "meta", this.meta); }

  // ---- sealed key/value (cache, drafts)
  async putSealed(store: "cache" | "drafts", id: string, value: unknown) { await this.put(store, id, await seal(this.key, `${store}:${id}`, value)); }
  async getSealed<T>(store: "cache" | "drafts", id: string): Promise<T | null> {
    const s = await this.get<Sealed>(store, id);
    return s ? open<T>(this.key, `${store}:${id}`, s) : null;
  }
  delSealed(store: "cache" | "drafts", id: string) { return this.del(store, id); }

  // ---- ops: plain header + sealed body
  async putOp(op: Op) {
    const { body, ...header } = op;
    await this.put("ops", op.seq, { header, body: await seal(this.key, `op:${op.opId}`, body) });
  }
  async putHeader(h: OpHeader) {
    const cur = await this.get<{ header: OpHeader; body: Sealed }>("ops", h.seq);
    if (cur) await this.put("ops", h.seq, { ...cur, header: h });
  }
  async allOps(): Promise<Op[]> {
    const rows = await this.entries<{ header: OpHeader; body: Sealed }>("ops");
    const out: Op[] = [];
    for (const [, r] of rows) {
      try { out.push({ ...r.header, body: await open<OpBody>(this.key, `op:${r.header.opId}`, r.body) }); } catch { /* unreadable → skip */ }
    }
    return out.sort((a, b) => a.seq - b.seq);
  }
  delOp(seq: number) { return this.del("ops", seq); }

  async putConflict(opId: string, c: ConflictPayload) { await this.put("conflicts", opId, await seal(this.key, `conflict:${opId}`, c)); }
  async allConflicts(): Promise<Record<string, ConflictPayload>> {
    const out: Record<string, ConflictPayload> = {};
    for (const [k, s] of await this.entries<Sealed>("conflicts")) {
      try { out[k] = await open<ConflictPayload>(this.key, `conflict:${k}`, s); } catch {}
    }
    return out;
  }
  delConflict(opId: string) { return this.del("conflicts", opId); }

  /** 72 h: reference cache + drafts go, ops and conflicts stay (D-3). */
  async wipeReference() {
    const tx = this.db.transaction(["cache", "drafts"], "readwrite");
    tx.objectStore("cache").clear(); tx.objectStore("drafts").clear();
    await new Promise((r) => (tx.oncomplete = r));
    await this.setMeta({ preparedAt: null, expiresAt: null });
  }

  /** Crypto-shred: drop the key first (data unreadable even if the clear is interrupted), then the DB. */
  async shred() {
    const name = this.db.name;
    await this.del("keys", this.meta.keyId).catch(() => {});
    this.db.close();
    await new Promise((r) => { const d = indexedDB.deleteDatabase(name); d.onsuccess = d.onerror = d.onblocked = r; });
    try { navigator.serviceWorker?.controller?.postMessage({ type: "wipe" }); } catch {}
  }

  close() { this.db.close(); }
}

export const TTL_MS = FIELD_POLICY.cacheTtlMs;

/** Storage estimate; tests may stub navigator.storage.estimate via addInitScript. */
export async function storageEstimate(): Promise<{ used: number; quota: number; persisted: boolean | null }> {
  try {
    const e = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
    return { used: e.usage ?? 0, quota: e.quota ?? 0, persisted };
  } catch { return { used: 0, quota: 0, persisted: null }; }
}
export async function requestPersist(): Promise<boolean> {
  try { return (await navigator.storage.persist?.()) ?? false; } catch { return false; }
}
export const quotaLevel = (used: number, quota: number) => (!quota ? "ok" : used / quota >= 0.95 ? "block" : used / quota >= 0.8 ? "warn" : "ok");

if (process.env.NODE_ENV !== "production") {
  const p = 1_000_000;
  console.assert(expiryState({ preparedAt: p, expiresAt: p + TTL_MS }, p + TTL_MS) === "expired", "field store: 72 h expiry");
  console.assert(expiryState({ preparedAt: p, expiresAt: p + TTL_MS }, p + TTL_MS - 3600_000) === "expiring", "field store: expiring window");
}

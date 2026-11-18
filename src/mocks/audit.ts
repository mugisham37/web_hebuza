// Append-only audit store shared by every mock world (audit P0-OPS-2; Stage 6 reads it).
export type AuditEvent = {
  id: string; at: string; actor: string; action: string;
  entity: { kind: string; id: string };
  before?: unknown; after?: unknown; reason?: string; ip: string;
};
const log: AuditEvent[] = [];
let seq = 0;

/** Records one event. Throws when `requireReason` and the reason is blank, so handlers can answer 422. */
export function audit(e: Omit<AuditEvent, "id" | "at" | "ip"> & { requireReason?: boolean }): AuditEvent {
  if (e.requireReason && !e.reason?.trim()) throw new Error("reason_required");
  const { requireReason, ...rest } = e; void requireReason;
  const ev = Object.freeze({ ...rest, id: `AUD-${String(++seq).padStart(6, "0")}`, at: new Date().toISOString(), ip: "127.0.0.1" });
  log.push(ev);
  return ev;
}
export const auditFor = (kind: string, id: string) => log.filter((e) => e.entity.kind === kind && e.entity.id === id).reverse();
export const auditAll = () => [...log].reverse();

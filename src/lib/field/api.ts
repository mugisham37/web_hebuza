"use client";
// Field data layer (plan §6): local-first reads (encrypted bundle + local op projection), network refresh when online,
// and `fx` for online-only actions (MoMo, OTP, decline, office queues). Lanes add hooks in src/lib/field/<lane>.ts.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { TIME_ZONE } from "@/shared/format";
import { call, useEngine } from "./sync";
import { useOnline } from "./net";
import type { FieldMe, FieldVisit, Op, Outcome, Flag, CustodyReceipt, Expense, ReceiptItem, SignatureMethod, L3 } from "@/shared/field/types";

export const fieldKeys = {
  me: ["field", "me"] as const,
  visits: (date: string) => ["field", "visits", date] as const,
  visit: (id: string) => ["field", "visit", id] as const,
  expenses: () => ["field", "expenses"] as const,
  earnings: (month: string) => ["field", "earnings", month] as const,
  office: (what: string) => ["field", "office", what] as const,
};

/** Online call that throws ApiError (non-2xx) — for server-only actions and office pages. */
export async function fx<T>(method: string, path: string, body?: unknown, idemKey?: string): Promise<T> {
  let res;
  try { res = await call<T>(method, path, body, idemKey); } catch { throw new ApiError(0, "network", "Network error", null); }
  const { status, env } = res;
  if (status < 200 || status >= 300 || !env?.success) throw new ApiError(status, env?.errorType ?? null, env?.message ?? "", null);
  return env.data as T;
}

/** YYYY-MM-DD in Kigali, offset by whole days. */
export function kigaliDate(offsetDays = 0, now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now + offsetDays * 86_400_000));
}

export function useFieldMe() {
  const online = useOnline();
  const eng = useEngine();
  const q = useQuery({ queryKey: fieldKeys.me, queryFn: () => fx<FieldMe>("GET", "/api/x_field/me"), staleTime: 10 * 60_000, retry: online ? 1 : false, networkMode: "offlineFirst" });
  // Offline reload: remember the last server answer (a non-PII boolean) so the shell can start the engine without /me.
  const [known, setKnown] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: reads browser-only state after mount
  useEffect(() => { try { setKnown(localStorage.getItem("field.knownAgent") === "1"); } catch {} }, []);
  useEffect(() => { if (q.data) try { localStorage.setItem("field.knownAgent", q.data.isFieldAgent ? "1" : "0"); } catch {} }, [q.data]);
  const offlineOk = !q.data && !online && (known || !!eng.bundle || eng.ops.length > 0);
  return { ...q, isFieldAgent: q.data?.isFieldAgent ?? offlineOk, offlineOk };
}

// ---------------------------------------------------------------- local projection of queued ops onto server data
const live = (o: Op) => o.state !== "rejected" && o.error !== "superseded";

export function projectVisit(v: FieldVisit, ops: Op[]): FieldVisit & { local: { accepted: boolean; pendingOps: number } } {
  let out: FieldVisit = { ...v, checklist: v.checklist.map((c) => ({ ...c })), notes: [...(v.notes ?? [])] };
  let accepted = false;
  const mine = ops.filter((o) => o.visitId === v.id && live(o));
  for (const o of mine) {
    const b = o.body as Record<string, unknown>;
    switch (o.kind) {
      case "visit.accept": if (out.status === "offered") { out.status = "scheduled"; accepted = o.state !== "sent"; } break;
      case "visit.checkin":
        if (out.status === "scheduled" || out.status === "offered") out.status = "in_progress";
        out.checkin = {
          at: String(b.at), fix: b.lat != null ? { lat: Number(b.lat), lng: Number(b.lng), accuracyM: Number(b.accuracy), at: String(b.at) } : null,
          photoUrl: (b.photo as string) || undefined, flags: (b.flags as Flag[]) ?? [], reason: b.reason as string | undefined, distanceM: (b.distance_m as number | null) ?? null,
        };
        break;
      case "visit.checklist": {
        const ticks = new Map((b.checklist as { id: string; done: boolean }[]).map((t) => [t.id, t.done]));
        out.checklist = out.checklist.map((c) => (ticks.has(c.id) ? { ...c, done: ticks.get(c.id)! } : c));
        break;
      }
      case "visit.note": if (b.notes_append && !out.notes!.includes(String(b.notes_append))) out.notes!.push(String(b.notes_append)); break;
      case "receipt.create": {
        const items = (b.items as ReceiptItem[]) ?? [];
        const n = items.filter((i) => i.original).length;
        if (b.direction === "collected") out.custodyOpen += n; else out.custodyOpen = Math.max(0, out.custodyOpen - n);
        break;
      }
      case "visit.checkout": {
        const outcome = b.outcome as Outcome;
        out = { ...out, status: outcome === "client_absent" ? "missed" : outcome === "rescheduled" ? "scheduled" : "completed",
          checkout: { at: String(b.at), outcome, notes: b.notes as string | undefined, rescheduleTo: b.reschedule_to as string | undefined,
            fix: b.lat != null ? { lat: Number(b.lat), lng: Number(b.lng), accuracyM: Number(b.accuracy), at: String(b.at) } : null } };
        if (outcome === "rescheduled" && b.reschedule_to) out.windowStart = String(b.reschedule_to);
        break;
      }
    }
  }
  return { ...out, local: { accepted, pendingOps: mine.filter((o) => o.state !== "sent").length } };
}

export type LocalReceipt = CustodyReceipt & { opId: string; sync: Op["state"] };
export function receiptsOf(ops: Op[], visitId?: string): LocalReceipt[] {
  return ops.filter((o) => o.kind === "receipt.create" && (!visitId || o.visitId === visitId) && o.state !== "rejected").map((o) => {
    const b = o.body as Record<string, unknown>;
    return {
      id: o.opId, opId: o.opId, sync: o.state, ref: o.serverRef ?? null, localRef: o.localRef!, visitId: o.visitId!, direction: b.direction as "collected" | "returned",
      items: b.items as ReceiptItem[], clientName: String(b.client_name ?? ""), conditionNotes: b.condition_notes as string | undefined,
      signature: { method: b.signature_method as SignatureMethod, signedAt: String(b.signed_at), locale: b.locale_shown as L3 },
      supersedesId: b.supersedes_id as string | undefined, status: o.state === "sent" ? "synced" : "signed", createdAt: new Date(o.createdAt).toISOString(),
    };
  });
}

/** Expenses still on the phone (not yet accepted by the server) in the Expense shape. */
export function localExpenses(ops: Op[], me: { id: string; name: string }): (Expense & { opId: string; sync: Op["state"] })[] {
  return ops.filter((o) => o.kind === "expense.create" && o.state !== "sent").map((o) => {
    const b = o.body as Record<string, unknown>;
    return {
      id: o.opId, opId: o.opId, sync: o.state, ref: null, localRef: o.localRef!, visitId: (b.visit_id as string) ?? null, visitRef: (b.visit_ref as string) ?? null,
      category: b.category as Expense["category"], amount: Number(b.amount), note: b.note as string | undefined, noReceiptReason: b.no_receipt_reason as string | undefined,
      receiptUrl: b.receipt as string | undefined, state: "queued", flags: (b.flags as Flag[]) ?? [], trail: [], createdAt: new Date(o.createdAt).toISOString(),
      claimant: me.id, claimantName: me.name,
    };
  });
}

/**
 * Day plan: network when online (refreshes the view), else the encrypted bundle for its date. Always projected.
 * `source` tells the UI whether it is looking at the live list or the phone's snapshot.
 */
export function useDayPlan(day: "today" | "tomorrow") {
  const online = useOnline();
  const eng = useEngine();
  const date = kigaliDate(day === "today" ? 0 : 1);
  const q = useQuery({
    queryKey: fieldKeys.visits(date),
    queryFn: () => fx<FieldVisit[]>("GET", `/api/field/visits?date=${date}`),
    enabled: online && eng.status !== "revoked",
    networkMode: "offlineFirst",
    staleTime: 30_000,
  });
  const fromBundle = eng.bundle ? eng.bundle.visits.filter((v) => v.windowStart.startsWith(date) || kigaliDate(0, Date.parse(v.windowStart)) === date) : null;
  const base = q.data ?? fromBundle;
  const visits = base?.map((v) => projectVisit(v, eng.ops)) ?? null;
  return {
    visits, date, online,
    source: q.data ? ("network" as const) : fromBundle ? ("cache" as const) : null,
    isLoading: (online && q.isPending && !fromBundle) || eng.status === "booting",
    error: !base && !q.isPending ? q.error : null,
    refetch: q.refetch, isFetching: q.isFetching, dataUpdatedAt: q.dataUpdatedAt,
  };
}

/** One visit: from today's/tomorrow's plan or bundle, else the network (online only). */
export function useVisit(id: string) {
  const online = useOnline();
  const eng = useEngine();
  const cached = eng.bundle?.visits.find((v) => v.id === id) ?? null;
  const q = useQuery({
    queryKey: fieldKeys.visit(id),
    queryFn: () => fx<FieldVisit>("GET", `/api/x_field/visits/${id}`),
    enabled: online && eng.status !== "revoked",
    networkMode: "offlineFirst",
    staleTime: 30_000,
  });
  const base = q.data ?? cached;
  return {
    visit: base ? projectVisit(base, eng.ops) : null,
    isLoading: (online && q.isPending && !cached) || eng.status === "booting",
    error: !base && !q.isPending ? q.error : null, refetch: q.refetch, online, cached: !q.data && !!cached,
  };
}

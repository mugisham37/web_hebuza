// Stage 5 finance lane D mocks (Project/FINANCE-AGENT-BRIEF.md): receivables ageing + reminders (U11), refunds + credit notes (U12),
// ops refund review panel. Registered in handlers.ts before the core. Every amount goes through lib/finance/money.ts.
// shortcut: ★ mock — drop each handler as the real /api/finance/* endpoint ships.
import { http, delay } from "msw";
import { ok, fail } from "./handlers-agent";
import { guard, stepUpOk, needStepUp, idempotent, failFrom } from "./handlers-finance";
import {
  ADJUSTMENTS, ALLOCATIONS, CREDIT_NOTES, INVOICES, LOCKS, NOW, PAYMENTS, REFUNDS, USERS, FinError, actor, invoiceOf, isFinanceUser, record, seq, today,
  type Actor,
} from "./finance-world";
import { CASES, clientOf, agentOf } from "./ops-world";
import { POLICY } from "@/shared/policy";
import { splitVat } from "@/shared/money";
import { creditNoteLines, docTotals, exceedsRefundable, refundSuggestion, reversal } from "@/lib/finance/money";
import { canExecute, canSign, chainComplete, refundChain, sign } from "@/shared/finance/approvals";
import { canMove } from "@/lib/finance/states";
import { BUCKETS, ageingBucket, ageingSummary, daysPastDue, type Bucket } from "@/shared/finance/ageing";
const tail4 = (s: string) => `•••• ${s.replace(/\D/g, "").slice(-4)}`;
import type { CreditNote, Invoice, RefundMethod, RefundReason, RefundRequest, UserRef } from "@/shared/finance/types";
import type { ArNote, Channel, ImpactRow, Reminder, RefundRow, RefundTab } from "@/lib/finance/d";
import type { Locale } from "@/shared/i18n/config";

const H = 3600_000;
const at = (h: number) => new Date(NOW + h * H).toISOString();
const YEAR = new Date(NOW).getUTCFullYear();
const me = (): UserRef => { const a = actor(); return { id: a.id, name: a.name }; };
const isSm = (a: Actor) => a.roles.includes("staff:service_manager");
const isExec = (a: Actor) => a.roles.includes("staff:executive");

// ---------------------------------------------------------------- refund extras (fields the shared type lacks)
type R = RefundRequest & Partial<Omit<RefundRow, keyof RefundRequest | "clientName" | "tier" | "mine">>;
const refunds = REFUNDS as R[];
/** Case status → refund policy key (POLICY.refundPolicyBps). shortcut: 4 policy stages; add approved_assigned 90% when the policy table grows. */
const stageOf = (caseRef?: string) => {
  const s = CASES.find((c) => c.ref === caseRef)?.status ?? "completed_delivered";
  return /^(received|under_review|awaiting_|approved_assigned)/.test(s) && s !== "awaiting_internal_review" ? "before_work"
    : s === "in_progress" ? "in_progress" : s === "completed_delivered" ? "completed" : "submitted";
};
/** Split a VAT-inclusive refund amount back into eligible part (+ pass-through when unspent). */
function partsOf(inv: Invoice, amount: number, spent: boolean) {
  const passThroughRefunded = spent ? 0 : Math.min(amount, inv.totals.passThrough);
  return { eligiblePart: splitVat(amount - passThroughRefunded).net, passThroughRefunded };
}
const destChanged = (r: R) => !!r.destination?.changed;
const rechain = (r: R, amount: number) => {
  const fresh = refundChain(amount, { destinationChanged: destChanged(r) });
  // The SM recommendation stays; finance/executive signatures are cleared — an edited amount is a new decision (board 09 fix).
  return fresh.map((s, i) => (i === 0 && r.chain[0]?.signedBy ? r.chain[0] : s));
};
const touch = (r: R) => { r.rev++; r.updatedBy = actor().name; r.updatedAt = new Date().toISOString(); };

// ---------------------------------------------------------------- seed: one refund per queue tab (built from the world at load)
refunds.forEach((r) => {
  const inv = invoiceOf(r.invoiceNo)!;
  Object.assign(r, partsOf(inv, r.recommended ?? r.requested, true));
});
const paid = INVOICES.filter((i) => i.status === "paid" && i.caseRef && !refunds.some((r) => r.invoiceNo === i.no));
function seedRefund(inv: Invoice | undefined, o: { reason: RefundReason; status: RefundRequest["status"]; hoursAgo: number; spent?: boolean; changed?: boolean; auto?: RefundRequest["auto"]; signers?: UserRef[] }) {
  if (!inv) return;
  const stage = o.auto === "duplicate" ? "duplicate" : stageOf(inv.caseRef);
  const s = refundSuggestion(inv, stage === "completed" ? "submitted" : stage, POLICY.refundPolicyBps, o.spent ?? true);
  const amount = s.total || inv.totals.total;
  const client = clientOf(inv.clientId);
  let chain = refundChain(amount, { destinationChanged: o.changed });
  (o.signers ?? []).forEach((u, k) => (chain = sign(chain, u, at(-o.hoursAgo + k + 1))));
  const r: R = {
    no: seq.next("RFD", YEAR), caseRef: inv.caseRef!, invoiceNo: inv.no!, reason: o.reason, stage, requested: amount,
    recommended: o.signers?.length ? amount : undefined, method: "original",
    destination: { masked: tail4(client.phone), changed: !!o.changed }, status: o.status, chain,
    requestedBy: { id: client.id, name: client.name }, impact: [], auto: o.auto, at: at(-o.hoursAgo), rev: 1,
    eligiblePart: s.eligiblePart, passThroughRefunded: s.passThrough, note: o.changed ? "Client asked to be paid to a new MoMo number." : undefined,
  };
  refunds.push(r);
  return r;
}
seedRefund(paid[0], { reason: "cancelled_before_work", status: "requested", hoursAgo: 5, spent: false, auto: "cancelled" });
seedRefund(paid[1], { reason: "service_not_delivered", status: "under_review", hoursAgo: 30 });
seedRefund(paid[2], { reason: "quality_dispute", status: "awaiting_executive", hoursAgo: 52, changed: true, signers: [USERS.sm, USERS.finance2] });
const done = seedRefund(paid[3], { reason: "duplicate_payment", status: "refunded", hoursAgo: 120, auto: "duplicate", spent: false, signers: [USERS.sm, USERS.finance2] });
const rej = seedRefund(paid[4], { reason: "other", status: "rejected", hoursAgo: 200 });
if (rej) rej.rejectReason = "Work was delivered and accepted by the client.";
if (done) {
  const cn = issueCreditNote(done, USERS.finance2, at(-100));
  Object.assign(done, { executedBy: USERS.finance, providerRef: "MPR26014417", approved: done.requested, creditNoteNo: cn.no });
}

// ---------------------------------------------------------------- impact + credit note
function impactOf(r: R): ImpactRow[] {
  const al = ALLOCATIONS.find((a) => a.caseRef === r.caseRef);
  if (!al) return [];
  const inv = invoiceOf(r.invoiceNo)!;
  const full = (r.approved ?? r.recommended ?? r.requested) >= inv.totals.total;
  return al.shares.map((s) => {
    // Full refund before payout voids the allocation instead of adjusting it (plan U12 what-if).
    const voided = full && al.status !== "paid";
    const rev = voided ? -s.amount : Math.round(reversal(r.eligiblePart ?? 0, al.agentPct) * (s.pct / 10_000));
    return { workerId: s.workerId, name: agentOf(s.workerId)?.name ?? s.workerId, allocated: s.amount, reversal: rev, net: s.amount + rev, paidOut: al.status === "paid", voided };
  });
}
function issueCreditNote(r: R, by: UserRef, when: string): CreditNote {
  const inv = invoiceOf(r.invoiceNo)!;
  const lines = creditNoteLines({ eligiblePart: r.eligiblePart ?? 0, passThrough: r.passThroughRefunded ?? 0 }, `Credit · ${r.no}`);
  const totals = docTotals(lines);
  const cn: CreditNote = { no: seq.next("CN", YEAR), invoiceNo: inv.no!, refundNo: r.no, lines, totals, eligible: totals.eligible, issuedBy: by, issuedAt: when };
  CREDIT_NOTES.unshift(cn);
  inv.amountCredited += -totals.total;
  inv.status = "credited"; inv.rev++;
  return cn;
}
/** Allocation side effects once the refund is approved (REV F-RFD-05, D-16 adjustments inherit the refund approval). */
function applyImpact(r: R) {
  const al = ALLOCATIONS.find((a) => a.caseRef === r.caseRef);
  if (!al) return;
  const rows = impactOf(r);
  if (rows.some((x) => x.voided)) { const before = { status: al.status }; al.status = "voided"; record("allocation.adjusted", "allocation", al.id, before, { status: al.status }, r.no); return; }
  for (const x of rows) {
    if (!x.reversal) continue;
    ADJUSTMENTS.push({ id: `adj-${r.no}-${x.workerId}`, workerId: x.workerId, allocationId: al.id, refundNo: r.no, amount: x.reversal, reason: "refund", note: r.no, status: "approved" });
    record("allocation.adjusted", "allocation", al.id, { share: x.allocated }, { reversal: x.reversal, refundNo: r.no }, r.no);
  }
}

// ---------------------------------------------------------------- read models
const limit = () => POLICY.refundExecLimit;
const amountOf = (r: R) => r.approved ?? r.recommended ?? r.requested;
const tierOf = (r: R) => (r.chain.some((s) => s.role === "executive") ? "executive" : "finance") as RefundRow["tier"];
const signCheck = (r: R, a: Actor) => canSign(r.chain, a, [r.requestedBy.id, ...(r.adjustedBy ? [r.adjustedBy.id] : [])]);
const awaitingFinance = (r: R) => r.status === "recommended" || r.status === "awaiting_executive";
const mine = (r: R, a: Actor) => awaitingFinance(r) && signCheck(r, a).ok;
const view = (r: R, a = actor()): RefundRow => ({
  ...(r as RefundRow), clientName: clientOf(invoiceOf(r.invoiceNo)!.clientId).name, tier: tierOf(r), mine: mine(r, a),
  eligiblePart: r.eligiblePart ?? 0, passThroughRefunded: r.passThroughRefunded ?? 0,
});
const TAB: Record<Exclude<RefundTab, "credit_notes" | "awaiting_me">, RefundRequest["status"][]> = {
  requested: ["requested"], in_review: ["under_review"], awaiting_executive: ["awaiting_executive"],
  executing: ["approved", "credited", "executing", "execution_failed"], completed: ["refunded", "completed_as_credit"], rejected: ["rejected", "withdrawn"],
};
const inTab = (r: R, t: RefundTab, a: Actor) => (t === "awaiting_me" ? mine(r, a) : t === "credit_notes" ? false : TAB[t].includes(r.status));
/** Disbursement mock: resolves ~6 s after execute; the simulator can make the next one fail. */
let failNext = false;
function settle(r: R) {
  if (r.status !== "executing" || !r.execStartedAt || Date.now() - Date.parse(r.execStartedAt) < 6000) return;
  const before = { status: r.status };
  if (failNext) { failNext = false; r.status = "execution_failed"; r.failReason = "Provider timeout: the disbursement was not accepted. No money left HEBUZA."; }
  else { r.status = "refunded"; r.providerRef = `MPR${26_000_000 + r.rev * 7919}`; r.failReason = undefined; }
  touch(r);
  record(r.status === "refunded" ? "refund.paid" : "refund.execution_failed", "refund", r.no, before, { status: r.status, providerRef: r.providerRef }, r.failReason);
}
function refundOf(no: string) {
  const r = refunds.find((x) => x.no === no);
  if (!r) throw new FinError(404, "not_found");
  settle(r);
  return r;
}
const locked = () => LOCKS.some((l) => l.day === today() && l.state === "closed");
const checkRev = (r: R, rev: unknown) => { if (typeof rev === "number" && rev !== r.rev) throw new FinError(409, "version_conflict"); };
const refundable = (r: R) => { const inv = invoiceOf(r.invoiceNo)!; return inv.totals.total - inv.amountCredited; };

function detail(r: R) {
  const a = actor();
  const inv = invoiceOf(r.invoiceNo)!;
  const check = signCheck(r, a);
  const open = ["requested", "under_review", "recommended", "awaiting_executive"].includes(r.status);
  const cn = CREDIT_NOTES.find((c) => c.refundNo === r.no) ?? null;
  return {
    refund: view(r, a), invoice: inv, policy: POLICY.refundPolicyBps, refundable: refundable(r), limit: limit(), impact: impactOf(r),
    payer: { masked: tail4(clientOf(inv.clientId).phone) }, creditNote: cn, locked: locked(),
    can: {
      sign: awaitingFinance(r) && check.ok, signReason: check.ok ? undefined : check.reason,
      execute: (r.status === "credited" || r.status === "execution_failed") && canExecute(r.chain, a),
      adjust: isFinanceUser(a) && r.status === "recommended",
      reject: open && (isFinanceUser(a) || (isExec(a) && r.status === "awaiting_executive") || (isSm(a) && r.status !== "recommended")),
      review: isSm(a) && (r.status === "requested" || r.status === "under_review"),
    },
  };
}

// ---------------------------------------------------------------- receivables (U11)
const reminders = new Map<string, Reminder[]>();
const notes = new Map<string, ArNote[]>();
// Mock consent per client (F-SET-09): Nyamirambo Tailors never opted into WhatsApp; Rwandan Ltd has no SMS.
const CONSENT: Record<string, Partial<Record<Channel, boolean>>> = { "cl-nyt": { whatsapp: false }, "cl-rwl": { sms: false } };
const consentOf = (id: string): Record<Channel, boolean> => ({ email: true, whatsapp: true, sms: true, ...CONSENT[id] });
notes.set("cl-kff", [{ id: "n-1", at: at(-50), by: USERS.finance2.name, text: "Accounts promised payment after their month-end run.", promiseAt: at(24 * 6).slice(0, 10) }]);
const open = () => INVOICES.filter((i) => i.no && i.balanceDue > 0 && i.dueAt && !["void", "draft", "paid_by_plan"].includes(i.status));
const lastOf = (xs: Reminder[]) => xs.reduce<Reminder | undefined>((m, x) => (!m || x.at > m.at ? x : m), undefined);
function clientRow(clientId: string) {
  const invs = open().filter((i) => i.clientId === clientId);
  const buckets = ageingSummary(invs, today());
  const oldestDays = Math.max(0, ...invs.map((i) => daysPastDue(i.dueAt!, today())));
  const outstanding = BUCKETS.reduce((s, b) => s + buckets[b], 0);
  const credit = refunds.filter((r) => r.status === "completed_as_credit" && invoiceOf(r.invoiceNo)?.clientId === clientId).reduce((s, r) => s + amountOf(r), 0);
  const ns = notes.get(clientId) ?? [];
  const promise = ns.find((n) => n.promiseAt);
  const c = clientOf(clientId);
  return {
    clientId, name: c.name, language: c.language as Locale, outstanding, buckets, oldestDays,
    bucket: [...BUCKETS].reverse().find((b) => buckets[b] > 0) ?? ("not_due" as Bucket), credit, invoices: invs.length,
    lastReminder: lastOf(invs.flatMap((i) => reminders.get(i.no!) ?? [])), promise: promise && { at: promise.promiseAt!, note: promise.text },
  };
}
/** Kigali quiet hours 21:00–07:00 (SET F-SET-09): messages queue for 07:00. */
function quietUntil(now = new Date()) {
  const h = (now.getUTCHours() + 2) % 24;
  if (h >= 7 && h < 21) return undefined;
  const d = new Date(now.getTime() + (h >= 21 ? 24 - h + 7 : 7 - h) * H);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------- handlers
const run = (fn: () => Response) => { try { return fn(); } catch (e) { return failFrom(e); } };
const body = async <T,>(r: Request) => { try { return (await r.json()) as T; } catch { return {} as T; } };

export const handlers = [
  // ---- U11
  http.get("/api/finance/reports/receivables-ageing", async () => {
    await delay(250);
    const g = guard(true);
    if (g) return g;
    const all = open();
    const b = ageingSummary(all, today());
    const clients = [...new Set(all.map((i) => i.clientId))].map(clientRow).sort((x, y) => y.outstanding - x.outstanding);
    return ok({ asOf: new Date().toISOString(), total: BUCKETS.reduce((s, k) => s + b[k], 0), overdue31: b["31_60"] + b["61_90"] + b["90_plus"], due0_30: b["0_30"], over90: b["90_plus"], buckets: b, clients });
  }),
  http.get("/api/finance/x/receivables/clients/:id", async ({ params }) => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    const id = String(params.id);
    const c = (() => { try { return clientOf(id); } catch { return undefined; } })();
    if (!c) return fail(404, "not_found", "No such client.");
    const invs = INVOICES.filter((i) => i.clientId === id && i.no && i.status !== "draft");
    return ok({
      client: { id, name: c.name, type: c.type, phone: tail4(c.phone), email: c.email.replace(/^(.).*@/, "$1•••@"), language: c.language, consent: consentOf(id) },
      summary: clientRow(id),
      invoices: invs.map((i) => ({ ...i, bucket: i.dueAt ? ageingBucket(i.dueAt, today()) : "not_due", days: i.dueAt ? daysPastDue(i.dueAt, today()) : 0, reminders: reminders.get(i.no!) ?? [] })),
      payments: PAYMENTS.filter((p) => p.clientId === id),
      credits: CREDIT_NOTES.filter((n) => invs.some((i) => i.no === n.invoiceNo)),
      notes: notes.get(id) ?? [],
    });
  }),
  http.post("/api/finance/invoices/:no/remind", async ({ request, params }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ channel: Channel; lang: Locale; text: string }>(request);
    return idempotent(request, () => run(() => {
      const inv = invoiceOf(String(params.no));
      if (!inv) throw new FinError(404, "not_found");
      if (inv.balanceDue <= 0 || inv.status === "void") throw new FinError(409, "invoice_settled");
      if (!b.text?.trim() || !["email", "whatsapp", "sms"].includes(b.channel)) throw new FinError(422, "validation");
      if (!consentOf(inv.clientId)[b.channel]) throw new FinError(422, "no_consent");
      if (b.channel === "sms" && b.text.length > 320) throw new FinError(422, "validation");
      const rem: Reminder = { at: new Date().toISOString(), channel: b.channel, lang: b.lang, by: actor().name, scheduledFor: quietUntil() };
      reminders.set(inv.no!, [rem, ...(reminders.get(inv.no!) ?? [])]);
      record("invoice.reminder_sent", "invoice", inv.no!, null, { channel: rem.channel, lang: rem.lang, scheduledFor: rem.scheduledFor });
      return ok(rem);
    }));
  }),
  http.post("/api/finance/x/receivables/clients/:id/notes", async ({ request, params }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ text: string; promiseAt?: string }>(request);
    return idempotent(request, () => run(() => {
      if (!b.text?.trim()) throw new FinError(422, "reason_required");
      if (b.promiseAt && b.promiseAt < today()) throw new FinError(422, "retroactive");
      const n: ArNote = { id: `n-${Date.now()}`, at: new Date().toISOString(), by: actor().name, text: b.text.trim(), promiseAt: b.promiseAt || undefined };
      notes.set(String(params.id), [n, ...(notes.get(String(params.id)) ?? [])]);
      record("receivable.note_added", "client", String(params.id), null, { promiseAt: n.promiseAt }, n.text);
      return ok(n);
    }));
  }),

  // ---- U12 refunds
  http.get("/api/finance/refund-requests", async ({ request }) => {
    await delay(220);
    const a = actor();
    if (!isFinanceUser(a) && !isExec(a) && !isSm(a)) return fail(403, "forbidden", "Finance only.");
    refunds.forEach(settle);
    const q = new URL(request.url).searchParams;
    const tab = (q.get("tab") ?? "awaiting_me") as RefundTab;
    const caseRef = q.get("case");
    const tabs: RefundTab[] = ["awaiting_me", "requested", "in_review", "awaiting_executive", "executing", "completed", "rejected"];
    const counts = Object.fromEntries(tabs.map((t) => [t, refunds.filter((r) => inTab(r, t, a)).length])) as Record<RefundTab, number>;
    counts.credit_notes = CREDIT_NOTES.length;
    const items = (caseRef ? refunds.filter((r) => r.caseRef === caseRef) : refunds.filter((r) => inTab(r, tab, a))).sort((x, y) => y.at.localeCompare(x.at));
    return ok({ items: items.map((r) => view(r, a)), counts });
  }),
  http.get("/api/finance/x/refundable-invoices", async () => {
    await delay(150);
    const g = guard();
    if (g) return g;
    const items = INVOICES.filter((i) => i.no && i.amountPaid > 0 && i.totals.total - i.amountCredited > 0 && !refunds.some((r) => r.invoiceNo === i.no && !["rejected", "withdrawn", "refunded", "completed_as_credit"].includes(r.status)))
      .map((i) => ({ no: i.no!, clientName: clientOf(i.clientId).name, refundable: i.totals.total - i.amountCredited }));
    return ok({ items });
  }),
  http.post("/api/finance/refund-requests", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ invoiceNo: string; reason: RefundReason; note: string }>(request);
    return idempotent(request, () => run(() => {
      const inv = invoiceOf(b.invoiceNo);
      if (!inv || !inv.caseRef) throw new FinError(404, "not_found");
      if (!b.reason || !b.note?.trim()) throw new FinError(422, "reason_required");
      if (inv.amountPaid <= 0) throw new FinError(422, "validation");
      if (refunds.some((r) => r.invoiceNo === inv.no && ["requested", "under_review", "recommended", "awaiting_executive", "approved", "credited", "executing", "execution_failed"].includes(r.status)))
        throw new FinError(409, "refund_open");
      const stage = b.reason === "duplicate_payment" ? "duplicate" : stageOf(inv.caseRef);
      const s = refundSuggestion(inv, stage);
      const amount = Math.min(s.total, inv.totals.total - inv.amountCredited);
      const client = clientOf(inv.clientId);
      const r: R = {
        no: seq.next("RFD", YEAR), caseRef: inv.caseRef, invoiceNo: inv.no!, reason: b.reason, stage, requested: amount, method: "original",
        destination: { masked: tail4(client.phone), changed: false }, status: "requested",
        chain: refundChain(amount), requestedBy: me(), impact: [], at: new Date().toISOString(), rev: 1,
        eligiblePart: s.eligiblePart, passThroughRefunded: s.passThrough, note: b.note.trim(),
      };
      refunds.unshift(r);
      record("refund.requested", "refund", r.no, null, { amount, onBehalfOf: client.name }, b.note);
      return ok(view(r));
    }));
  }),
  http.get("/api/finance/refund-requests/:no", async ({ params }) => {
    await delay(220);
    const a = actor();
    if (!isFinanceUser(a) && !isExec(a) && !isSm(a)) return fail(403, "forbidden", "Finance only.");
    return run(() => ok(detail(refundOf(String(params.no)))));
  }),
  // SM recommendation (ops panel). Signs the first chain step.
  http.post("/api/finance/refund-requests/:no/review", async ({ request, params }) => {
    if (!isSm(actor())) return fail(403, "forbidden", "Service managers only.");
    const b = await body<{ decision: "recommend" | "reject"; amount?: number; note: string; rev?: number }>(request);
    return idempotent(request, () => run(() => {
      const r = refundOf(String(params.no));
      checkRev(r, b.rev);
      if (r.status === "requested") r.status = "under_review";
      const to = b.decision === "reject" ? "rejected" : "recommended";
      if (!canMove("refund", r.status, to)) throw new FinError(409, "conflict");
      if (!b.note?.trim()) throw new FinError(422, "reason_required");
      const before = { status: r.status, recommended: r.recommended };
      if (to === "recommended") {
        const amount = Math.round(b.amount ?? r.requested);
        if (amount <= 0 || exceedsRefundable(amount, invoiceOf(r.invoiceNo)!.totals.total, invoiceOf(r.invoiceNo)!.amountCredited)) throw new FinError(422, "exceeds_refundable");
        r.recommended = amount;
        Object.assign(r, partsOf(invoiceOf(r.invoiceNo)!, amount, (r.passThroughRefunded ?? 0) === 0));
        r.chain = sign(refundChain(amount, { destinationChanged: destChanged(r) }), me(), new Date().toISOString());
      } else r.rejectReason = b.note.trim();
      r.status = to;
      touch(r);
      record(`refund.${to}`, "refund", r.no, before, { status: r.status, recommended: r.recommended }, b.note, "financial");
      return ok(view(r));
    }));
  }),
  // Finance edits amount/method/destination → chain re-runs; the editor becomes a maker and can no longer sign.
  http.post("/api/finance/refund-requests/:no/adjust", async ({ request, params }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ amount: number; spent: boolean; method: RefundMethod; destination?: string; note: string; rev: number }>(request);
    return idempotent(request, () => run(() => {
      const r = refundOf(String(params.no));
      checkRev(r, b.rev);
      if (r.status !== "recommended") throw new FinError(409, "conflict");
      if (!b.note?.trim()) throw new FinError(422, "reason_required");
      const inv = invoiceOf(r.invoiceNo)!;
      const amount = Math.round(Number(b.amount));
      if (!(amount > 0) || exceedsRefundable(amount, inv.totals.total, inv.amountCredited)) throw new FinError(422, "exceeds_refundable");
      const before = { amount: r.recommended, method: r.method, destination: r.destination?.masked };
      const dest = b.destination?.replace(/\D/g, "");
      if (dest && dest.length < 9) throw new FinError(422, "validation");
      if (r.recommended !== amount) r.changedFrom = r.changedFrom ?? r.recommended;
      r.recommended = amount;
      r.method = b.method;
      if (dest) r.destination = { masked: `•••• ${dest.slice(-4)}`, changed: true };
      Object.assign(r, partsOf(inv, amount, b.spent));
      r.chain = rechain(r, amount);
      r.adjustedBy = me();
      r.note = b.note.trim();
      touch(r);
      record("refund.adjusted", "refund", r.no, before, { amount, method: r.method, destination: r.destination?.masked, chain: r.chain.map((s) => s.role).join(" → ") }, b.note);
      return ok(view(r));
    }));
  }),
  http.post("/api/finance/refund-requests/:no/approve", async ({ request, params }) => {
    const a = actor();
    if (!isFinanceUser(a) && !isExec(a)) return fail(403, "forbidden", "Finance only.");
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ rev: number }>(request);
    return idempotent(request, () => run(() => {
      const r = refundOf(String(params.no));
      checkRev(r, b.rev);
      if (!awaitingFinance(r)) throw new FinError(409, "conflict");
      if (locked()) throw new FinError(409, "period_locked");
      const c = signCheck(r, a);
      if (!c.ok) throw new FinError(403, c.reason === "same_approver" ? "same_approver" : "forbidden");
      const inv = invoiceOf(r.invoiceNo)!;
      if (exceedsRefundable(amountOf(r), inv.totals.total, inv.amountCredited)) throw new FinError(422, "exceeds_refundable");
      const before = { status: r.status };
      const when = new Date().toISOString();
      r.chain = sign(r.chain, me(), when);
      if (!chainComplete(r.chain)) {
        r.status = "awaiting_executive";
        touch(r);
        record("refund.needs_executive", "refund", r.no, before, { status: r.status });
        return ok(view(r));
      }
      r.status = "approved";
      r.approved = amountOf(r);
      record("refund.approved", "refund", r.no, before, { status: r.status, approved: r.approved });
      const cn = issueCreditNote(r, me(), when);
      r.creditNoteNo = cn.no;
      r.status = "credited";
      record("credit_note.issued", "credit_note", cn.no, null, { total: cn.totals.total, refundNo: r.no });
      applyImpact(r);
      if (r.method === "credit") { r.status = "completed_as_credit"; record("refund.completed_as_credit", "refund", r.no, { status: "credited" }, { status: r.status }); }
      touch(r);
      return ok(view(r));
    }));
  }),
  http.post("/api/finance/refund-requests/:no/reject", async ({ request, params }) => {
    const a = actor();
    if (!isFinanceUser(a) && !isExec(a) && !isSm(a)) return fail(403, "forbidden", "Finance only.");
    const b = await body<{ reason: string; note: string; rev: number }>(request);
    return idempotent(request, () => run(() => {
      const r = refundOf(String(params.no));
      checkRev(r, b.rev);
      if (!["requested", "under_review", "recommended", "awaiting_executive"].includes(r.status)) throw new FinError(409, "conflict");
      if (!b.reason) throw new FinError(422, "reason_required");
      const before = { status: r.status };
      r.status = "rejected";
      r.rejectReason = [b.reason, b.note].filter(Boolean).join(" · ");
      touch(r);
      record("refund.rejected", "refund", r.no, before, { status: r.status }, r.rejectReason);
      return ok(view(r));
    }));
  }),
  http.post("/api/finance/refund-requests/:no/execute", async ({ request, params }) => {
    const g = guard();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ rev: number; method: RefundMethod; proofName?: string }>(request);
    // Same Idempotency-Key on retry → the first response replays; a failed run needs a fresh key (never double-pays).
    return idempotent(request, () => run(() => {
      const r = refundOf(String(params.no));
      checkRev(r, b.rev);
      if (!canExecute(r.chain, actor())) throw new FinError(403, "same_approver");
      if (r.status !== "credited" && r.status !== "execution_failed") throw new FinError(409, "conflict");
      if (b.method === "credit") throw new FinError(422, "validation");
      if (b.method === "bank" && !b.proofName) throw new FinError(422, "validation");
      const before = { status: r.status, method: r.method };
      r.method = b.method ?? r.method;
      r.executedBy = me();
      if (r.method === "bank") { r.status = "refunded"; r.proofDocId = `doc-${b.proofName}`; record("refund.paid", "refund", r.no, before, { status: r.status, proof: b.proofName }); }
      else { r.status = "executing"; r.execStartedAt = new Date().toISOString(); record("refund.executing", "refund", r.no, before, { status: r.status, method: r.method }); }
      touch(r);
      return ok(view(r));
    }));
  }),

  // ---- credit notes
  http.get("/api/finance/credit-notes", async () => {
    await delay(200);
    const g = guard(true);
    return g ?? ok({ items: CREDIT_NOTES.map(cnView) });
  }),
  http.get("/api/finance/credit-notes/:no", async ({ params }) => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    const cn = CREDIT_NOTES.find((c) => c.no === String(params.no));
    return cn ? ok(cnView(cn)) : fail(404, "not_found", "No such credit note.");
  }),

  // ---- simulate (MockSimulator on the refunds page)
  http.post("/api/finance/x/simulate/refund-request", async () => {
    const g = guard();
    if (g) return g;
    const inv = INVOICES.find((i) => i.status === "paid" && i.caseRef && !refunds.some((r) => r.invoiceNo === i.no));
    if (!inv) return fail(409, "conflict", "No paid invoice left to refund.");
    const r = seedRefund(inv, { reason: "cancelled_before_work", status: "requested", hoursAgo: 0, spent: false })!;
    record("refund.requested", "refund", r.no, null, { amount: r.requested }, "simulated client request");
    return ok(view(r));
  }),
  http.post("/api/finance/x/simulate/refund-fail-next", async () => {
    const g = guard();
    if (g) return g;
    failNext = true;
    return ok({ failNext });
  }),
];

function cnView(cn: CreditNote) {
  const inv = invoiceOf(cn.invoiceNo)!;
  const r = refunds.find((x) => x.no === cn.refundNo);
  return {
    ...cn, clientName: clientOf(inv.clientId).name, refund: r && view(r), invoiceTotal: inv.totals.total,
    outcome: r?.method === "credit" ? "credit" : r && r.status !== "credited" ? "refund" : "balance",
  };
}

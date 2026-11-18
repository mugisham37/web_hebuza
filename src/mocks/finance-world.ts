// Stage 5 finance mock world (plan 05 §9.4). Sits on top of ops-world (cases, clients, agents) — never copies it.
// Every amount goes through src/lib/finance/money.ts; every mutation goes through `record()` → the shared audit store.
// shortcut: in-memory per tab session; upgrade per endpoint as /api/finance/* ships.
import { CASES, CLIENTS, AGENTS, serviceOf, clientOf, type OpsCase } from "./ops-world";
import { POLICY } from "@/shared/policy";
import { audit } from "./audit";
import { currentPersona } from "./personas";
import type { Role } from "@/shared/auth/roles";
import { applyBps } from "@/shared/money";
import { allocate, docTotals, refundSuggestion, reversal, splitPool, payoutLine } from "@/lib/finance/money";
import { manualChain, refundChain, settingChain, canSign, sign } from "@/shared/finance/approvals";
import { createSequences, batchNo } from "@/shared/finance/numbering";
import { resolveRule } from "@/shared/finance/rules";
import { isRetroactive } from "@/shared/finance/rules";
import { isOverdue } from "@/lib/finance/states";
import type {
  Adjustment, AgentFee, Allocation, ApprovalItem, DocLine, FinNote, FinSummary, FinanceSettingKey, Invoice, Method, Payment,
  PayoutBatch, PeriodLock, RefundRequest, Rule, SettingChange, SettingRow, StatementImport, StatementLine, UserRef, CreditNote, Quote,
} from "@/shared/finance/types";

const H = 3600_000;
export const NOW = Date.now(); // read once at load (deterministic per session, never in render)
const at = (hours: number) => new Date(NOW + hours * H).toISOString();
export const today = () => new Date(NOW).toISOString().slice(0, 10);
const YEAR = new Date(NOW).getUTCFullYear();

// ---------------------------------------------------------------- people (§0.2)
export const USERS = {
  finance: { id: "mock-finance", name: "Patrick Niyonzima" },
  finance2: { id: "mock-finance2", name: "Solange Mukeshimana" },
  exec: { id: "mock-exec", name: "Alice Mutoni" },
  sm: { id: "mock-sm", name: "Diane Mukamana" },
} satisfies Record<string, UserRef>;
export type Actor = UserRef & { roles: Role[] };
/** The signed-in persona; Patrick (finance) when none (node unit tests). */
export function actor(): Actor {
  const p = currentPersona();
  return p ? { id: `mock-${p.key}`, name: p.name, roles: p.roles } : { ...USERS.finance, roles: ["staff:finance"] };
}
export const isFinanceUser = (a: Actor) => a.roles.includes("staff:finance");
export const isExecOnly = (a: Actor) => !isFinanceUser(a) && a.roles.includes("staff:executive");

/** Audit row for a finance mutation (AUD §6). Call only after every guard passed, so a rejected change leaves no row. */
export function record(action: string, kind: string, id: string, before: unknown, after: unknown, reason?: string, category = "financial") {
  return audit({ actor: actor().name, action: `${category}.${action}`, entity: { kind, id }, before, after, reason });
}

// ---------------------------------------------------------------- sequences (A-4)
export const seq = createSequences({ [`RFD-${YEAR}`]: 44 }); // RFD-…-00001..44 issued by Stage 2 flows

// ---------------------------------------------------------------- rules (W8 shape)
export const RULES: Rule[] = [
  { id: "r-global", scope: "global", agentPct: POLICY.defaultAgentBps, appliesTo: "both", from: "2026-01-01", status: "active" },
  { id: "r-vat", scope: "service", serviceSlug: "vat-declaration", agentPct: 3500, appliesTo: "one_off", from: "2026-06-01", status: "active", approvedBy: USERS.exec },
  { id: "r-eric-vat", scope: "agent_service", agentId: "ag-eric", serviceSlug: "vat-declaration", agentPct: 4000, appliesTo: "one_off", from: `${YEAR + 1}-01-01`, status: "scheduled", approvedBy: USERS.exec },
];

// ---------------------------------------------------------------- invoices
const W1_LINES: DocLine[] = [
  { kind: "service_fee", label: "Company registration · standard tier", qty: 1, unit: 50_000 },
  { kind: "urgent_surcharge", label: "Urgent surcharge 20%", qty: 1, unit: 10_000 },
  { kind: "government_fee", label: "RDB registration fee", qty: 1, unit: 0 },
  { kind: "third_party_cost", label: "Notary", qty: 1, unit: 10_000 },
];
/** The ops refund_requested case drives J2 (W1 invoice → RFD-…-00045). */
export const W1_CASE = CASES.find((c) => c.status === "refund_requested")!;

function linesFor(c: OpsCase): DocLine[] {
  if (c === W1_CASE) return W1_LINES;
  const fee = c.amount ?? 0;
  const l: DocLine[] = [{ kind: "service_fee", label: serviceOf(c.service).name, qty: 1, unit: fee }];
  if (c.flags.includes("urgent")) l.push({ kind: "urgent_surcharge", label: "Urgent surcharge 20%", qty: 1, unit: applyBps(fee, 2000) });
  return l;
}
const billTo = (clientId: string) => {
  const c = clientOf(clientId);
  return { name: c.name, email: c.email };
};
function mkInvoice(o: { clientId: string; caseRef?: string; lines: DocLine[]; issuedAt: string; paid: "paid" | "partial" | "unpaid" | "covered" }): Invoice {
  const totals = o.paid === "covered" ? docTotals([]) : docTotals(o.lines);
  const amountPaid = o.paid === "paid" ? totals.total : o.paid === "partial" ? Math.floor(totals.total / 2) : 0;
  const inv: Invoice = {
    no: seq.next("INV", new Date(o.issuedAt).getUTCFullYear()), series: o.paid === "covered" ? "plan" : "standard",
    caseRef: o.caseRef, clientId: o.clientId, billTo: billTo(o.clientId),
    status: o.paid === "covered" ? "paid_by_plan" : o.paid === "paid" ? "paid" : o.paid === "partial" ? "partially_paid" : "issued",
    overdue: false, lines: o.lines, totals, amountPaid, amountCredited: 0, balanceDue: totals.total - amountPaid,
    issuedAt: o.issuedAt, dueAt: new Date(Date.parse(o.issuedAt) + POLICY.invoiceTermsDays * 24 * H).toISOString(), currency: "RWF", rev: 1,
  };
  inv.overdue = isOverdue(inv, today());
  return inv;
}
const priced = [...CASES].filter((c) => c.amount != null).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const INVOICES: Invoice[] = priced.map((c) =>
  mkInvoice({ clientId: c.clientId, caseRef: c.ref, lines: linesFor(c), issuedAt: c.createdAt, paid: c === W1_CASE ? "paid" : c.payment }));
/** Four standalone invoices behind the bank-transfer proofs (600,000 / 472,000 / 320,000 / 1,200,000). */
const PROOF_INVOICES = ([
  ["cl-kff", 500_000, 10_000], ["cl-nyt", 400_000, 0], ["cl-rwl", 250_000, 25_000], ["cl-kff", 1_000_000, 20_000],
] as const).map(([clientId, fee, pt], i) =>
  mkInvoice({
    clientId, issuedAt: at(-24 * (6 - i)), paid: "unpaid",
    lines: [{ kind: "service_fee", label: "Advisory retainer", qty: 1, unit: fee }, ...(pt ? [{ kind: "third_party_cost" as const, label: "Filing disbursements", qty: 1, unit: pt }] : [])],
  }));
INVOICES.push(...PROOF_INVOICES);
export const invoiceOf = (no: string) => INVOICES.find((i) => i.no === no);
export const W1_INVOICE = INVOICES.find((i) => i.caseRef === W1_CASE.ref)!;

// ---------------------------------------------------------------- payments
const METHODS: Method[] = ["mtn_momo", "airtel_money", "card", "bank_transfer"];
let pn = 0;
function mkPayment(inv: Invoice, o: Partial<Payment> & { amount: number; method: Method; state: Payment["state"]; at: string }): Payment {
  const id = `pay-${String(++pn).padStart(4, "0")}`;
  const confirmed = o.state === "confirmed";
  const { amount, ...rest } = o;
  return {
    id, invoiceNo: inv.no!, caseRef: inv.caseRef, clientId: inv.clientId, amountExpected: amount, amountReceived: confirmed ? amount : undefined,
    providerRef: o.method === "bank_transfer" ? undefined : `${o.method === "mtn_momo" ? "MP" : o.method === "airtel_money" ? "AM" : "CD"}${26_000_000 + pn * 7919}`,
    bankReference: o.method === "bank_transfer" ? `BK FT${26_300 + pn}${"QXZ"[pn % 3]}` : undefined,
    // Demo provider fee (D8): synthetic 1%, recorded separately, never touches the eligible fee (D-09).
    providerFee: confirmed && o.method !== "bank_transfer" ? applyBps(amount, 100) : undefined,
    events: [{ at: o.at, kind: o.state, source: confirmed ? "webhook" : "client" }],
    receiptNo: confirmed ? seq.next("RCPT", new Date(o.at).getUTCFullYear()) : undefined, rev: 1, ...rest,
  };
}
export const PAYMENTS: Payment[] = [];
INVOICES.forEach((inv, i) => {
  if (inv.amountPaid > 0) PAYMENTS.push(mkPayment(inv, { amount: inv.amountPaid, method: METHODS[i % 4], state: "confirmed", at: at(-24 * (i % 14) - 2) }));
});
// Duplicate 80,800 on the already-paid W1 invoice (recon case 6 → auto refund proposal).
PAYMENTS.push(mkPayment(W1_INVOICE, { amount: W1_INVOICE.totals.total, method: "mtn_momo", state: "confirmed", at: at(-30), duplicate: true }));
// Two MoMo payments with missed webhooks (verify schedule).
INVOICES.filter((i) => i.status === "issued" && i.caseRef).slice(0, 2).forEach((inv, k) =>
  PAYMENTS.push(mkPayment(inv, { amount: inv.balanceDue, method: "mtn_momo", state: "pending_provider", at: at(-0.5 - k), verify: { nextAt: at(5 / 60), cadence: "5m" } })));
// Four bank proofs, unique references (board 06 fix).
PROOF_INVOICES.forEach((inv, k) =>
  PAYMENTS.push(mkPayment(inv, {
    amount: inv.balanceDue, method: "bank_transfer", state: "proof_submitted", at: at(-3 - k * 5), proofDocId: `doc-proof-${k + 1}`,
    chain: manualChain(inv.balanceDue), makerId: inv.clientId,
  })));
export const paymentOf = (id: string) => PAYMENTS.find((p) => p.id === id);

// ---------------------------------------------------------------- allocations (trigger: delivered + paid + no dispute)
const workerKind = (id: string) => ((AGENTS.find((a) => a.id === id) as { external?: boolean } | undefined)?.external ? "external" : "internal") as "internal" | "external";
export function buildAllocation(c: OpsCase, n: number, status: Allocation["status"]): Allocation {
  const invs = INVOICES.filter((i) => i.caseRef === c.ref);
  const eligible = invs.reduce((s, i) => s + i.totals.eligible, 0);
  const rule = resolveRule(RULES, { agentId: c.assignees.find((a) => a.role === "lead")?.id, serviceSlug: c.service, date: c.updatedAt });
  const { netBase, pool, hebuza } = allocate(eligible, [], rule.agentPct);
  const split = c.assignees.length > 1 ? c.assignees.map((a) => ({ workerId: a.id, bps: a.role === "lead" ? 7000 : 3000 })) : c.assignees.map((a) => ({ workerId: a.id, bps: 10_000 }));
  const amounts = splitPool(pool, split);
  return {
    id: `al-${String(n).padStart(4, "0")}`, caseRef: c.ref, invoiceNos: invs.map((i) => i.no!), eligible, deductions: [], netBase,
    ruleId: rule.id, agentPct: rule.agentPct, pool, hebuza,
    shares: split.map((s, i) => ({ workerId: s.workerId, kind: workerKind(s.workerId), pct: s.bps, amount: amounts[i].amount })),
    status, frozenAt: c.updatedAt, ...(status !== "pending_review" && { reviewedBy: USERS.sm }),
  };
}
const ALLOC_STATES: Allocation["status"][] = ["pending_review", "reviewed", "approved_for_payment"];
export const ALLOCATIONS: Allocation[] = [
  { ...buildAllocation(W1_CASE, 1, "paid"), approvedBy: USERS.finance, batchNo: batchNo(YEAR, 10) },
  ...CASES.filter((c) => c.status === "completed_delivered").map((c, i) => buildAllocation(c, i + 2, ALLOC_STATES[i % 3])),
];
/** Agent-side view (REV AC: an agent sees only their own shares). */
export const allocationsFor = (workerId: string) => ALLOCATIONS.filter((a) => a.shares.some((s) => s.workerId === workerId));

// ---------------------------------------------------------------- refunds & credit notes
const w1Alloc = ALLOCATIONS[0];
const w1Refund = refundSuggestion(W1_INVOICE, "in_progress"); // 30,000 + 5,400 + 0 = 35,400 (W5)
export const REFUNDS: RefundRequest[] = [{
  no: seq.next("RFD", YEAR), caseRef: W1_CASE.ref, invoiceNo: W1_INVOICE.no!, paymentId: PAYMENTS.find((p) => p.invoiceNo === W1_INVOICE.no && !p.duplicate)?.id,
  reason: "quality_dispute", stage: "in_progress", requested: w1Refund.total, recommended: w1Refund.total, method: "original",
  destination: { masked: "•••• 0214", changed: false }, status: "recommended",
  chain: sign(refundChain(w1Refund.total), USERS.sm, at(-20)), requestedBy: { id: W1_CASE.clientId, name: clientOf(W1_CASE.clientId).name },
  impact: w1Alloc.shares.map((s) => ({ workerId: s.workerId, allocated: s.amount, reversal: reversal(w1Refund.eligiblePart, w1Alloc.agentPct), paidOut: true })),
  at: at(-26), rev: 1,
}];
export const CREDIT_NOTES: CreditNote[] = [];
export const QUOTES: Quote[] = []; // lane B seeds quote revisions

// ---------------------------------------------------------------- revenue extras, payouts
export const ADJUSTMENTS: Adjustment[] = [];
export const FEES: AgentFee[] = [9, 10, 11].map((m) => ({
  id: `fee-patrick-${m}`, workerId: "ag-patrick", kind: "licensing", amount: POLICY.licenceFeeMonthly, month: `${YEAR}-${String(m).padStart(2, "0")}`, status: m < 11 ? "netted" : "due",
}));
function closedBatch(month: number, lines: { workerId: string; gross: number }[]): PayoutBatch {
  const out = lines.map((l, i) => {
    const external = workerKind(l.workerId) === "external";
    const r = payoutLine({ gross: l.gross, adjustments: 0, fees: external ? POLICY.licenceFeeMonthly : 0, external });
    return { id: `pl-${month}-${i}`, workerId: l.workerId, gross: l.gross, adjustments: 0, fees: r.fees, wht: r.wht, net: r.net, carryForward: r.carryForward,
      method: "mtn_momo" as const, destination: { masked: "•••• 0214", verified: true }, status: "paid" as const, providerRef: `MP${month}0${i}` };
  });
  const sum = (k: "gross" | "adjustments" | "fees" | "wht" | "net" | "carryForward") => out.reduce((s, l) => s + l[k], 0);
  return { no: batchNo(YEAR, month), period: `${YEAR}-${String(month).padStart(2, "0")}`, status: "closed", preparedBy: USERS.finance, authorisedBy: USERS.finance2,
    totals: { gross: sum("gross"), adjustments: sum("adjustments"), fees: sum("fees"), wht: sum("wht"), net: sum("net"), carried: sum("carryForward") }, lines: out, exports: [] };
}
export const BATCHES: PayoutBatch[] = [
  closedBatch(9, [{ workerId: "ag-grace", gross: 21_000 }, { workerId: "ag-patrick", gross: 45_000 }]),
  closedBatch(10, [{ workerId: "ag-eric", gross: w1Alloc.shares[0].amount }, { workerId: "ag-patrick", gross: 60_000 }]),
];

// ---------------------------------------------------------------- reconciliation (lane C fills)
export const IMPORTS: StatementImport[] = [];
export const LINES: StatementLine[] = [];
export const LOCKS: PeriodLock[] = [];

// ---------------------------------------------------------------- settings (SET §7: effective-dated, executive approval)
const SETTING_DEFAULTS: [FinanceSettingKey, unknown, string][] = [
  ["vat_registered", true, "invoices"], ["vat_bps", POLICY.vatBps, "invoices"], ["hebuza_tin", "PLACEHOLDER(hebuza-tin)", "invoices"],
  ["invoice_terms_days", POLICY.invoiceTermsDays, "invoices"], ["quote_validity_days", POLICY.quoteValidityDays, "quotes"],
  ["deposit_threshold", POLICY.depositThreshold, "quotes"], ["deposit_bps", POLICY.depositBps, "quotes"],
  ["manual_confirm_threshold", POLICY.manualConfirmSecondFinance, "payments"], ["manual_confirm_exec", POLICY.manualConfirmExec, "payments"],
  ["refund_exec_limit", POLICY.refundExecLimit, "refunds"], ["wht_bps", POLICY.whtBps, "payouts"], ["payout_day", POLICY.payoutDay, "payouts"],
  ["quote_approval_threshold", POLICY.quoteApprovalThreshold, "quotes"], ["licence_fee_monthly", POLICY.licenceFeeMonthly, "payouts"],
];
export const SETTINGS: SettingRow[] = SETTING_DEFAULTS.map(([key, value, enforcedBy]) => ({ key, value, effectiveFrom: "2026-01-01", status: "active", enforcedBy }));
export const SETTING_CHANGES: SettingChange[] = [];
let scn = 0;

export class FinError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
/** Propose a finance setting change (202 pending). Guards run before the audit row. */
export function proposeSetting(b: { key: FinanceSettingKey; value: unknown; effectiveAt: string; reason: string }, by = actor()): SettingChange {
  if (!isFinanceUser(by)) throw new FinError(403, "forbidden");
  const row = SETTINGS.find((s) => s.key === b.key);
  if (!row) throw new FinError(422, "validation");
  if (!b.reason?.trim()) throw new FinError(422, "reason_required");
  if (isRetroactive(b.effectiveAt, today())) throw new FinError(422, "retroactive");
  const ch: SettingChange = { id: `sc-${++scn}`, key: b.key, old: row.value, next: b.value, effectiveAt: b.effectiveAt.slice(0, 10), status: "proposed", proposedBy: { id: by.id, name: by.name }, reason: b.reason };
  SETTING_CHANGES.unshift(ch);
  row.status = "pending_approval";
  record("setting.change.proposed", "setting", b.key, { value: row.value }, { value: b.value, effectiveAt: ch.effectiveAt }, b.reason, "config");
  return ch;
}
/** Executive decision; applies at once when effective today, else stays scheduled (never retroactive, W16). */
export function decideSetting(id: string, decision: "approve" | "reject", reason: string, by = actor()): SettingChange {
  const ch = SETTING_CHANGES.find((c) => c.id === id);
  if (!ch) throw new FinError(404, "not_found");
  if (ch.status !== "proposed") throw new FinError(409, "conflict");
  if (!by.roles.includes("staff:executive")) throw new FinError(403, "forbidden");
  if (ch.proposedBy.id === by.id) throw new FinError(403, "same_approver");
  if (decision === "reject" && !reason?.trim()) throw new FinError(422, "reason_required");
  const row = SETTINGS.find((s) => s.key === ch.key)!;
  const before = { status: ch.status };
  if (decision === "reject") { ch.status = "rejected"; row.status = "active"; }
  else {
    ch.status = "approved"; ch.approvedBy = { id: by.id, name: by.name };
    if (ch.effectiveAt <= today()) { ch.status = "applied"; row.value = ch.next; row.effectiveFrom = ch.effectiveAt; row.status = "active"; row.changedAt = new Date().toISOString(); }
    else row.status = "scheduled";
  }
  record(`setting.change.${ch.status}`, "setting", ch.key, before, { status: ch.status, value: ch.next }, reason, "config");
  return ch;
}

// ---------------------------------------------------------------- approvals inbox + summary (core read models)
const mineOf = (chain: import("@/shared/finance/types").Step[], a: Actor, makers: string[]): ApprovalItem["mine"] => {
  const c = canSign(chain, a, makers);
  return c.ok ? "sign" : c.reason === "same_approver" ? "waiting" : "blocked";
};
export function approvalsFor(a: Actor = actor()): ApprovalItem[] {
  const items: ApprovalItem[] = [];
  for (const p of PAYMENTS) if (p.chain && (p.state === "under_verification" || (p.state === "proof_submitted" && p.chain.some((s) => s.signedBy))))
    items.push({ id: p.id, type: "manual_payment", record: p.bankReference ?? p.id, href: `/finance/payments/proofs?id=${p.id}`, maker: { id: p.makerId ?? "", name: p.makerId ? (CLIENTS.find((c) => c.id === p.makerId)?.name ?? p.makerId) : "" },
      amount: p.amountExpected, reason: "manual_confirm", at: p.at, slaAt: new Date(Date.parse(p.at) + POLICY.manualReturnMs).toISOString(), mine: mineOf(p.chain, a, p.makerId ? [p.makerId] : []) });
  for (const r of REFUNDS) if (["recommended", "awaiting_executive"].includes(r.status))
    items.push({ id: r.no, type: "refund", record: r.no, href: `/finance/refunds/${r.no}`, maker: r.chain[0]?.signedBy ?? r.requestedBy, amount: r.recommended ?? r.requested, reason: r.reason, at: r.at, mine: mineOf(r.chain, a, []) });
  for (const al of ALLOCATIONS) if (al.status === "reviewed")
    items.push({ id: al.id, type: "allocation", record: al.caseRef, href: `/finance/revenue?tab=allocations&id=${al.id}`, maker: al.reviewedBy ?? USERS.sm, amount: al.pool, reason: "allocation_review", at: al.frozenAt, mine: isFinanceUser(a) || a.roles.includes("staff:executive") ? "sign" : "blocked" });
  for (const ch of SETTING_CHANGES) if (ch.status === "proposed")
    items.push({ id: ch.id, type: "setting", record: ch.key, href: `/finance/settings/history?id=${ch.id}`, maker: ch.proposedBy, amount: null, reason: ch.reason, at: ch.effectiveAt,
      mine: mineOf(sign(settingChain(), ch.proposedBy, ch.effectiveAt), a, [ch.proposedBy.id]) });
  for (const b of BATCHES) if (b.status === "submitted")
    items.push({ id: b.no, type: "batch", record: b.no, href: `/finance/payouts/${b.no}`, maker: b.preparedBy, amount: b.totals.net, reason: "batch_authorise", at: b.period, mine: a.id === b.preparedBy.id ? "waiting" : isFinanceUser(a) || a.roles.includes("staff:executive") ? "sign" : "blocked" });
  // Executives see only steps they can act on (U4).
  return isExecOnly(a) ? items.filter((i) => i.mine === "sign") : items;
}

export function summary(a: Actor = actor()): FinSummary {
  const approvals = approvalsFor(a).filter((i) => i.mine === "sign").length;
  const proofs = PAYMENTS.filter((p) => p.state === "proof_submitted" || p.state === "under_verification").length;
  const unmatched = LINES.filter((l) => l.match === "unmatched" || l.match === "suggested").length;
  const refunds = REFUNDS.filter((r) => ["recommended", "approved", "credited", "execution_failed"].includes(r.status)).length;
  const allocations = ALLOCATIONS.filter((x) => x.status === "reviewed").length;
  return {
    me: { id: a.id, name: a.name, roles: a.roles, executiveOnly: isExecOnly(a) },
    badges: { approvals, proofs, unmatched, refunds },
    needsYou: ([
      { key: "proofs", n: proofs, href: "/finance/payments/proofs" },
      { key: "approvals", n: approvals, href: "/finance/approvals" },
      { key: "unmatched", n: unmatched, href: "/finance/reconciliation" },
      { key: "refunds", n: refunds, href: "/finance/refunds" },
      { key: "allocations", n: allocations, href: "/finance/revenue?tab=allocations&state=reviewed" },
    ] as FinSummary["needsYou"]).filter((x) => x.n > 0 && (!isExecOnly(a) || x.key === "approvals")),
  };
}

export function notesFor(a: Actor = actor()): FinNote[] {
  const n: FinNote[] = PAYMENTS.filter((p) => p.state === "proof_submitted").map((p) => ({
    id: `n-${p.id}`, kind: "proof", text: `${clientOf(p.clientId).name}`, ref: p.bankReference, href: `/finance/payments/proofs?id=${p.id}`, at: p.at, read: false,
  }));
  for (const r of REFUNDS) if (r.status === "recommended") n.push({ id: `n-${r.no}`, kind: "refund", text: r.no, ref: r.no, href: `/finance/refunds/${r.no}`, at: r.at, read: false });
  return isExecOnly(a) ? n.filter((x) => x.kind === "approval" || x.kind === "setting") : n.sort((x, y) => y.at.localeCompare(x.at));
}

/** Mock sweep (FIN: pending past intent TTL → expired). Lanes register other simulate events in their own handler file. */
export function sweep(now = Date.now()) {
  const hit = PAYMENTS.filter((p) => p.state === "pending_provider" && Date.parse(p.at) + POLICY.paymentIntentMs < now);
  for (const p of hit) {
    const before = { state: p.state };
    p.state = "expired"; p.rev++; p.events.push({ at: new Date(now).toISOString(), kind: "expired", source: "system" });
    record("payment.status.overridden", "payment", p.id, before, { state: p.state }, "sweep");
  }
  return hit.length;
}

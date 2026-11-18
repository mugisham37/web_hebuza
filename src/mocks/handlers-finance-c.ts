// Stage 5 finance lane C mocks (U8–U10): payments, transfer proofs, manual confirm (X-4), statements + reconciliation.
// Registered before handlers-finance.ts. Fills finance-world IMPORTS / LINES / LOCKS at load; lane-only state lives here.
// shortcut: ★ mock — drop each handler as the real /api/finance/* endpoint ships.
import { http, HttpResponse, delay } from "msw";
import { ok, fail } from "./handlers-agent";
import { failFrom, guard, idempotent, needStepUp, stepUpOk } from "./handlers-finance";
import {
  ALLOCATIONS, FinError, IMPORTS, INVOICES, LINES, LOCKS, NOW, PAYMENTS, REFUNDS, actor, invoiceOf, record, seq, today,
} from "./finance-world";
import { clientOf } from "./ops-world";
import { POLICY } from "@/shared/policy";
import { canSign, chainComplete, manualChain, refundChain, sign } from "@/shared/finance/approvals";
import { applyPayment, refundSuggestion } from "@/lib/finance/money";
import { closeBlockers, countBy, difference, matchLines, type LineIn, type LineResult, type PaymentIn } from "@/shared/finance/recon";
import type { MatchState, Method, Payment, PaymentState, PeriodLock, Provider, StatementImport, StatementLine } from "@/shared/finance/types";
import type {
  Blocker, DayCell, ImportDetail, ImportRow, ImportRowIn, InvoiceOption, LineCandidate, LineRow, Mapping, PayTab, PaymentDetail,
  PaymentList, PaymentRow, PlatformRow, ProofCandidate, ProviderCard, ReconOverview,
} from "@/lib/finance/c";

const DAY = 86_400_000;
const dayOf = (iso: string) => iso.slice(0, 10);
const dayAgo = (n: number) => new Date(NOW - n * DAY).toISOString().slice(0, 10);
const PROVIDERS: Provider[] = ["mtn_momo", "airtel_money", "card", "bank"];
const providerOf = (m: Method): Provider | null =>
  m === "bank_transfer" ? "bank" : m === "mtn_momo" || m === "airtel_money" || m === "card" ? m : null;
const refOf = (p: Payment) => p.providerRef ?? p.bankReference;
const clientName = (id: string) => clientOf(id)?.name ?? id;
const me = () => { const a = actor(); return { id: a.id, name: a.name }; };

// ---------------------------------------------------------------- lane-local state
/** Historical MTN collections for the sample statement day (D). Kept out of PAYMENTS so other lanes' figures stay put.
 * shortcut: synthetic ledger for the demo statement only, drop when payments come from the API. */
export const SAMPLE_DAY = dayAgo(1);
const AMTS = [5_000, 10_000, 20_000, 25_000, 30_000, 50_000, 60_000, 80_800, 120_000, 236_000];
const paidInvoices = INVOICES.filter((i) => i.no && i.status === "paid");
const tag = SAMPLE_DAY.replaceAll("-", "").slice(2);
const at = (i: number) => new Date(Date.parse(`${SAMPLE_DAY}T05:00:00.000Z`) + i * 4 * 60_000).toISOString();
export const HISTORY: Payment[] = Array.from({ length: 214 }, (_, i): Payment => {
  const inv = paidInvoices[i % Math.max(1, paidInvoices.length)] ?? INVOICES[0];
  const amount = i === 211 ? 40_000 : i === 212 ? 15_000 : AMTS[i % AMTS.length];
  const pending = i === 212;
  return {
    id: `pay-h${String(i).padStart(3, "0")}`, invoiceNo: inv.no!, caseRef: inv.caseRef, clientId: inv.clientId, method: "mtn_momo",
    state: pending ? "pending_provider" : "confirmed", amountExpected: amount, amountReceived: pending ? undefined : amount,
    providerFee: pending ? undefined : Math.round(amount / 100), providerRef: pending ? undefined : `MP${tag}.${1000 + i}`,
    events: [{ at: at(i), kind: pending ? "pending_provider" : "confirmed", source: pending ? "client" : "webhook" }],
    verify: pending ? { nextAt: new Date(NOW + 5 * 60_000).toISOString(), cadence: "5m" } : undefined, at: at(i), rev: 1,
  };
});
/** The MTN sample statement (211 matched · 1 amount exception · 1 suggested · 1 unknown). Same rows as tests/fixtures/finance/mtn-*.csv. */
export function sampleCsv() {
  const rows = HISTORY.slice(0, 211).map((p, i) => [refOf(p)!, p.amountExpected, p.providerFee ?? 0, p.at, `2507••••${String(100 + i).slice(-3)}`]);
  rows.push([`MP${tag}.1211`, 40_400, 404, HISTORY[211].at, "2507••••311"]); // platform says 40,000
  rows.push([`MP${tag}.1212`, 15_000, 150, HISTORY[212].at, "2507••••312"]); // webhook missed → suggested
  rows.push([`MP${tag}.9001`, 9_500, 95, at(213), "2507••••901"]); // no platform record
  return ["Reference,Amount,Fee,Date,Payer", ...rows.map((r) => r.join(","))].join("\n");
}
HISTORY[211].providerRef = `MP${tag}.1211`;
const ALL = () => [...PAYMENTS, ...HISTORY];
const payOf = (id: string) => ALL().find((p) => p.id === id);

const IMPORTED: Record<string, { at: string; fileName: string }> = {};
const LINE_META: Record<string, { rev: number; payer?: string; diff?: number; by?: { name: string; at: string } }> = {};
const LOCK_AT: Record<string, number> = {};
const EVIDENCE: Record<string, string> = {};
const MAPPINGS: Partial<Record<Provider, Mapping>> = {
  mtn_momo: { external_ref: "Reference", amount: "Amount", fee: "Fee", occurred_at: "Date" },
};
let impN = 0, lineN = 0, manN = 0;

// ---------------------------------------------------------------- periods
const lockOf = (provider: Provider, day: string): PeriodLock["state"] =>
  LOCKS.find((l) => l.provider === provider && l.day === day)?.state ?? "open";
const isLocked = (provider: Provider, day: string) => lockOf(provider, day) === "closed" || lockOf(provider, day.slice(0, 7)) === "closed";
function setLock(provider: Provider, day: string, state: PeriodLock["state"], reason?: string) {
  const l = LOCKS.find((x) => x.provider === provider && x.day === day);
  if (l) Object.assign(l, { state, by: me(), reason });
  else LOCKS.push({ provider, day, state, by: me(), reason });
}

// ---------------------------------------------------------------- import + matcher
const NEEDS: MatchState[] = ["unmatched", "suggested", "exception", "duplicate"];
const needsYou = (l: StatementLine) => (l.match === "unmatched" || l.match === "suggested" || l.match === "duplicate") || (l.match === "exception" && !l.reason?.trim());
const importOf = (l: StatementLine) => IMPORTS.find((i) => i.id === l.importId)!;
const linesOf = (id: string) => LINES.filter((l) => l.importId === id);
const windowPayments = (provider: Provider, from: string, to: string) =>
  ALL().filter((p) => providerOf(p.method) === provider && dayOf(p.at) >= dayOf(from) && dayOf(p.at) <= dayOf(to));
const asIn = (p: Payment): PaymentIn => ({ id: p.id, ref: refOf(p), amount: p.amountReceived ?? p.amountExpected, at: p.at, method: p.method, confirmed: p.state === "confirmed" || p.state === "confirmed_late", duplicate: p.duplicate });

function runImport(provider: Provider, rows: ImportRowIn[], o: { fileName: string; fileHash: string; at: string; by: { id: string; name: string } }) {
  const from = rows.reduce((m, r) => (r.occurredAt < m ? r.occurredAt : m), rows[0].occurredAt);
  const to = rows.reduce((m, r) => (r.occurredAt > m ? r.occurredAt : m), rows[0].occurredAt);
  const imp: StatementImport = { id: `imp-${String(++impN).padStart(3, "0")}`, provider, from: dayOf(from), to: dayOf(to), rows: rows.length, fileHash: o.fileHash, importedBy: o.by, counts: countBy([]) };
  const lines: StatementLine[] = rows.map((r) => ({ id: `ln-${++lineN}`, importId: imp.id, externalRef: r.externalRef, amount: r.amount, fee: r.fee, occurredAt: r.occurredAt, match: "unmatched" }));
  // Payments already explained by another line never match twice.
  const pool = windowPayments(provider, imp.from, imp.to).filter((p) => !p.reconciliationId && ["confirmed", "confirmed_late", "pending_provider", "expired", "proof_submitted", "under_verification"].includes(p.state));
  const { results } = matchLines(lines.map((l): LineIn => l), pool.map(asIn));
  results.forEach((r, i) => {
    const l = lines[i];
    l.match = r.match; l.paymentId = r.paymentId; l.reason = r.reason;
    const p = r.paymentId ? payOf(r.paymentId) : undefined;
    // A line that names a payment the platform has not confirmed yet is a suggestion (missed webhook / proof in review).
    if (p && r.match === "matched" && !asIn(p).confirmed) l.match = "suggested";
    if (r.match === "suggested") l.suggestionId = r.paymentId;
    if (p && (l.match === "matched" || l.match === "duplicate")) p.reconciliationId = l.id;
    LINE_META[l.id] = { rev: 1, payer: rows[i].payer, diff: r.diff };
  });
  IMPORTS.unshift(imp);
  LINES.push(...lines);
  IMPORTED[imp.id] = { at: o.at, fileName: o.fileName };
  recount(imp.id);
  return imp;
}
function recount(id: string) {
  const imp = IMPORTS.find((i) => i.id === id);
  if (imp) imp.counts = countBy(linesOf(id).map((l) => ({ lineId: l.id, match: l.match })));
}
function resultsOf(lines: StatementLine[]): LineResult[] {
  return lines.map((l) => ({ lineId: l.id, match: l.match, paymentId: l.paymentId, diff: LINE_META[l.id]?.diff, reason: l.reason }));
}
const platformUnmatched = (imp: StatementImport) =>
  windowPayments(imp.provider, imp.from, imp.to).filter((p) => (p.state === "confirmed" || p.state === "confirmed_late") && !p.reconciliationId);

// ---------------------------------------------------------------- seed (lane C fills IMPORTS / LINES / LOCKS)
{
  const seedBy = { id: "mock-finance", name: "Patrick Niyonzima" };
  const ledgerRows = (provider: Provider) =>
    PAYMENTS.filter((p) => providerOf(p.method) === provider && (p.state === "confirmed" || p.state === "pending_provider" || (provider === "bank" && p.state === "proof_submitted")))
      .map((p, i): ImportRowIn => ({ externalRef: refOf(p)!, amount: p.amountReceived ?? p.amountExpected, fee: p.providerFee ?? 0, occurredAt: p.at, payer: provider === "bank" ? undefined : `2507••••${String(400 + i).slice(-3)}` }))
      .filter((r) => r.externalRef);
  // Bank proofs: the 4th transfer has not landed on the statement yet.
  const bank = ledgerRows("bank");
  const lastProof = PAYMENTS.filter((p) => p.state === "proof_submitted").at(-1);
  const bankRows = bank.filter((r) => r.externalRef !== lastProof?.bankReference);
  const airtel = ledgerRows("airtel_money");
  airtel.push({ externalRef: "AM2611.77120", amount: 12_000, fee: 120, occurredAt: new Date(NOW - 2 * DAY).toISOString(), payer: "2507••••771" });
  for (const [provider, rows] of [["mtn_momo", ledgerRows("mtn_momo")], ["airtel_money", airtel], ["card", ledgerRows("card")], ["bank", bankRows]] as const) {
    if (!rows.length) continue;
    runImport(provider, [...rows], { fileName: `${provider}-ledger.csv`, fileHash: `seed-${provider}`, at: new Date(NOW - 8 * 3600_000).toISOString(), by: seedBy });
  }
  // Close clean days older than two days; close last month when every day in it is clean.
  for (const provider of PROVIDERS) {
    const days = new Set(LINES.filter((l) => importOf(l).provider === provider).map((l) => dayOf(l.occurredAt)));
    for (const d of days) {
      const dirty = LINES.some((l) => importOf(l).provider === provider && dayOf(l.occurredAt) === d && needsYou(l));
      if (!dirty && d < dayAgo(2)) LOCKS.push({ provider, day: d, state: "closed", by: seedBy });
    }
    const prev = new Date(new Date(NOW).getUTCFullYear(), new Date(NOW).getUTCMonth() - 1, 15).toISOString().slice(0, 7);
    const prevDirty = LINES.some((l) => importOf(l).provider === provider && l.occurredAt.startsWith(prev) && needsYou(l));
    if (!prevDirty) LOCKS.push({ provider, day: prev, state: "closed", by: seedBy });
  }
}

// ---------------------------------------------------------------- payment side effects
function settle(p: Payment, amount: number, source: "webhook" | "poll" | "finance", late = false) {
  const inv = invoiceOf(p.invoiceNo);
  const before = { state: p.state, invoice: inv && { status: inv.status, balanceDue: inv.balanceDue } };
  p.state = late ? "confirmed_late" : "confirmed";
  p.amountReceived = amount;
  p.receiptNo ??= seq.next("RCPT", new Date(NOW).getUTCFullYear());
  p.verify = undefined; p.lockedBy = undefined; p.rev++;
  p.events.push({ at: new Date().toISOString(), kind: p.state, source, by: source === "finance" ? me() : undefined });
  if (inv) {
    const r = applyPayment(inv, amount);
    inv.amountPaid += r.applied; inv.balanceDue -= r.applied; inv.status = r.status === "issued" ? inv.status : r.status; inv.rev++;
    if (r.credit) p.events.push({ at: new Date().toISOString(), kind: "credit_created", source: "system", note: String(r.credit) });
  }
  return before;
}
function checkRev(rec: { rev: number }, rev: unknown) {
  if (typeof rev === "number" && rev !== rec.rev) throw new FinError(409, "version_conflict");
}
function refUsed(ref: string | undefined, exceptId?: string) {
  const r = ref?.trim().toUpperCase();
  return !!r && ALL().some((p) => p.id !== exceptId && refOf(p)?.toUpperCase() === r);
}
const lockFresh = (p: Payment) => !!p.lockedBy && (LOCK_AT[p.id] ?? 0) + 15 * 60_000 > Date.now();

// ---------------------------------------------------------------- views
const TAB_OF: Record<PayTab, (p: Payment) => boolean> = {
  all: () => true,
  pending: (p) => p.state === "initiated" || p.state === "pending_provider",
  verification: (p) => p.state === "proof_submitted" || p.state === "under_verification",
  failed: (p) => p.state === "failed" || p.state === "rejected",
  expired: (p) => p.state === "expired",
  reversed: (p) => p.state === "reversed",
  attention: (p) => attention(p),
};
function attention(p: Payment) {
  return !!p.duplicate || p.state === "confirmed_late" || p.state === "expired" || (p.state === "pending_provider" && Date.parse(p.at) + 3600_000 < Date.now());
}
const rowOf = (p: Payment): PaymentRow => ({
  id: p.id, at: p.at, method: p.method, ref: refOf(p), clientName: clientName(p.clientId), invoiceNo: p.invoiceNo, caseRef: p.caseRef,
  amount: p.amountReceived ?? p.amountExpected, fee: p.providerFee, state: p.state, verify: p.verify, attention: attention(p), duplicate: p.duplicate,
});
function detailOf(p: Payment): PaymentDetail {
  const inv = invoiceOf(p.invoiceNo);
  const amount = p.amountReceived ?? p.amountExpected;
  const balance = inv?.balanceDue ?? 0;
  const ref = refOf(p)?.toUpperCase();
  const candidates: ProofCandidate[] = p.method === "bank_transfer"
    ? LINES.filter((l) => importOf(l).provider === "bank" && (l.externalRef.toUpperCase() === ref || (l.amount === amount && l.match !== "matched")))
      .slice(0, 5).map((l) => ({ lineId: l.id, importId: l.importId, externalRef: l.externalRef, amount: l.amount, at: l.occurredAt, exactAmount: l.amount === amount, refFound: l.externalRef.toUpperCase() === ref }))
    : [];
  const firstSig = p.chain?.find((s) => s.at)?.at;
  const alloc = ALLOCATIONS.find((a) => a.caseRef === p.caseRef);
  const applied = Math.min(amount, (inv?.amountPaid ?? 0));
  return {
    payment: { ...p, clientName: clientName(p.clientId) },
    invoice: inv ? { no: inv.no!, total: inv.totals.total, balanceDue: inv.balanceDue, amountPaid: inv.amountPaid, status: inv.status } : null,
    diff: amount - balance, over: Math.max(0, amount - balance), candidates,
    returnAt: firstSig && p.state === "under_verification" ? new Date(Date.parse(firstSig) + POLICY.manualReturnMs).toISOString() : undefined,
    lockUntil: lockFresh(p) ? new Date((LOCK_AT[p.id] ?? 0) + 15 * 60_000).toISOString() : undefined,
    evidence: EVIDENCE[p.id] ?? (p.proofDocId ? `${p.bankReference ?? p.id}.pdf` : undefined),
    impact: { invoiceNo: p.invoiceNo, balanceAfter: (inv?.balanceDue ?? 0) + applied, allocation: !!alloc, paidOut: alloc?.status === "paid" },
  };
}
function lineView(l: StatementLine): LineRow {
  const imp = importOf(l);
  const p = l.paymentId ? payOf(l.paymentId) : undefined;
  const m = LINE_META[l.id] ?? { rev: 1 };
  return {
    ...l, rev: m.rev, payer: m.payer, diff: m.diff, by: m.by, day: dayOf(l.occurredAt), locked: isLocked(imp.provider, dayOf(l.occurredAt)),
    payment: p && { id: p.id, invoiceNo: p.invoiceNo, clientName: clientName(p.clientId), amount: p.amountReceived ?? p.amountExpected, state: p.state },
  };
}
const platformView = (p: Payment): PlatformRow => ({ id: p.id, at: p.at, ref: refOf(p), invoiceNo: p.invoiceNo, clientName: clientName(p.clientId), amount: p.amountReceived ?? p.amountExpected, state: p.state });
const importRow = (i: StatementImport): ImportRow => ({ ...i, ...(IMPORTED[i.id] ?? { at: new Date(NOW).toISOString(), fileName: "" }) });

function importDetail(id: string): ImportDetail {
  const imp = IMPORTS.find((i) => i.id === id);
  if (!imp) throw new FinError(404, "not_found");
  const lines = linesOf(id);
  const plat = platformUnmatched(imp);
  const pays = windowPayments(imp.provider, imp.from, imp.to).filter((p) => p.state === "confirmed" || p.state === "confirmed_late");
  const results = resultsOf(lines);
  return {
    import: importRow(imp), lines: lines.map(lineView), platform: plat.map(platformView),
    totals: {
      statement: lines.reduce((s, l) => s + l.amount, 0),
      platform: pays.reduce((s, p) => s + (p.amountReceived ?? p.amountExpected), 0),
      difference: difference(lines, results, pays.map(asIn), plat.map((p) => p.id)),
    },
    counts: countBy(results),
  };
}
function overview(provider: Provider, date: string): ReconOverview {
  const provLines = LINES.filter((l) => importOf(l).provider === provider);
  const days: DayCell[] = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(Date.parse(date) - (6 - k) * DAY).toISOString().slice(0, 10);
    const ls = provLines.filter((l) => dayOf(l.occurredAt) === d);
    return { day: d, lines: ls.length, needs: ls.filter(needsYou).length, lock: isLocked(provider, d) ? "closed" : lockOf(provider, d) };
  });
  const providers: ProviderCard[] = PROVIDERS.map((pv) => {
    const last = IMPORTS.find((i) => i.provider === pv);
    const ls = last ? linesOf(last.id) : [];
    return {
      provider: pv, lastImport: last && { id: last.id, at: importRow(last).at, by: last.importedBy.name },
      pct: ls.length ? Math.round((ls.filter((l) => l.match === "matched" || l.match === "ignored" || (l.match === "exception" && l.reason)).length / ls.length) * 1000) / 10 : null,
      needs: ls.filter(needsYou).length,
    };
  });
  const dayLines = provLines.filter((l) => dayOf(l.occurredAt) === date);
  const blockers: Blocker[] = closeBlockers(resultsOf(dayLines)).map((r) => {
    const l = LINES.find((x) => x.id === r.lineId)!;
    return { lineId: l.id, ref: l.externalRef, match: l.match, importId: l.importId };
  });
  const month = date.slice(0, 7);
  const monthLines = provLines.filter((l) => l.occurredAt.startsWith(month));
  const openDays = new Set(monthLines.filter((l) => !isLocked(provider, dayOf(l.occurredAt))).map((l) => dayOf(l.occurredAt)));
  const imp = dayLines[0] ? importOf(dayLines[0]) : undefined;
  return {
    providers, days,
    month: { month, state: lockOf(provider, month), blockers: openDays.size },
    selected: {
      provider, day: date, lock: isLocked(provider, date) ? "closed" : lockOf(provider, date), lines: dayLines.length, needs: dayLines.filter(needsYou).length,
      difference: imp ? difference(dayLines, resultsOf(dayLines), [], []) : 0, blockers, importId: imp?.id,
    },
    imports: IMPORTS.filter((i) => i.provider === provider).map(importRow),
  };
}

// ---------------------------------------------------------------- handlers
const run = (fn: () => Response) => { try { return fn(); } catch (e) { return failFrom(e); } };
const accepted = <T,>(data: T) => HttpResponse.json({ success: true, message: "Pending approval", errorType: null, data }, { status: 202 });
const body = async <T,>(r: Request) => ((await r.json().catch(() => ({}))) ?? {}) as T;
const lineOr404 = (id: string) => { const l = LINES.find((x) => x.id === id); if (!l) throw new FinError(404, "not_found"); return l; };
function lineGuard(l: StatementLine, rev: unknown) {
  if (isLocked(importOf(l).provider, dayOf(l.occurredAt))) throw new FinError(409, "period_locked");
  const m = (LINE_META[l.id] ??= { rev: 1 });
  if (typeof rev === "number" && rev !== m.rev) throw new FinError(409, "version_conflict");
  return m;
}
function touch(l: StatementLine) {
  const m = (LINE_META[l.id] ??= { rev: 1 });
  m.rev++; m.by = { name: actor().name, at: new Date().toISOString() };
  recount(l.importId);
}

export const handlers = [
  // ---------------- payments
  http.get("/api/finance/payments", async ({ request }) => {
    await delay(220);
    const g = guard(); if (g) return g;
    const q = new URL(request.url).searchParams;
    const tab = (q.get("tab") ?? "all") as PayTab;
    const method = q.get("method"), from = q.get("from"), to = q.get("to"), client = q.get("client"), cs = q.get("case"), s = q.get("q")?.toLowerCase();
    const base = ALL().filter((p) => (!method || p.method === method) && (!from || dayOf(p.at) >= from) && (!to || dayOf(p.at) <= to)
      && (!client || p.clientId === client) && (!cs || p.caseRef === cs)
      && (!s || [refOf(p), p.invoiceNo, p.caseRef, clientName(p.clientId), p.id].some((v) => v?.toLowerCase().includes(s))));
    const counts = Object.fromEntries(Object.entries(TAB_OF).map(([k, f]) => [k, base.filter(f).length])) as Record<PayTab, number>;
    const rows = base.filter(TAB_OF[tab] ?? TAB_OF.all).sort((a, b) => b.at.localeCompare(a.at));
    const off = Number(q.get("cursor") ?? 0);
    const page = rows.slice(off, off + 20);
    const data: PaymentList = {
      items: page.map(rowOf),
      meta: { counts, total: rows.length, amount: rows.reduce((t, p) => t + (p.amountReceived ?? p.amountExpected), 0), fee: rows.reduce((t, p) => t + (p.providerFee ?? 0), 0), next: off + 20 < rows.length ? String(off + 20) : null },
    };
    return ok(data);
  }),
  http.get("/api/finance/x/payments/invoice-options", async ({ request }) => {
    await delay(120);
    const g = guard(); if (g) return g;
    const s = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
    const items: InvoiceOption[] = INVOICES.filter((i) => i.no && i.balanceDue > 0 && (i.status === "issued" || i.status === "partially_paid"))
      .filter((i) => !s || [i.no, i.caseRef, i.billTo.name].some((v) => v?.toLowerCase().includes(s)))
      .slice(0, 20).map((i) => ({ no: i.no!, client: i.billTo.name, balance: i.balanceDue, caseRef: i.caseRef }));
    return ok({ items });
  }),
  http.post("/api/finance/payments/manual", async ({ request }) => {
    const g = guard(); if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ invoiceNo: string; method: Method; amount: number; bankReference?: string; receivedAt: string; evidenceName?: string; reason: string; note?: string; lineId?: string }>(request);
    return idempotent(request, () => run(() => {
      const inv = invoiceOf(b.invoiceNo);
      if (!inv || !Number.isInteger(b.amount) || b.amount <= 0 || !b.receivedAt) throw new FinError(422, "validation");
      if (!b.evidenceName) throw new FinError(422, "validation");
      if (!b.reason?.trim()) throw new FinError(422, "reason_required");
      if (inv.balanceDue <= 0) throw new FinError(409, "invoice_settled");
      if (refUsed(b.bankReference)) throw new FinError(409, "duplicate_reference");
      const prov = providerOf(b.method);
      if (prov && isLocked(prov, dayOf(b.receivedAt))) throw new FinError(409, "period_locked");
      const who = me();
      const p: Payment = {
        id: `pay-m${String(++manN).padStart(3, "0")}`, invoiceNo: inv.no!, caseRef: inv.caseRef, clientId: inv.clientId, method: b.method, state: "under_verification",
        amountExpected: b.amount, bankReference: b.bankReference?.trim() || undefined, chain: manualChain(b.amount), makerId: who.id,
        events: [{ at: new Date().toISOString(), kind: "recorded", source: "finance", by: who, note: [b.reason, b.note].filter(Boolean).join(" · ") }],
        at: new Date(b.receivedAt).toISOString(), rev: 1,
      };
      EVIDENCE[p.id] = b.evidenceName;
      PAYMENTS.unshift(p);
      if (b.lineId) {
        const l = LINES.find((x) => x.id === b.lineId);
        if (l) { l.match = "exception"; l.paymentId = p.id; l.reason = `manual_payment:${p.id}`; touch(l); }
      }
      record("payment.manual.recorded", "payment", p.id, null, { state: p.state, amount: b.amount, method: b.method, invoice: inv.no }, b.reason);
      return accepted(detailOf(p));
    }));
  }),
  http.get("/api/finance/payments/:id", async ({ params }) => {
    await delay(160);
    const g = guard(); if (g) return g;
    const p = payOf(String(params.id));
    return p ? ok(detailOf(p)) : fail(404, "not_found", "not_found");
  }),
  http.post("/api/finance/payments/:id/lock", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await body<{ release?: boolean }>(request);
    return run(() => {
      const p = payOf(String(params.id));
      if (!p) throw new FinError(404, "not_found");
      const who = me();
      if (b.release) {
        if (p.lockedBy?.id === who.id) {
          p.lockedBy = undefined; delete LOCK_AT[p.id];
          if (p.state === "under_verification" && !p.chain?.some((s) => s.signedBy) && p.makerId !== who.id && p.proofDocId) p.state = "proof_submitted";
        }
        return ok(detailOf(p));
      }
      if (p.state !== "proof_submitted" && p.state !== "under_verification") return ok(detailOf(p));
      if (lockFresh(p) && p.lockedBy?.id !== who.id) return ok(detailOf(p)); // someone else is verifying
      const before = { state: p.state };
      p.lockedBy = who; LOCK_AT[p.id] = Date.now();
      if (p.state === "proof_submitted") {
        p.state = "under_verification"; p.rev++;
        p.events.push({ at: new Date().toISOString(), kind: "under_verification", source: "finance", by: who });
        record("payment.verification.started", "payment", p.id, before, { state: p.state });
      }
      return ok(detailOf(p));
    });
  }),
  http.post("/api/finance/payments/:id/confirm", async ({ request, params }) => {
    const g = guard(true); if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ rev?: number; bankReference?: string }>(request);
    return idempotent(request, () => run(() => {
      const p = payOf(String(params.id));
      if (!p) throw new FinError(404, "not_found");
      checkRev(p, b.rev);
      if (p.state !== "proof_submitted" && p.state !== "under_verification") throw new FinError(409, "conflict");
      const who = actor();
      if (lockFresh(p) && p.lockedBy?.id !== who.id && !p.chain?.some((s) => s.signedBy)) throw new FinError(409, "conflict");
      if (b.bankReference && refUsed(b.bankReference, p.id)) throw new FinError(409, "duplicate_reference");
      const prov = providerOf(p.method);
      if (prov && isLocked(prov, dayOf(p.at))) throw new FinError(409, "period_locked");
      const chain = p.chain ?? manualChain(p.amountExpected);
      const c = canSign(chain, who, p.makerId ? [p.makerId] : []);
      if (!c.ok) throw new FinError(c.reason === "complete" ? 409 : 403, c.reason === "complete" ? "conflict" : c.reason);
      if (b.bankReference) p.bankReference = b.bankReference.trim();
      p.chain = sign(chain, who, new Date().toISOString());
      p.state = "under_verification"; p.rev++;
      p.events.push({ at: new Date().toISOString(), kind: "signed", source: "finance", by: { id: who.id, name: who.name } });
      record("payment.confirm.signed", "payment", p.id, { signed: c.index }, { signed: c.index + 1 });
      if (!chainComplete(p.chain)) return accepted(detailOf(p));
      const before = settle(p, p.amountExpected, "finance");
      record("payment.confirmed.manual", "payment", p.id, before, { state: p.state, receipt: p.receiptNo });
      return ok(detailOf(p));
    }));
  }),
  http.post("/api/finance/payments/:id/reject", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await body<{ reason?: string; note?: string; rev?: number }>(request);
    return idempotent(request, () => run(() => {
      const p = payOf(String(params.id));
      if (!p) throw new FinError(404, "not_found");
      checkRev(p, b.rev);
      if (!b.reason?.trim()) throw new FinError(422, "reason_required");
      if (p.state !== "proof_submitted" && p.state !== "under_verification") throw new FinError(409, "conflict");
      const before = { state: p.state };
      p.state = "rejected"; p.lockedBy = undefined; p.rev++;
      p.events.push({ at: new Date().toISOString(), kind: "rejected", source: "finance", by: me(), note: [b.reason, b.note].filter(Boolean).join(" · ") });
      record("payment.rejected", "payment", p.id, before, { state: p.state }, b.reason);
      return ok(detailOf(p));
    }));
  }),
  http.post("/api/finance/payments/:id/verify", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    return idempotent(request, () => run(() => {
      const p = payOf(String(params.id));
      if (!p) throw new FinError(404, "not_found");
      if (p.state !== "pending_provider" && p.state !== "expired") return ok({ result: "unchanged" as const, payment: detailOf(p) });
      // Mock provider answers "success" for every check (missed webhook).
      const late = p.state === "expired";
      const before = settle(p, p.amountExpected, "poll", late);
      record(late ? "payment.status.overridden" : "payment.confirmed", "payment", p.id, before, { state: p.state }, late ? "late_success" : "verify_now");
      return ok({ result: p.state, payment: detailOf(p) });
    }));
  }),
  http.post("/api/finance/payments/:id/reverse", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ reason?: string; note?: string; rev?: number }>(request);
    return idempotent(request, () => run(() => {
      const p = payOf(String(params.id));
      if (!p) throw new FinError(404, "not_found");
      checkRev(p, b.rev);
      if (!b.reason?.trim()) throw new FinError(422, "reason_required");
      if (p.state !== "confirmed" && p.state !== "confirmed_late") throw new FinError(409, "conflict");
      const inv = invoiceOf(p.invoiceNo);
      const before = { state: p.state, invoice: inv && { status: inv.status, balanceDue: inv.balanceDue } };
      p.state = "reversed"; p.rev++;
      p.events.push({ at: new Date().toISOString(), kind: "reversed", source: "finance", by: me(), note: b.reason });
      if (inv) {
        const back = Math.min(p.amountReceived ?? p.amountExpected, inv.amountPaid);
        inv.amountPaid -= back; inv.balanceDue += back; inv.status = inv.amountPaid > 0 ? "partially_paid" : "issued"; inv.rev++;
      }
      record("payment.status.overridden", "payment", p.id, before, { state: p.state, invoice: inv && { status: inv.status, balanceDue: inv.balanceDue } }, b.reason);
      return ok(detailOf(p));
    }));
  }),

  // ---------------- statements + reconciliation
  http.get("/api/finance/statements", async ({ request }) => {
    await delay(200);
    const g = guard(); if (g) return g;
    const q = new URL(request.url).searchParams;
    const provider = (PROVIDERS.includes(q.get("provider") as Provider) ? q.get("provider") : "mtn_momo") as Provider;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q.get("date") ?? "") ? q.get("date")! : SAMPLE_DAY;
    return ok(overview(provider, date));
  }),
  http.get("/api/finance/x/statements/mapping", ({ request }) => {
    const g = guard(); if (g) return g;
    const provider = new URL(request.url).searchParams.get("provider") as Provider;
    return ok({ mapping: MAPPINGS[provider] ?? null });
  }),
  http.get("/api/finance/x/statements/sample", async () => {
    await delay(150);
    const g = guard(); if (g) return g;
    return ok({ fileName: `mtn-${SAMPLE_DAY}.csv`, csv: sampleCsv() });
  }),
  http.post("/api/finance/statements/import", async ({ request }) => {
    const g = guard(); if (g) return g;
    // shortcut: JSON rows parsed in the browser instead of multipart CSV/XLSX, switch when the import API ships.
    const b = await body<{ provider: Provider; fileName: string; fileHash: string; mapping: Mapping; rows: ImportRowIn[] }>(request);
    return idempotent(request, () => run(() => {
      if (!PROVIDERS.includes(b.provider) || !b.rows?.length) throw new FinError(422, "validation");
      if (!b.mapping?.external_ref || !b.mapping.amount || !b.mapping.occurred_at) throw new FinError(422, "mapping_required");
      if (IMPORTS.some((i) => i.fileHash === b.fileHash)) throw new FinError(409, "duplicate_file");
      if (b.rows.some((r) => isLocked(b.provider, dayOf(r.occurredAt)))) throw new FinError(409, "period_locked");
      MAPPINGS[b.provider] = b.mapping;
      const imp = runImport(b.provider, b.rows, { fileName: b.fileName, fileHash: b.fileHash, at: new Date().toISOString(), by: me() });
      record("recon.statement.imported", "import", imp.id, null, { provider: imp.provider, rows: imp.rows, counts: imp.counts });
      return ok(importRow(imp));
    }));
  }),
  http.get("/api/finance/statements/:id/lines", async ({ params }) => {
    await delay(220);
    const g = guard(); if (g) return g;
    return run(() => ok(importDetail(String(params.id))));
  }),
  http.get("/api/finance/statements/lines/:id/candidates", async ({ params }) => {
    await delay(120);
    const g = guard(); if (g) return g;
    return run(() => {
      const l = lineOr404(String(params.id));
      const imp = importOf(l);
      const t = Date.parse(l.occurredAt);
      const items: LineCandidate[] = ALL()
        .filter((p) => providerOf(p.method) === imp.provider && !p.reconciliationId && Math.abs(Date.parse(p.at) - t) <= 3 * DAY
          && (["confirmed", "confirmed_late", "pending_provider", "expired"] as PaymentState[]).includes(p.state))
        .map((p) => ({ id: p.id, invoiceNo: p.invoiceNo, clientName: clientName(p.clientId), amount: p.amountReceived ?? p.amountExpected, at: p.at, state: p.state, diff: l.amount - (p.amountReceived ?? p.amountExpected) }))
        .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff) || (a.id === l.suggestionId ? -1 : 0)).slice(0, 12);
      return ok({ items });
    });
  }),
  http.post("/api/finance/statements/lines/bulk-accept", async ({ request }) => {
    const g = guard(); if (g) return g;
    const b = await body<{ ids: string[] }>(request);
    return idempotent(request, () => {
      let done = 0;
      for (const id of b.ids ?? []) {
        const l = LINES.find((x) => x.id === id);
        if (!l || l.match !== "suggested" || !l.suggestionId || isLocked(importOf(l).provider, dayOf(l.occurredAt))) continue;
        const p = payOf(l.suggestionId);
        if (!p || p.amountExpected !== l.amount || p.state === "proof_submitted" || p.state === "under_verification") continue;
        if (p.state === "pending_provider" || p.state === "expired") settle(p, l.amount, "poll", p.state === "expired");
        l.match = "matched"; l.paymentId = p.id; p.reconciliationId = l.id; touch(l); done++;
        record("recon.line.matched", "statement_line", l.id, { match: "suggested" }, { match: "matched", payment: p.id }, "bulk_accept");
      }
      return ok({ done, skipped: (b.ids?.length ?? 0) - done });
    });
  }),
  http.post("/api/finance/statements/lines/:id/:action", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const action = String(params.action);
    const b = await body<{ rev?: number; paymentId?: string; handling?: "none" | "provider_fee" | "partial" | "exception"; reason?: string; note?: string }>(request);
    return idempotent(request, () => run(() => {
      const l = lineOr404(String(params.id));
      const m = lineGuard(l, b.rev);
      const before = { match: l.match, payment: l.paymentId, reason: l.reason };
      if (action === "match") {
        const p = b.paymentId ? payOf(b.paymentId) : undefined;
        if (!p) throw new FinError(422, "validation");
        if (p.reconciliationId && p.reconciliationId !== l.id) throw new FinError(409, "conflict");
        if (p.state === "proof_submitted" || p.state === "under_verification") throw new FinError(409, "four_eyes_required");
        const diff = l.amount - (p.amountReceived ?? p.amountExpected);
        const h = b.handling ?? "none";
        if (diff !== 0 && h === "none") throw new FinError(422, "validation");
        if (h === "exception" && !b.note?.trim()) throw new FinError(422, "reason_required");
        if (p.state === "pending_provider" || p.state === "expired") settle(p, h === "partial" ? l.amount : p.amountExpected, "poll", p.state === "expired");
        if (h === "provider_fee") p.providerFee = Math.abs(diff);
        l.paymentId = p.id; p.reconciliationId = l.id;
        l.match = h === "exception" ? "exception" : "matched";
        l.reason = h === "exception" ? b.note : h === "none" ? undefined : h;
        m.diff = h === "exception" ? diff : undefined;
        touch(l);
        record("recon.line.matched", "statement_line", l.id, before, { match: l.match, payment: p.id, handling: h }, b.note);
      } else if (action === "ignore") {
        if (!b.reason?.trim()) throw new FinError(422, "reason_required");
        l.match = "ignored"; l.reason = [b.reason, b.note].filter(Boolean).join(" · "); touch(l);
        record("recon.line.ignored", "statement_line", l.id, before, { match: l.match }, l.reason);
      } else if (action === "fee") {
        l.match = "ignored"; l.reason = "provider_fee"; touch(l);
        record("recon.line.ignored", "statement_line", l.id, before, { match: l.match, reason: "provider_fee" }, "provider_fee");
      } else if (action === "flag") {
        if (!b.note?.trim()) throw new FinError(422, "reason_required");
        l.match = "exception"; l.reason = b.note; touch(l);
        record("recon.line.flagged", "statement_line", l.id, before, { match: l.match }, b.note);
      } else if (action === "refund-proposal") {
        const p = l.paymentId ? payOf(l.paymentId) : undefined;
        const inv = p && invoiceOf(p.invoiceNo);
        if (l.match !== "duplicate" || !p || !inv) throw new FinError(409, "conflict");
        if (REFUNDS.some((r) => r.paymentId === p.id && !["rejected", "withdrawn"].includes(r.status))) throw new FinError(409, "refund_open");
        const s = refundSuggestion(inv, "duplicate");
        const no = seq.next("RFD", new Date(NOW).getUTCFullYear());
        REFUNDS.unshift({
          no, caseRef: inv.caseRef ?? "", invoiceNo: inv.no!, paymentId: p.id, reason: "duplicate_payment", stage: "duplicate",
          requested: s.total, method: "original", status: "requested", chain: refundChain(s.total), requestedBy: me(), impact: [], auto: "duplicate", at: new Date().toISOString(), rev: 1,
        });
        l.match = "exception"; l.reason = `refund_proposed:${no}`; touch(l);
        record("refund.proposed", "refund", no, null, { status: "requested", amount: s.total, line: l.id }, "duplicate_payment");
        return ok({ line: lineView(l), refundNo: no });
      } else throw new FinError(404, "not_found");
      return ok({ line: lineView(l) });
    }));
  }),
  http.post("/api/finance/periods/:provider/:day/:action", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const provider = String(params.provider) as Provider, day = String(params.day), action = String(params.action);
    const b = await body<{ reason?: string }>(request);
    if (action === "reopen" && !stepUpOk(request)) return needStepUp();
    return idempotent(request, () => run(() => {
      if (!PROVIDERS.includes(provider) || !/^\d{4}-\d{2}(-\d{2})?$/.test(day)) throw new FinError(422, "validation");
      const month = day.length === 7;
      const before = { state: lockOf(provider, day) };
      if (action === "close") {
        if (before.state === "closed") throw new FinError(409, "conflict");
        const ls = LINES.filter((l) => importOf(l).provider === provider && (month ? l.occurredAt.startsWith(day) : dayOf(l.occurredAt) === day));
        if (!ls.length) throw new FinError(409, "unresolved_lines");
        if (closeBlockers(resultsOf(ls)).length) throw new FinError(409, "unresolved_lines");
        if (month && ls.some((l) => !isLocked(provider, dayOf(l.occurredAt)))) throw new FinError(409, "unresolved_lines");
        setLock(provider, day, "closed");
        record("recon.period.closed", "period", `${provider}:${day}`, before, { state: "closed" });
      } else if (action === "reopen") {
        if (!b.reason?.trim()) throw new FinError(422, "reason_required");
        if (before.state !== "closed") throw new FinError(409, "conflict");
        setLock(provider, day, "reopened", b.reason);
        record("recon.period.reopened", "period", `${provider}:${day}`, before, { state: "reopened" }, b.reason);
      } else throw new FinError(404, "not_found");
      return ok(overview(provider, month ? `${day}-01` : day));
    }));
  }),
  http.post("/api/finance/x/recon/verify-pending", async ({ request }) => {
    const g = guard(); if (g) return g;
    const b = await body<{ provider?: Provider }>(request);
    return idempotent(request, () => {
      let n = 0;
      for (const l of LINES.filter((x) => x.match === "suggested" && (!b.provider || importOf(x).provider === b.provider))) {
        const p = l.suggestionId ? payOf(l.suggestionId) : undefined;
        if (!p || p.state !== "pending_provider" || isLocked(importOf(l).provider, dayOf(l.occurredAt)) || (refOf(p) && refOf(p) !== l.externalRef)) continue;
        if (!refOf(p)) continue; // amount-only suggestions need a person (Accept)
        const before = settle(p, l.amount, "poll");
        l.match = "matched"; l.paymentId = p.id; p.reconciliationId = l.id; touch(l); n++;
        record("payment.confirmed", "payment", p.id, before, { state: p.state }, "verify_now");
      }
      return ok({ confirmed: n });
    });
  }),

  // ---------------- simulate (MockSimulator on payments / proofs pages)
  http.post("/api/finance/x/simulate/payment-webhook", () => {
    const g = guard(); if (g) return g;
    const p = PAYMENTS.find((x) => x.state === "pending_provider");
    if (!p) return ok({ n: 0 });
    const before = settle(p, p.amountExpected, "webhook");
    record("payment.confirmed", "payment", p.id, before, { state: p.state }, "webhook");
    return ok({ n: 1 });
  }),
  http.post("/api/finance/x/simulate/late-success", () => {
    const g = guard(); if (g) return g;
    let p = PAYMENTS.find((x) => x.state === "expired");
    if (!p) { p = PAYMENTS.find((x) => x.state === "pending_provider"); if (p) { p.state = "expired"; p.events.push({ at: new Date().toISOString(), kind: "expired", source: "system" }); } }
    if (!p) return ok({ n: 0 });
    const before = settle(p, p.amountExpected, "webhook", true);
    record("payment.status.overridden", "payment", p.id, before, { state: p.state }, "late_success");
    return ok({ n: 1 });
  }),
  http.post("/api/finance/x/simulate/proof-arrives", () => {
    const g = guard(); if (g) return g;
    const inv = INVOICES.find((i) => i.no && i.status === "issued" && !PAYMENTS.some((p) => p.invoiceNo === i.no && p.state !== "failed"));
    if (!inv) return ok({ n: 0 });
    const p: Payment = {
      id: `pay-p${String(++manN).padStart(3, "0")}`, invoiceNo: inv.no!, caseRef: inv.caseRef, clientId: inv.clientId, method: "bank_transfer", state: "proof_submitted",
      amountExpected: inv.balanceDue, bankReference: `BK FT${27_000 + manN}N`, proofDocId: `doc-proof-sim-${manN}`, chain: manualChain(inv.balanceDue), makerId: inv.clientId,
      events: [{ at: new Date().toISOString(), kind: "proof_submitted", source: "client" }], at: new Date().toISOString(), rev: 1,
    };
    PAYMENTS.unshift(p);
    record("payment.proof.submitted", "payment", p.id, null, { state: p.state }, undefined);
    return ok({ n: 1 });
  }),
  http.post("/api/finance/x/simulate/return-72h", () => {
    const g = guard(); if (g) return g;
    const hit = PAYMENTS.filter((p) => p.state === "under_verification" && p.chain?.some((s) => s.signedBy) && !chainComplete(p.chain));
    for (const p of hit) {
      p.state = "proof_submitted"; p.chain = manualChain(p.amountExpected); p.lockedBy = undefined; p.rev++;
      p.events.push({ at: new Date().toISOString(), kind: "returned_to_queue", source: "system" });
      record("payment.verification.returned", "payment", p.id, { state: "under_verification" }, { state: "proof_submitted" }, "72h");
    }
    return ok({ n: hit.length });
  }),
];

/** Needs-you states (UI filter chip "Needs you"). */
export const NEEDS_STATES = NEEDS;

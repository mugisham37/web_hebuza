// Stage 5 finance lane B mocks (U5–U7, U15): quotations, invoices, client credit, renewals.
// Spec paths: /api/finance/quotations*, /api/finance/invoices*. `x` = not in spec (listed in the hand-back).
// Every amount comes from lib/finance/money.ts; every mutation: guard → rev check → mutate → record() → ok().
// shortcut: client credit, reminders and quote extras live in this file's maps, upgrade to finance-world fields in Phase 2.
import { http, delay } from "msw";
import { ok, fail } from "./handlers-agent";
import { guard, stepUpOk, needStepUp, idempotent, failFrom } from "./handlers-finance";
import { CASES, CLIENTS, clientOf, serviceOf } from "./ops-world";
import { POLICY } from "@/shared/policy";
import {
  FinError, INVOICES, PAYMENTS, CREDIT_NOTES, QUOTES, USERS, actor, record, seq, today, NOW, W1_CASE,
} from "./finance-world";
import { applyPayment, depositSplit, docTotals } from "@/lib/finance/money";
import { canMove, isOverdue } from "@/lib/finance/states";
import type { DocLine, Invoice, Quote, Series, UserRef } from "@/shared/finance/types";
import type { Locale } from "@/shared/i18n/config";
import type { BillKind, InvoiceDetail, InvoiceRow, QuoteDetail, QuoteRec, QuoteRow, Reminder } from "@/lib/finance/b";

const H = 3600_000;
const at = (h: number) => new Date(NOW + h * H).toISOString();
const day = (d: number) => at(d * 24).slice(0, 10);
const YEAR = new Date(NOW).getUTCFullYear();
const me = (): UserRef => { const a = actor(); return { id: a.id, name: a.name }; };
const nameOf = (id: string) => CLIENTS.find((c) => c.id === id)?.name ?? id;

// ---------------------------------------------------------------- quote seed (QUOTES is empty in the world)
const W1_LINES: DocLine[] = [
  { kind: "service_fee", label: "Company registration · standard tier", qty: 1, unit: 50_000 },
  { kind: "urgent_surcharge", label: "Urgent surcharge 20%", qty: 1, unit: 10_000 },
  { kind: "government_fee", label: "RDB registration fee", qty: 1, unit: 0 },
  { kind: "third_party_cost", label: "Notary", qty: 1, unit: 10_000 },
];
const NOTES = { en: "Thank you for your business.", rw: "Murakoze kutugirira icyizere.", fr: "Merci de votre confiance." };
const TERMS = {
  en: "Valid until the date shown. Government fees are passed through at cost.",
  rw: "Bifite agaciro kugeza ku itariki yerekanwe. Amafaranga ya Leta yishyurwa uko ari.",
  fr: "Valable jusqu'à la date indiquée. Les frais publics sont refacturés au coût réel.",
};
const extra = new Map<string, { kind: BillKind; notes: Record<Locale, string>; terms: Record<Locale, string>; invoiceNos?: string[]; changedBy?: UserRef; changedAt?: string; history: { v: number; status: string; at: string; note?: string }[] }>();

function mkQuote(o: { caseRef: string; clientId: string; lines: DocLine[]; status: Quote["status"]; version: number; validDays: number; by: UserRef; sentH?: number; note?: string; no?: string }): QuoteRec {
  const no = o.no ?? seq.next("QUO", YEAR);
  const q: Quote = {
    no, caseRef: o.caseRef, clientId: o.clientId, version: o.version, status: o.status, lines: o.lines, totals: docTotals(o.lines),
    depositPct: null, validUntil: day(o.validDays), lang: clientOf(o.clientId).language as Locale, preparedBy: o.by,
    sentAt: o.sentH != null ? at(o.sentH) : undefined, respondedAt: ["accepted", "declined", "changes_requested"].includes(o.status) ? at((o.sentH ?? -30) + 6) : undefined,
    responseNote: o.note, rev: 1,
  };
  if (!extra.has(no)) {
    const c = CLIENTS.find((x) => x.id === o.clientId);
    extra.set(no, { kind: c?.type === "company" ? "company" : "individual", notes: { ...NOTES }, terms: { ...TERMS }, history: [] });
  }
  QUOTES.push(q);
  return view(q);
}
const unpriced = CASES.filter((c) => c.amount == null && c !== W1_CASE);
const priced = CASES.filter((c) => c.amount != null && c !== W1_CASE);
const caseFee = (c: (typeof CASES)[number]) => c.amount ?? serviceOf(c.service).fee ?? 100_000;
const feeLines = (c: (typeof CASES)[number], unit = caseFee(c)): DocLine[] => [{ kind: "service_fee", label: serviceOf(c.service).name, qty: 1, unit }];
(function seed() {
  const A = unpriced[0] ?? priced[0];
  const B = unpriced[1] ?? priced[1];
  // QT4: v1 → v2 → v3 accepted at 80,800 (no deposit, board fix).
  const a1 = mkQuote({ caseRef: A.ref, clientId: A.clientId, version: 1, status: "superseded", validDays: 10, by: USERS.finance, sentH: -70,
    lines: [...W1_LINES, { kind: "third_party_cost", label: "Courier", qty: 1, unit: 5_000 }] });
  mkQuote({ no: a1.no, caseRef: A.ref, clientId: A.clientId, version: 2, status: "superseded", validDays: 12, by: USERS.finance, sentH: -46,
    lines: [...W1_LINES, { kind: "third_party_cost", label: "Courier", qty: 1, unit: 2_000 }], note: "Please drop the courier, we will collect." });
  mkQuote({ no: a1.no, caseRef: A.ref, clientId: A.clientId, version: 3, status: "accepted", validDays: 12, by: USERS.finance, sentH: -22, lines: W1_LINES });
  extra.get(a1.no)!.history = [
    { v: 1, status: "sent", at: at(-70) }, { v: 1, status: "changes_requested", at: at(-50), note: "Can the courier be cheaper?" },
    { v: 2, status: "sent", at: at(-46) }, { v: 2, status: "changes_requested", at: at(-30), note: "Please drop the courier, we will collect." },
    { v: 3, status: "sent", at: at(-22) }, { v: 3, status: "accepted", at: at(-16) },
  ];
  // Large accepted quote → deposit 50% on convert (472,000 → 236,000 + 236,000).
  const b = mkQuote({ caseRef: B.ref, clientId: B.clientId, version: 1, status: "accepted", validDays: 9, by: USERS.finance, sentH: -40, lines: feeLines(B, 400_000) });
  extra.get(b.no)!.history = [{ v: 1, status: "sent", at: at(-40) }, { v: 1, status: "accepted", at: at(-20) }];
  const [p0, p1, p2, p3, p4, p5] = priced;
  const s = mkQuote({ caseRef: p0.ref, clientId: p0.clientId, version: 1, status: "sent", validDays: 1.5, by: USERS.sm, sentH: -12, lines: feeLines(p0) });
  extra.get(s.no)!.history = [{ v: 1, status: "sent", at: at(-12) }];
  mkQuote({ caseRef: p1.ref, clientId: p1.clientId, version: 1, status: "pending_approval", validDays: 14, by: USERS.sm, lines: feeLines(p1, 520_000) });
  mkQuote({ caseRef: p2.ref, clientId: p2.clientId, version: 1, status: "draft", validDays: 14, by: USERS.finance, lines: feeLines(p2) });
  const e = mkQuote({ caseRef: p3.ref, clientId: p3.clientId, version: 1, status: "expired", validDays: -2, by: USERS.finance, sentH: -24 * 16, lines: feeLines(p3) });
  extra.get(e.no)!.history = [{ v: 1, status: "sent", at: at(-24 * 16) }, { v: 1, status: "expired", at: at(-24 * 2) }];
  const d = mkQuote({ caseRef: p4.ref, clientId: p4.clientId, version: 1, status: "declined", validDays: 4, by: USERS.finance, sentH: -60, lines: feeLines(p4), note: "We found another provider." });
  extra.get(d.no)!.history = [{ v: 1, status: "sent", at: at(-60) }, { v: 1, status: "declined", at: at(-54), note: "We found another provider." }];
  const cr = mkQuote({ caseRef: p5.ref, clientId: p5.clientId, version: 1, status: "changes_requested", validDays: 6, by: USERS.finance, sentH: -30, lines: feeLines(p5), note: "Can you split the fee over two months?" });
  extra.get(cr.no)!.history = [{ v: 1, status: "sent", at: at(-30) }, { v: 1, status: "changes_requested", at: at(-24), note: "Can you split the fee over two months?" }];
})();

function view(q: Quote): QuoteRec {
  const x = extra.get(q.no)!;
  const c = CASES.find((k) => k.ref === q.caseRef);
  return { ...q, clientName: nameOf(q.clientId), service: c ? serviceOf(c.service).name : "", kind: x.kind, notes: x.notes, terms: x.terms,
    deposit: depositSplit(q.totals.total), invoiceNos: x.invoiceNos };
}
const versions = (no: string) => QUOTES.filter((q) => q.no === no).sort((a, b) => b.version - a.version);
const latest = (no: string) => versions(no)[0];
function quoteOr404(no: string) { const q = latest(no); if (!q) throw new FinError(404, "not_found"); return q; }
const LIVE = ["draft", "pending_approval", "sent", "changes_requested", "accepted"];
const touch = (no: string) => { const x = extra.get(no)!; x.changedBy = me(); x.changedAt = new Date().toISOString(); };
const hist = (no: string, v: number, status: string, note?: string) => extra.get(no)!.history.push({ v, status, at: new Date().toISOString(), note });

function quoteDetail(no: string): QuoteDetail {
  const vs = versions(no);
  const x = extra.get(no)!;
  return { versions: vs.map(view), history: [...x.history].reverse(), changedBy: x.changedBy, changedAt: x.changedAt,
    threshold: POLICY.quoteApprovalThreshold, validityDays: POLICY.quoteValidityDays };
}
const caseOptions = () => CASES.filter((c) => !(["completed", "cancelled", "refunded"] as string[]).includes(c.status)).map((c) => ({ ref: c.ref, clientId: c.clientId, clientName: nameOf(c.clientId), service: serviceOf(c.service).name }));

function validateLines(lines: DocLine[]) {
  if (!lines.length) throw new FinError(422, "validation");
  for (const l of lines) {
    const label = typeof l.label === "string" ? l.label : (l.label.en ?? "");
    if (!label.trim() || !Number.isInteger(l.qty) || l.qty < 1 || !Number.isInteger(l.unit) || l.unit < 0) throw new FinError(422, "validation");
  }
  if (docTotals(lines).total <= 0) throw new FinError(422, "validation");
}
function checkRev(rev: number | undefined, cur: number) { if (rev != null && rev !== cur) throw new FinError(409, "version_conflict"); }

// ---------------------------------------------------------------- invoices: keys, credit, reminders
const draftKey = new WeakMap<Invoice, string>();
let dn = 0;
const keyOf = (i: Invoice) => i.no ?? draftKey.get(i) ?? "";
const invOr404 = (k: string) => { const i = INVOICES.find((x) => keyOf(x) === k); if (!i) throw new FinError(404, "not_found"); return i; };
const invMeta = new Map<Invoice, { lang: Locale; quoteNo?: string; changedBy?: UserRef; changedAt?: string; reminders: Reminder[]; statement: { at: string; label: string; amount: number }[] }>();
const meta = (i: Invoice) => { if (!invMeta.has(i)) invMeta.set(i, { lang: "en", reminders: [], statement: [] }); return invMeta.get(i)!; };
/** Client credit balance (overpayments, cancelled-case credits). Board IN2: 12,000 available. */
const CREDIT = new Map<string, number>();
const firstPartial = INVOICES.find((i) => i.status === "partially_paid");
if (firstPartial) CREDIT.set(firstPartial.clientId, 12_000);
// One overdue reminder trail for the receivables link.
const overdueOne = INVOICES.find((i) => isOverdue(i, today()));
if (overdueOne) meta(overdueOne).reminders.push({ at: at(-30), channel: "email", by: USERS.finance.name, auto: true });

function ebmRequired(i: Invoice) { return i.status !== "draft" && i.status !== "void" && i.status !== "paid_by_plan"; }
function row(i: Invoice): InvoiceRow {
  return { ...i, key: keyOf(i), clientName: nameOf(i.clientId), overdue: isOverdue(i, today()), ebmRequired: ebmRequired(i) };
}
function invDetail(i: Invoice): InvoiceDetail {
  const m = meta(i);
  return {
    invoice: row(i), payments: PAYMENTS.filter((p) => i.no && p.invoiceNo === i.no), creditNotes: CREDIT_NOTES.filter((c) => c.invoiceNo === i.no),
    credit: CREDIT.get(i.clientId) ?? 0, reminders: [...m.reminders].reverse(), lang: m.lang, quoteNo: m.quoteNo, changedBy: m.changedBy, changedAt: m.changedAt,
    statement: m.statement, confirmedPayments: PAYMENTS.some((p) => p.invoiceNo === i.no && ["confirmed", "confirmed_late"].includes(p.state)),
  };
}
const invTouch = (i: Invoice) => { const m = meta(i); m.changedBy = me(); m.changedAt = new Date().toISOString(); i.rev++; };

function newInvoice(o: { clientId: string; caseRef?: string; series: Series; lines: DocLine[]; dueAt: string; lang?: Locale; subscriptionId?: string }): Invoice {
  const c = clientOf(o.clientId);
  const totals = docTotals(o.lines);
  const inv: Invoice = {
    no: null, series: o.series, caseRef: o.caseRef, subscriptionId: o.subscriptionId, clientId: o.clientId, billTo: { name: c.name, email: c.email },
    status: "draft", overdue: false, lines: o.lines, totals, amountPaid: 0, amountCredited: 0, balanceDue: totals.total, dueAt: o.dueAt, currency: "RWF", rev: 1,
  };
  draftKey.set(inv, `DRAFT-${++dn}`);
  INVOICES.push(inv);
  meta(inv).lang = o.lang ?? (c.language as Locale);
  return inv;
}
function issue(inv: Invoice) {
  if (!canMove("invoice", inv.status, "issued")) throw new FinError(409, "conflict");
  validateLines(inv.lines);
  const before = { status: inv.status, no: inv.no };
  inv.no = seq.next("INV", YEAR); // gapless, synchronous (two issuers never share a number)
  inv.status = "issued"; inv.issuedAt = new Date().toISOString();
  inv.totals = docTotals(inv.lines); inv.balanceDue = inv.totals.total - inv.amountPaid;
  invTouch(inv);
  record("invoice.issued", "invoice", inv.no, before, { status: inv.status, no: inv.no, total: inv.totals.total });
  return inv;
}

// ---------------------------------------------------------------- handlers
type Body = Record<string, unknown>;
const json = async (r: Request) => ((await r.json().catch(() => ({}))) as Body);
const run = (r: Request, fn: () => unknown) => idempotent(r, () => { try { return ok(fn()); } catch (e) { return failFrom(e); } });
const page = <T,>(items: T[], p: number, size = 20) => ({ items: items.slice((p - 1) * size, p * size), meta: { total: items.length, page: p, pages: Math.max(1, Math.ceil(items.length / size)) } });

export const handlers = [
  // ---- quotations
  http.get("/api/finance/quotations", async ({ request }) => {
    await delay(250);
    const g = guard(); if (g) return g;
    const q = new URL(request.url).searchParams;
    const state = q.get("state"), s = q.get("q")?.toLowerCase().trim(), p = Number(q.get("page") ?? 1) || 1;
    const all: QuoteRow[] = [...new Set(QUOTES.map((x) => x.no))].map((no) => view(latest(no))).sort((a, b) => b.no.localeCompare(a.no));
    const counts: Record<string, number> = { all: all.length };
    for (const r of all) counts[r.status] = (counts[r.status] ?? 0) + 1;
    const items = all.filter((r) => (!state || r.status === state) && (!s || [r.no, r.caseRef, r.clientName, r.service].some((v) => v.toLowerCase().includes(s))));
    return ok({ ...page(items, p), counts });
  }),
  http.get("/api/finance/quotations/x/cases", async () => { // x: case picker for "New quote"
    await delay(150);
    return guard() ?? ok({ items: caseOptions() });
  }),
  http.get("/api/finance/quotations/:no", async ({ params }) => {
    await delay(220);
    const g = guard(); if (g) return g;
    try { quoteOr404(String(params.no)); return ok(quoteDetail(String(params.no))); } catch (e) { return failFrom(e); }
  }),
  http.post("/api/finance/quotations", async ({ request }) => {
    const g = guard(); if (g) return g;
    const b = await json(request);
    return run(request, () => {
      const c = CASES.find((k) => k.ref === b.caseRef);
      if (!c) throw new FinError(422, "validation");
      const q = mkQuote({ caseRef: c.ref, clientId: c.clientId, version: 1, status: "draft", validDays: POLICY.quoteValidityDays, by: me(), lines: feeLines(c) });
      record("quote.created", "quote", q.no, null, { version: 1, total: q.totals.total });
      return { no: q.no };
    });
  }),
  http.patch("/api/finance/quotations/:no", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number; lines?: DocLine[]; lang?: Locale; validUntil?: string; kind?: BillKind; tin?: string; notes?: Record<Locale, string>; terms?: Record<Locale, string> };
    try {
      const q = quoteOr404(String(params.no));
      if (q.status !== "draft") throw new FinError(409, "conflict");
      checkRev(b.rev, q.rev);
      const x = extra.get(q.no)!;
      if (b.lines) { q.lines = b.lines; q.totals = docTotals(b.lines); }
      if (b.lang) q.lang = b.lang;
      if (b.validUntil) q.validUntil = b.validUntil.slice(0, 10);
      if (b.tin !== undefined) q.orgTin = b.tin || undefined;
      if (b.kind) x.kind = b.kind;
      if (b.notes) x.notes = b.notes;
      if (b.terms) x.terms = b.terms;
      q.rev++; touch(q.no);
      // Autosave is not audited per keystroke; send/approve/convert are.
      return ok(quoteDetail(q.no));
    } catch (e) { return failFrom(e); }
  }),
  http.post("/api/finance/quotations/:no/send", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number; channels?: string[]; message?: string };
    return run(request, () => {
      const q = quoteOr404(String(params.no));
      checkRev(b.rev, q.rev);
      if (versions(q.no).some((v) => v !== q && v.status === "accepted")) throw new FinError(409, "conflict");
      if (!canMove("quote", q.status, "sent")) throw new FinError(409, "conflict");
      validateLines(q.lines);
      if (q.validUntil < today()) throw new FinError(409, "quote_expired");
      if (!b.channels?.length || (b.message ?? "").length > 200) throw new FinError(422, "validation");
      const before = { status: q.status };
      for (const v of versions(q.no)) if (v !== q && ["sent", "changes_requested", "expired", "declined"].includes(v.status)) v.status = "superseded";
      const self = me();
      if (q.totals.total > POLICY.quoteApprovalThreshold) q.approvedBy = self;
      q.status = "sent"; q.sentAt = new Date().toISOString(); q.rev++; touch(q.no); hist(q.no, q.version, "sent");
      record("quote.sent", "quote", q.no, before, { status: q.status, version: q.version, channels: b.channels, total: q.totals.total });
      return quoteDetail(q.no);
    });
  }),
  http.post("/api/finance/quotations/:no/approve", async ({ request, params }) => { // x: finance approves an SM quote over threshold, then it sends
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number };
    return run(request, () => {
      const q = quoteOr404(String(params.no));
      checkRev(b.rev, q.rev);
      if (q.status !== "pending_approval") throw new FinError(409, "conflict");
      if (q.preparedBy.id === actor().id) throw new FinError(403, "same_approver");
      if (q.validUntil < today()) throw new FinError(409, "quote_expired");
      q.approvedBy = me(); q.status = "sent"; q.sentAt = new Date().toISOString(); q.rev++; touch(q.no); hist(q.no, q.version, "sent");
      record("quote.approved", "quote", q.no, { status: "pending_approval" }, { status: "sent", approvedBy: q.approvedBy.name });
      return quoteDetail(q.no);
    });
  }),
  http.post("/api/finance/quotations/:no/withdraw", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number; reason?: string };
    return run(request, () => {
      const q = quoteOr404(String(params.no));
      checkRev(b.rev, q.rev);
      if (!b.reason?.trim()) throw new FinError(422, "reason_required");
      if (!canMove("quote", q.status, "withdrawn")) throw new FinError(409, "conflict");
      q.status = "withdrawn"; q.rev++; touch(q.no); hist(q.no, q.version, "withdrawn", b.reason);
      record("quote.withdrawn", "quote", q.no, { status: "sent" }, { status: "withdrawn" }, b.reason);
      return quoteDetail(q.no);
    });
  }),
  http.post("/api/finance/quotations/:no/revise", async ({ request, params }) => { // x: new draft vN+1 from the latest version
    const g = guard(); if (g) return g;
    return run(request, () => {
      const q = quoteOr404(String(params.no));
      if (!["sent", "changes_requested", "expired", "declined", "withdrawn"].includes(q.status)) throw new FinError(409, "conflict");
      if (versions(q.no).some((v) => v.status === "accepted")) throw new FinError(409, "conflict");
      const n = mkQuote({ no: q.no, caseRef: q.caseRef, clientId: q.clientId, version: q.version + 1, status: "draft", validDays: POLICY.quoteValidityDays, by: me(), lines: q.lines.map((l) => ({ ...l })) });
      touch(q.no); hist(q.no, n.version, "draft");
      record("quote.revised", "quote", q.no, { version: q.version }, { version: n.version });
      return quoteDetail(q.no);
    });
  }),
  http.post("/api/finance/quotations/:no/convert", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number };
    return run(request, () => {
      const q = quoteOr404(String(params.no));
      checkRev(b.rev, q.rev);
      if (!canMove("quote", q.status, "converted")) throw new FinError(409, "conflict");
      const split = depositSplit(q.totals.total);
      const due = day(POLICY.invoiceTermsDays);
      const made: Invoice[] = [];
      if (split) {
        // shortcut: deposit invoice carries one non-VAT "other" line (VAT sits inside the quoted total); balance invoice keeps
        // the quoted lines less the deposit. Upgrade when the spec fixes deposit-invoice VAT treatment.
        made.push(newInvoice({ clientId: q.clientId, caseRef: q.caseRef, series: "deposit", dueAt: day(2), lang: q.lang,
          lines: [{ kind: "other", label: `Deposit · ${q.no} v${q.version}`, qty: 1, unit: split.deposit, taxable: false }] }));
        made.push(newInvoice({ clientId: q.clientId, caseRef: q.caseRef, series: "standard", dueAt: due, lang: q.lang,
          lines: [...q.lines.map((l) => ({ ...l })), { kind: "other", label: `Less deposit · ${q.no}`, qty: 1, unit: -split.deposit, taxable: false }] }));
      } else made.push(newInvoice({ clientId: q.clientId, caseRef: q.caseRef, series: "standard", dueAt: due, lang: q.lang, lines: q.lines.map((l) => ({ ...l })) }));
      for (const inv of made) { issue(inv); meta(inv).quoteNo = q.no; }
      q.status = "converted"; q.rev++; touch(q.no); hist(q.no, q.version, "converted");
      const nos = made.map((i) => i.no!);
      extra.get(q.no)!.invoiceNos = nos;
      record("quote.converted", "quote", q.no, { status: "accepted" }, { status: "converted", invoices: nos });
      return { invoiceNos: nos };
    });
  }),

  // ---- invoices
  http.get("/api/finance/invoices", async ({ request }) => {
    await delay(260);
    const g = guard(); if (g) return g;
    const q = new URL(request.url).searchParams;
    const state = q.get("state"), series = q.get("series"), client = q.get("client"), due = q.get("due"), ebm = q.get("ebm"),
      overdue = q.get("overdue") === "1", s = q.get("q")?.toLowerCase().trim(), p = Number(q.get("page") ?? 1) || 1;
    const t = today();
    const dueBy = due === "week" ? day(7) : due === "month" ? day(30) : null;
    const rows = INVOICES.map(row).filter((r) =>
      (!state || r.status === state) && (!series || r.series === series) && (!client || r.clientId === client) &&
      (!dueBy || (!!r.dueAt && r.dueAt.slice(0, 10) >= t && r.dueAt.slice(0, 10) <= dueBy && r.balanceDue > 0)) &&
      (!ebm || (ebm === "missing" ? r.ebmRequired && !r.ebmReceiptNo : !!r.ebmReceiptNo)) && (!overdue || r.overdue) &&
      (!s || [r.no ?? "", r.caseRef ?? "", r.clientName].some((v) => v.toLowerCase().includes(s))))
      .sort((a, b) => (b.issuedAt ?? "9").localeCompare(a.issuedAt ?? "9"));
    // Totals for the whole filter, not the page (U7).
    const totals = rows.filter((r) => r.status !== "void").reduce((acc, r) => ({ total: acc.total + r.totals.total, paid: acc.paid + r.amountPaid, balance: acc.balance + r.balanceDue }), { total: 0, paid: 0, balance: 0 });
    const clients = [...new Set(INVOICES.map((i) => i.clientId))].map((id) => ({ id, name: nameOf(id) }));
    const pg = page(rows, p);
    return ok({ items: pg.items, meta: { ...pg.meta, totals, clients } });
  }),
  http.get("/api/finance/invoices/x/form", async () => { // x: clients, cases and defaults for /invoices/new
    await delay(150);
    return guard() ?? ok({ clients: CLIENTS.map((c) => ({ id: c.id, name: c.name, type: c.type })), cases: caseOptions(), termsDays: POLICY.invoiceTermsDays, today: today() });
  }),
  http.get("/api/finance/invoices/:key", async ({ params }) => {
    await delay(220);
    const g = guard(); if (g) return g;
    try { return ok(invDetail(invOr404(String(params.key)))); } catch (e) { return failFrom(e); }
  }),
  http.post("/api/finance/invoices", async ({ request }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { clientId?: string; caseRef?: string; series?: Series; lines?: DocLine[]; dueAt?: string; lang?: Locale; issue?: boolean };
    return run(request, () => {
      if (!b.clientId || !CLIENTS.some((c) => c.id === b.clientId)) throw new FinError(422, "validation");
      if (b.caseRef && !CASES.some((c) => c.ref === b.caseRef && c.clientId === b.clientId)) throw new FinError(422, "validation");
      if (!b.dueAt || b.dueAt.slice(0, 10) < today()) throw new FinError(422, "validation");
      validateLines(b.lines ?? []);
      const inv = newInvoice({ clientId: b.clientId, caseRef: b.caseRef || undefined, series: b.series === "plan" ? "plan" : "standard", lines: b.lines!, dueAt: b.dueAt.slice(0, 10), lang: b.lang });
      record("invoice.draft.created", "invoice", keyOf(inv), null, { total: inv.totals.total });
      return { key: keyOf(inv) };
    });
  }),
  http.patch("/api/finance/invoices/:key", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number; lines?: DocLine[]; dueAt?: string; lang?: Locale };
    try {
      const inv = invOr404(String(params.key));
      if (inv.status !== "draft") throw new FinError(409, "conflict"); // invoices are immutable after issue
      checkRev(b.rev, inv.rev);
      if (b.lines) { inv.lines = b.lines; inv.totals = docTotals(b.lines); inv.balanceDue = inv.totals.total; }
      if (b.dueAt) inv.dueAt = b.dueAt.slice(0, 10);
      if (b.lang) meta(inv).lang = b.lang;
      invTouch(inv);
      return ok(invDetail(inv));
    } catch (e) { return failFrom(e); }
  }),
  http.post("/api/finance/invoices/:key/issue", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number };
    return run(request, () => { const inv = invOr404(String(params.key)); checkRev(b.rev, inv.rev); issue(inv); return invDetail(inv); });
  }),
  http.post("/api/finance/invoices/:key/void", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await json(request) as { rev?: number; reason?: string; note?: string };
    return run(request, () => {
      const inv = invOr404(String(params.key));
      checkRev(b.rev, inv.rev);
      if (!b.reason || !b.note?.trim()) throw new FinError(422, "reason_required");
      if (inv.amountPaid > 0 || PAYMENTS.some((p) => p.invoiceNo === inv.no && ["confirmed", "confirmed_late"].includes(p.state))) throw new FinError(409, "invoice_settled");
      if (!canMove("invoice", inv.status, "void")) throw new FinError(409, "conflict");
      const before = { status: inv.status };
      inv.status = "void"; inv.voidReason = `${b.reason}: ${b.note}`; inv.balanceDue = 0; invTouch(inv);
      record("invoice.voided", "invoice", keyOf(inv), before, { status: "void", no: inv.no }, inv.voidReason);
      return invDetail(inv);
    });
  }),
  http.post("/api/finance/invoices/:key/apply-credit", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number; amount?: number };
    return run(request, () => {
      const inv = invOr404(String(params.key));
      checkRev(b.rev, inv.rev);
      const credit = CREDIT.get(inv.clientId) ?? 0;
      const amount = b.amount ?? 0;
      if (!["issued", "partially_paid"].includes(inv.status) || inv.balanceDue <= 0) throw new FinError(409, "invoice_settled");
      if (!Number.isInteger(amount) || amount <= 0) throw new FinError(422, "validation");
      if (amount > credit) throw new FinError(422, "exceeds_credit");
      if (amount > inv.balanceDue) throw new FinError(422, "exceeds_invoice");
      const r = applyPayment(inv, amount);
      const before = { amountPaid: inv.amountPaid, balanceDue: inv.balanceDue, status: inv.status, credit };
      inv.amountPaid += r.applied; inv.balanceDue -= r.applied; inv.status = r.status === "issued" ? inv.status : r.status;
      CREDIT.set(inv.clientId, credit - r.applied);
      meta(inv).statement.push({ at: new Date().toISOString(), label: "credit_applied", amount: r.applied });
      invTouch(inv);
      record("invoice.credit_applied", "invoice", keyOf(inv), before, { amountPaid: inv.amountPaid, balanceDue: inv.balanceDue, status: inv.status, credit: credit - r.applied });
      return invDetail(inv);
    });
  }),
  http.post("/api/finance/invoices/:key/ebm", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { rev?: number; no?: string };
    return run(request, () => {
      const inv = invOr404(String(params.key));
      checkRev(b.rev, inv.rev);
      const no = (b.no ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9-]{4,30}$/.test(no)) throw new FinError(422, "validation");
      if (inv.status === "draft" || inv.status === "void") throw new FinError(409, "conflict");
      const before = { ebmReceiptNo: inv.ebmReceiptNo ?? null };
      inv.ebmReceiptNo = no; invTouch(inv);
      record("invoice.ebm.recorded", "invoice", keyOf(inv), before, { ebmReceiptNo: no });
      return invDetail(inv);
    });
  }),
  http.post("/api/finance/invoices/:key/remind", async ({ request, params }) => {
    const g = guard(); if (g) return g;
    const b = await json(request) as { channel?: Reminder["channel"] };
    return run(request, () => {
      const inv = invOr404(String(params.key));
      if (inv.balanceDue <= 0 || inv.status === "draft" || inv.status === "void") throw new FinError(409, "invoice_settled");
      if (!b.channel) throw new FinError(422, "validation");
      meta(inv).reminders.push({ at: new Date().toISOString(), channel: b.channel, by: me().name });
      record("invoice.reminder.sent", "invoice", keyOf(inv), null, { channel: b.channel }, undefined, "communication");
      return invDetail(inv);
    });
  }),

  // ---- simulate (mock only)
  http.post("/api/finance/x/simulate/quote_accept", async () => {
    const g = guard(); if (g) return g;
    const q = QUOTES.filter((x) => x.status === "sent").sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))[0];
    if (!q) return fail(404, "not_found", "No sent quote");
    q.status = "accepted"; q.respondedAt = new Date().toISOString(); q.rev++;
    const x = extra.get(q.no)!; x.changedBy = { id: q.clientId, name: nameOf(q.clientId) }; x.changedAt = q.respondedAt; hist(q.no, q.version, "accepted");
    record("quote.accepted", "quote", q.no, { status: "sent" }, { status: "accepted" });
    return ok({ no: q.no });
  }),
  http.post("/api/finance/x/simulate/quote_touch", async () => { // someone else edits the newest draft → next save conflicts
    const g = guard(); if (g) return g;
    const q = QUOTES.filter((x) => x.status === "draft").sort((a, b) => b.no.localeCompare(a.no))[0];
    if (!q) return fail(404, "not_found", "No draft");
    q.rev++; const x = extra.get(q.no)!; x.changedBy = USERS.finance2; x.changedAt = new Date().toISOString();
    return ok({ no: q.no });
  }),
  http.post("/api/finance/x/simulate/renewal_job", async () => { // U15: monthly plan renewals → series "plan" invoices
    const g = guard(); if (g) return g;
    const subs = CLIENTS.filter((c) => (c.flags as readonly string[]).includes("subscriber"));
    const made = subs.map((c) => {
      const inv = newInvoice({ clientId: c.id, series: "plan", subscriptionId: `sub-${c.id}`, dueAt: day(POLICY.invoiceTermsDays),
        lines: [{ kind: "service_fee", label: `Plan renewal · ${new Date(NOW).toLocaleString("en", { month: "long", timeZone: "Africa/Kigali" })}`, qty: 1, unit: 30_000 }] }); // PLACEHOLDER(plan-price) demo renewal amount
      issue(inv);
      return inv.no;
    });
    return ok({ invoices: made });
  }),
];

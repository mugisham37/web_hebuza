// Stage 5 finance lane E mocks: U13 Revenue (allocations, rules, adjustments, fees) + U14 Payout batches.
// Spec paths from plan §9.2; `x` = not in the spec. Every amount comes from lib/finance/money.ts; every mutation runs
// guard → step-up → idempotent → state guards → mutate → record() → ok.
// shortcut: lane-local side tables (rev, chains, destinations, line parts) live here, upgrade by moving them into finance-world (hand-back).
import { http, delay, type HttpHandler } from "msw";
import { ok, fail } from "./handlers-agent";
import { guard, stepUpOk, needStepUp, idempotent, failFrom } from "./handlers-finance";
import {
  ADJUSTMENTS, ALLOCATIONS, BATCHES, CREDIT_NOTES, FEES, FinError, INVOICES, NOW, RULES, USERS,
  actor, allocationsFor, isFinanceUser, record, today, type Actor,
} from "./finance-world";
import { AGENTS, CASES, SERVICES, clientOf, serviceOf } from "./ops-world";
import { POLICY } from "@/shared/policy";
import { allocate, payoutLine } from "@/lib/finance/money";
import { adjustmentChain, batchChain, canSign, ruleChain, sign } from "@/shared/finance/approvals";
import { canMove } from "@/lib/finance/states";
import { isRetroactive, resolveRule, rulesOverlap } from "@/shared/finance/rules";
import { batchNo } from "@/shared/finance/numbering";
import type { AdjReason, Adjustment, AgentFee, Allocation, ExportFile, PayoutBatch, PayoutLine, Rule, Step } from "@/shared/finance/types";
import type { AdjView, AllocView, BatchView, FeeView, LineView, Preview, RuleView, Who } from "@/lib/finance/e";

// ---------------------------------------------------------------- helpers
const nowIso = () => new Date().toISOString();
const isExec = (a: Actor) => a.roles.includes("staff:executive");
const ref = (a: Actor) => ({ id: a.id, name: a.name });
const nameOf = (id: string) => AGENTS.find((x) => x.id === id)?.name ?? id;
const kindOf = (id: string): "internal" | "external" => ((AGENTS.find((x) => x.id === id) as { external?: boolean } | undefined)?.external ? "external" : "internal");
const who = (id: string): Who => ({ id, name: nameOf(id), kind: kindOf(id) });
const caseOf = (r: string) => CASES.find((c) => c.ref === r);
const month = (iso: string) => iso.slice(0, 7);
async function body<T>(r: Request): Promise<T> {
  try { return (await r.json()) as T; } catch { return {} as T; }
}
const run = (fn: () => Response) => { try { return fn(); } catch (e) { return failFrom(e); } };
const need = (cond: unknown, status: number, code: string) => { if (!cond) throw new FinError(status, code); };
/** Tiny deterministic checksum for export files (FNV-1a, 8 hex). */
const checksum = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).toUpperCase().padStart(8, "0");
};

// ---------------------------------------------------------------- side tables
const allocMeta = new Map<string, { rev: number; last?: { by: string; at: string }; queryNote?: string }>();
const am = (id: string) => allocMeta.get(id) ?? (allocMeta.set(id, { rev: 1 }), allocMeta.get(id)!);
const ruleChains = new Map<string, Step[]>();
const adjMeta = new Map<string, { chain: Step[]; createdBy: { id: string; name: string }; at: string }>();
type LineMeta = { parts: LineView["parts"]; carriedIn: number; taxable: number; failReason?: string; paidAt?: string; carriedFrom: string[] };
type BatchMeta = { chain: Step[]; rev: number; last?: { by: string; at: string }; rejectNote?: string; statementsAt?: number; lines: Map<string, LineMeta> };
const batchMeta = new Map<string, BatchMeta>();
/** Lines already carried into a later batch (failed nets / negative carry-forwards). */
const consumed = new Set<string>();

/** Payout destinations (REV §13). One unverified and one in 48 h cooling so the builder blockers are real (D-14). */
const DEST: Record<string, PayoutLine["destination"] & { method: PayoutLine["method"] }> = {
  "ag-eric": { method: "mtn_momo", masked: "•••• 0214", verified: true },
  "ag-grace": { method: "airtel_money", masked: "•••• 7731", verified: true },
  "ag-jp": { method: "bank", masked: "BK •••• 4410", verified: true },
  "ag-patrick": { method: "bank", masked: "EQ •••• 9902", verified: true },
  "ag-claudine": { method: "mtn_momo", masked: "•••• 5528", verified: false },
  "ag-david": { method: "airtel_money", masked: "•••• 3307", verified: true, coolingUntil: new Date(NOW + 30 * 3600_000).toISOString() },
};
const destOf = (id: string) => DEST[id] ?? { method: "mtn_momo" as const, masked: "•••• 0000", verified: true };

// Seed: existing closed batches get a signed chain + line parts; allocations get a version.
for (const b of BATCHES) {
  const lines = new Map<string, LineMeta>();
  for (const l of b.lines) {
    const al = ALLOCATIONS.filter((a) => a.batchNo === b.no && a.shares.some((s) => s.workerId === l.workerId));
    lines.set(l.id, {
      parts: { allocations: al.map((a) => ({ id: a.id, caseRef: a.caseRef, amount: a.shares.find((s) => s.workerId === l.workerId)!.amount })), adjustments: [], fees: [] },
      carriedIn: 0, taxable: l.gross + l.adjustments, carriedFrom: [], paidAt: `${b.period}-0${POLICY.payoutDay}T09:00:00.000Z`,
    });
  }
  batchMeta.set(b.no, { chain: sign(sign(batchChain(b.totals.net), b.preparedBy, `${b.period}-03T09:00:00.000Z`), b.authorisedBy ?? USERS.finance2, `${b.period}-04T09:00:00.000Z`), rev: 1, lines });
}
// Seed: one manual correction waiting for its second signer ("wrong payout → adjustment next statement").
{
  const a: Adjustment = { id: "adj-0001", workerId: "ag-grace", amount: -2_000, reason: "correction", note: "Overpaid in the September batch", status: "proposed" };
  ADJUSTMENTS.push(a);
  adjMeta.set(a.id, { chain: sign(adjustmentChain(a), USERS.finance, new Date(NOW - 5 * 3600_000).toISOString()), createdBy: USERS.finance, at: new Date(NOW - 5 * 3600_000).toISOString() });
}
// Seed: Patrick Mugisha (external) has an approved allocation so the WHT + licence row exists (board 11 fix → W13 shape).
{
  const c = CASES.find((x) => x.assignees.some((s) => s.id === "ag-patrick") && !ALLOCATIONS.some((a) => a.caseRef === x.ref));
  const al = ALLOCATIONS.find((a) => a.status === "approved_for_payment");
  if (c && !ALLOCATIONS.some((a) => a.shares.some((s) => s.workerId === "ag-patrick") && a.status === "approved_for_payment") && al)
    ALLOCATIONS.push({ ...al, id: "al-ext-1", caseRef: c.ref, shares: [{ workerId: "ag-patrick", kind: "external", pct: 10_000, amount: al.pool }], approvedBy: USERS.finance2 });
}
let adjN = ADJUSTMENTS.length, ruleN = RULES.length, feeN = FEES.length;

// ---------------------------------------------------------------- views
const allocCan = (a: Allocation, me: Actor) => {
  const fin = isFinanceUser(me), exec = isExec(me);
  return {
    approve: (fin || exec) && a.status === "reviewed",
    query: fin && a.status === "reviewed",
    hold: fin && canMove("allocation", a.status, "on_hold"),
    void: fin && canMove("allocation", a.status, "voided"),
    answer: fin && a.question?.status === "open",
  };
};
function allocView(a: Allocation, me = actor()): AllocView {
  const c = caseOf(a.caseRef);
  const invs = INVOICES.filter((i) => a.invoiceNos.includes(i.no ?? ""));
  const rule = RULES.find((r) => r.id === a.ruleId);
  const approved = ["approved_for_payment", "in_batch", "paid"].includes(a.status);
  const m = am(a.id);
  return {
    ...a, serviceName: c ? serviceOf(c.service).name : "—", clientName: c ? clientOf(c.clientId).name : "—", completedAt: a.frozenAt,
    shares: a.shares.map((s) => ({ ...s, name: nameOf(s.workerId) })),
    rule: { scope: rule?.scope ?? "global", from: rule?.from ?? "", to: rule?.to },
    credits: CREDIT_NOTES.filter((n) => a.invoiceNos.includes(n.invoiceNo)).reduce((s, n) => s + Math.abs(n.eligible), 0),
    five: {
      invoiced: invs.reduce((s, i) => s + i.totals.total, 0), collected: invs.reduce((s, i) => s + i.amountPaid, 0),
      allocated: a.pool, approved: approved ? a.pool : 0, paid: a.status === "paid" ? a.pool : 0,
    },
    rev: m.rev, last: m.last, can: allocCan(a, me), waitingFor: a.status === "pending_review" ? USERS.sm.name : undefined,
  };
}
const scopeLabel = (r: Rule) =>
  r.scope === "global" ? "" : r.scope === "service" ? serviceOf(r.serviceSlug ?? "").name
    : r.scope === "agent" ? nameOf(r.agentId ?? "") : r.scope === "agent_service" ? `${nameOf(r.agentId ?? "")} · ${serviceOf(r.serviceSlug ?? "").name}` : (r.contractId ?? "");
function ruleView(r: Rule, me = actor()): RuleView {
  let chain = ruleChains.get(r.id);
  if (!chain) {
    chain = sign(ruleChain(r.agentPct), USERS.finance, `${r.from}T08:00:00.000Z`);
    if (r.approvedBy) chain = sign(chain, r.approvedBy, `${r.from}T09:00:00.000Z`);
  }
  const proposer = chain[0]?.signedBy?.id ?? "";
  return {
    ...r, label: scopeLabel(r), agentName: r.agentId ? nameOf(r.agentId) : undefined, serviceName: r.serviceSlug ? serviceOf(r.serviceSlug).name : undefined, chain,
    can: { approve: r.status === "pending_approval" && isExec(me) && me.id !== proposer, end: isFinanceUser(me) && r.scope !== "global" && (r.status === "active" || r.status === "scheduled") && !r.to },
  };
}
function adjView(a: Adjustment, me = actor()): AdjView {
  const m = adjMeta.get(a.id) ?? { chain: [], createdBy: USERS.finance, at: nowIso() };
  const al = a.allocationId ? ALLOCATIONS.find((x) => x.id === a.allocationId) : undefined;
  return { ...a, workerName: nameOf(a.workerId), caseRef: al?.caseRef, chain: m.chain, createdBy: m.createdBy, at: m.at,
    can: { approve: a.status === "proposed" && m.chain.length > 0 && canSign(m.chain, me, [m.createdBy.id]).ok } };
}
const feeView = (f: AgentFee): FeeView => ({ ...f, workerName: nameOf(f.workerId) });

function sumTotals(lines: (PayoutLine & { status: string })[]): PayoutBatch["totals"] {
  const live = lines.filter((l) => l.status !== "excluded");
  const s = (k: "gross" | "adjustments" | "fees" | "wht" | "net" | "carryForward") => live.reduce((t, l) => t + l[k], 0);
  return { gross: s("gross"), adjustments: s("adjustments"), fees: s("fees"), wht: s("wht"), net: s("net"), carried: s("carryForward") };
}
function lineView(b: PayoutBatch, l: PayoutLine): LineView {
  const m = batchMeta.get(b.no)?.lines.get(l.id);
  return { ...l, name: nameOf(l.workerId), kind: kindOf(l.workerId), taxable: m?.taxable ?? l.gross + l.adjustments, carriedIn: m?.carriedIn ?? 0,
    parts: m?.parts ?? { allocations: [], adjustments: [], fees: [] }, failReason: m?.failReason, paidAt: m?.paidAt };
}
function batchView(b: PayoutBatch, me = actor()): BatchView {
  const m = batchMeta.get(b.no)!;
  const prev = BATCHES.filter((x) => x.period < b.period && x.status === "closed").sort((x, y) => y.period.localeCompare(x.period))[0];
  const fin = isFinanceUser(me), isPrep = me.id === b.preparedBy.id;
  const sc = canSign(m.chain, me, [b.preparedBy.id]);
  if (m.statementsAt && Date.now() > m.statementsAt) m.statementsAt = 0;
  return {
    ...b, lines: b.lines.map((l) => lineView(b, l)), chain: m.chain, agents: b.lines.filter((l) => l.status !== "excluded").length, rev: m.rev, last: m.last,
    vsLast: prev ? { net: prev.totals.net, pct: prev.totals.net ? Math.round(((b.totals.net - prev.totals.net) * 100) / prev.totals.net) : 0 } : null,
    rejectNote: m.rejectNote, statements: b.status === "closed" && m.statementsAt !== undefined ? (m.statementsAt ? "running" : "ready") : undefined,
    can: {
      submit: fin && b.status === "draft", authorise: b.status === "submitted" && sc.ok, reject: b.status === "submitted" && sc.ok,
      execute: fin && b.status === "authorised", mark: fin && b.status === "executing", close: fin && (b.status === "paid" || b.status === "partially_paid"),
      exclude: fin && b.status === "draft", export: (fin || isExec(me)) && ["authorised", "executing", "paid", "partially_paid", "closed"].includes(b.status),
    },
    whyNot: b.status !== "submitted" ? "status" : isPrep ? "preparer" : sc.ok ? undefined : "role",
  };
}

// ---------------------------------------------------------------- payout preview (builder step 2)
type Draft = { lines: (PayoutLine & { meta: LineMeta })[]; blockers: Preview["blockers"] };
function buildLines(period: string, excluded: string[], no: string): Draft {
  const gross = new Map<string, { id: string; caseRef: string; amount: number }[]>();
  for (const a of ALLOCATIONS) if (a.status === "approved_for_payment" && month(a.frozenAt) <= period)
    for (const s of a.shares) gross.set(s.workerId, [...(gross.get(s.workerId) ?? []), { id: a.id, caseRef: a.caseRef, amount: s.amount }]);
  const adj = new Map<string, { id: string; amount: number; reason: string }[]>();
  for (const a of ADJUSTMENTS) if (a.status === "approved") adj.set(a.workerId, [...(adj.get(a.workerId) ?? []), { id: a.id, amount: a.amount, reason: a.reason }]);
  const fees = new Map<string, { id: string; month: string; amount: number }[]>();
  for (const f of FEES) if (f.status === "due" && f.month <= period && kindOf(f.workerId) === "external") fees.set(f.workerId, [...(fees.get(f.workerId) ?? []), { id: f.id, month: f.month, amount: f.amount }]);
  const carry = new Map<string, { id: string; amount: number }[]>();
  for (const b of BATCHES) for (const l of b.lines) if (!consumed.has(l.id)) {
    const m = batchMeta.get(b.no)?.lines.get(l.id);
    // Failed line → its pre-tax amount comes back as a positive carry-in; a negative net carries its shortfall.
    if (b.status === "closed" && l.status === "failed") carry.set(l.workerId, [...(carry.get(l.workerId) ?? []), { id: l.id, amount: m?.taxable ?? l.net }]);
    else if (b.status === "closed" && l.carryForward < 0) carry.set(l.workerId, [...(carry.get(l.workerId) ?? []), { id: l.id, amount: l.carryForward }]);
  }
  const workers = [...new Set([...gross.keys(), ...adj.keys(), ...carry.keys()])].sort((x, y) => nameOf(x).localeCompare(nameOf(y)));
  const blockers: Preview["blockers"] = [];
  const lines = workers.map((w, i) => {
    const g = (gross.get(w) ?? []).reduce((s, x) => s + x.amount, 0);
    const ad = (adj.get(w) ?? []).reduce((s, x) => s + x.amount, 0);
    const fe = (fees.get(w) ?? []).reduce((s, x) => s + x.amount, 0);
    const ci = (carry.get(w) ?? []).reduce((s, x) => s + x.amount, 0);
    const external = kindOf(w) === "external";
    const r = payoutLine({ gross: g, adjustments: ad, fees: fe, external, carried: ci });
    const d = destOf(w);
    const out = excluded.includes(w);
    if (!out && !d.verified) blockers.push({ workerId: w, name: nameOf(w), kind: "unverified" });
    else if (!out && d.coolingUntil && Date.parse(d.coolingUntil) > Date.now()) blockers.push({ workerId: w, name: nameOf(w), kind: "cooling", until: d.coolingUntil });
    return {
      id: `pl-${no}-${i}`, workerId: w, gross: g, adjustments: ad, fees: r.fees, wht: r.wht, net: r.net, carryForward: r.carryForward,
      method: d.method, destination: { masked: d.masked, verified: d.verified, coolingUntil: d.coolingUntil }, status: out ? ("excluded" as const) : ("pending" as const),
      meta: { parts: { allocations: gross.get(w) ?? [], adjustments: adj.get(w) ?? [], fees: external ? (fees.get(w) ?? []) : [] }, carriedIn: ci, taxable: r.taxable, carriedFrom: (carry.get(w) ?? []).map((x) => x.id) },
    };
  });
  return { lines, blockers };
}
const periodNo = (period: string, runNo: number) => batchNo(Number(period.slice(0, 4)), Number(period.slice(5, 7)), runNo);
const batchOf = (no: string) => {
  const b = BATCHES.find((x) => x.no === no);
  if (!b) throw new FinError(404, "not_found");
  return b;
};
const lineOf = (id: string) => {
  for (const b of BATCHES) { const l = b.lines.find((x) => x.id === id); if (l) return { b, l }; }
  throw new FinError(404, "not_found");
};
function bump(b: PayoutBatch) {
  const m = batchMeta.get(b.no)!;
  m.rev++; m.last = { by: actor().name, at: nowIso() };
  b.totals = sumTotals(b.lines);
}
function settleStatus(b: PayoutBatch) {
  if (b.lines.some((l) => l.status === "pending")) return;
  b.status = b.lines.some((l) => l.status === "failed") ? "partially_paid" : "paid";
}
function checkRev(cur: number, sent?: number) { if (sent != null && sent !== cur) throw new FinError(409, "version_conflict"); }

// ---------------------------------------------------------------- export files
function exportFile(b: PayoutBatch, kind: ExportFile["kind"]) {
  const live = b.lines.filter((l) => l.status !== "excluded");
  const rows = kind === "bank" ? live.filter((l) => l.method === "bank") : kind === "momo" ? live.filter((l) => l.method !== "bank") : kind === "wht" ? live.filter((l) => l.wht > 0) : live;
  const head = kind === "wht" ? "name,tin,taxable,wht" : "name,destination,amount,reference";
  const content = [head, ...rows.map((l) => {
    const m = batchMeta.get(b.no)?.lines.get(l.id);
    return kind === "wht" ? `${nameOf(l.workerId)},PLACEHOLDER(agent-tin),${m?.taxable ?? 0},${l.wht}` : `${nameOf(l.workerId)},${l.destination.masked},${l.net},${b.no}`;
  })].join("\n");
  const ext = kind === "wht" ? "pdf" : kind === "summary" ? "xlsx" : "csv";
  // shortcut: every format is served as CSV text, upgrade to real PDF/XLSX when the export service ships.
  return { file: { kind, name: `${b.no}_${kind.toUpperCase()}.${ext}`, checksum: checksum(content), at: nowIso() } satisfies ExportFile, content, rows: rows.length };
}

// ---------------------------------------------------------------- handlers
export const handlers: HttpHandler[] = [
  // ---- allocations
  http.get("/api/finance/revenue/allocations", async ({ request }) => {
    await delay(250);
    const g = guard(true);
    if (g) return g;
    const q = new URL(request.url).searchParams;
    const state = q.get("state"), agent = q.get("agent"), period = q.get("period");
    const me = actor();
    const inPeriod = ALLOCATIONS.filter((a) => !period || month(a.frozenAt) === period);
    const items = inPeriod.filter((a) => (!state || a.status === state) && (!agent || a.shares.some((s) => s.workerId === agent)))
      .sort((x, y) => y.frozenAt.localeCompare(x.frozenAt)).map((a) => allocView(a, me));
    const tile = (s: Allocation["status"]) => {
      const xs = inPeriod.filter((a) => a.status === s);
      return { amount: xs.reduce((t, a) => t + a.pool, 0), n: xs.length };
    };
    return ok({
      items,
      meta: {
        tiles: { pending_review: tile("pending_review"), reviewed: tile("reviewed"), approved_for_payment: tile("approved_for_payment"), paid: tile("paid") },
        periods: [...new Set(ALLOCATIONS.map((a) => month(a.frozenAt)))].sort().reverse(),
        agents: [...new Set(ALLOCATIONS.flatMap((a) => a.shares.map((s) => s.workerId)))].map((id) => ({ id, name: nameOf(id) })).sort((a, b) => a.name.localeCompare(b.name)),
      },
    });
  }),
  http.post("/api/finance/revenue/allocations/bulk-approve", async ({ request }) => {
    const g = guard(true);
    if (g) return g;
    const b = await body<{ ids: string[] }>(request);
    return idempotent(request, () => {
      const done: string[] = [], skipped: string[] = [];
      for (const id of b.ids ?? []) {
        const a = ALLOCATIONS.find((x) => x.id === id);
        if (!a || a.status !== "reviewed") { skipped.push(id); continue; }
        const before = { status: a.status };
        a.status = "approved_for_payment"; a.approvedBy = ref(actor());
        const m = am(a.id); m.rev++; m.last = { by: actor().name, at: nowIso() };
        record("allocation.approved", "allocation", a.id, before, { status: a.status }, "bulk");
        done.push(id);
      }
      return ok({ approved: done, skipped });
    });
  }),
  http.post("/api/finance/revenue/allocations/:id/:action", async ({ request, params }) => {
    const action = String(params.action);
    const g = guard(action === "approve");
    if (g) return g;
    const b = await body<{ rev?: number; reason?: string; note?: string; text?: string }>(request);
    return idempotent(request, () => run(() => {
      const a = ALLOCATIONS.find((x) => x.id === params.id);
      need(a, 404, "not_found");
      const al = a!, m = am(al.id), before = { status: al.status, question: al.question };
      checkRev(m.rev, b.rev);
      const to = ({ approve: "approved_for_payment", query: "pending_review", hold: "on_hold", void: "voided", release: "pending_review" } as Record<string, Allocation["status"]>)[action];
      if (action === "answer") {
        need(al.question?.status === "open", 409, "conflict");
        need(b.text?.trim(), 422, "reason_required");
        al.question = { ...al.question!, status: "answered" };
        record("allocation.question.answered", "allocation", al.id, before, { question: al.question }, b.text);
      } else {
        need(to, 404, "not_found");
        if (action === "approve") need(al.status === "reviewed", 422, "not_reviewed");
        if (action === "release") need(al.status === "on_hold", 409, "conflict");
        else need(canMove("allocation", al.status, to), 409, "conflict");
        if (action !== "approve") need((b.reason ?? b.note)?.trim(), 422, "reason_required");
        al.status = to;
        if (action === "approve") al.approvedBy = ref(actor());
        if (action === "query") { m.queryNote = b.note; al.reviewedBy = undefined; }
        record(action === "approve" ? "allocation.approved" : "allocation.adjusted", "allocation", al.id, before, { status: al.status }, b.reason ?? b.note);
      }
      m.rev++; m.last = { by: actor().name, at: nowIso() };
      return ok(allocView(al));
    }));
  }),

  // ---- rules
  http.get("/api/finance/revenue/rules/preview", async ({ request }) => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    const q = new URL(request.url).searchParams;
    const cand: Rule = {
      id: "preview", scope: (q.get("scope") ?? "service") as Rule["scope"], agentId: q.get("agentId") ?? undefined, serviceSlug: q.get("serviceSlug") ?? undefined,
      contractId: q.get("contractId") ?? undefined, agentPct: Number(q.get("pct") ?? 0), appliesTo: "both", from: q.get("from") ?? today(), status: "scheduled",
    };
    const open = CASES.filter((c) => !["completed_delivered", "closed", "cancelled"].includes(c.status));
    const affected = open.filter((c) => {
      try { return resolveRule([...RULES, cand], { agentId: c.assignees.find((a) => a.role === "lead")?.id, serviceSlug: c.service, date: cand.from }).id === "preview"; } catch { return false; }
    }).length;
    let current = RULES[0];
    try { current = resolveRule(RULES, { agentId: cand.agentId, serviceSlug: cand.serviceSlug, contractId: cand.contractId, date: cand.from }); } catch { /* global covers */ }
    const ex = allocate(100_000, [], cand.agentPct);
    return ok({
      affected, overlap: rulesOverlap(RULES, cand), retroactive: isRetroactive(cand.from, today()),
      current: { pct: current.agentPct, label: current.scope === "global" ? "global" : scopeLabel(current) }, needsExec: cand.agentPct !== POLICY.defaultAgentBps,
      example: { eligible: 100_000, pool: ex.pool, hebuza: ex.hebuza },
    });
  }),
  http.get("/api/finance/revenue/rules", async () => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    const me = actor();
    return ok({
      items: RULES.map((r) => ruleView(r, me)), defaultBps: POLICY.defaultAgentBps,
      services: SERVICES.map((s) => ({ slug: s.slug, name: s.name })), agents: AGENTS.map((a) => ({ id: a.id, name: a.name })),
    });
  }),
  http.post("/api/finance/revenue/rules", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const b = await body<Partial<Rule> & { reason?: string }>(request);
    return idempotent(request, () => run(() => {
      const pct = Number(b.agentPct);
      need(Number.isInteger(pct) && pct >= 0 && pct <= 10_000, 422, "validation");
      need(b.scope && b.scope !== "global" && b.from, 422, "validation");
      need(b.scope !== "service" || b.serviceSlug, 422, "validation");
      need(!["agent", "agent_service"].includes(b.scope!) || b.agentId, 422, "validation");
      need(b.scope !== "agent_service" || b.serviceSlug, 422, "validation");
      need(b.scope !== "contract" || b.contractId?.trim(), 422, "validation");
      need(b.reason?.trim(), 422, "reason_required");
      need(!isRetroactive(b.from!, today()), 422, "retroactive");
      const exec = pct !== POLICY.defaultAgentBps;
      const r: Rule = {
        id: `r-${++ruleN}`, scope: b.scope!, serviceSlug: b.serviceSlug, agentId: b.agentId, contractId: b.contractId, agentPct: pct, appliesTo: b.appliesTo ?? "both",
        from: b.from!.slice(0, 10), to: b.to, status: exec ? "pending_approval" : b.from! <= today() ? "active" : "scheduled", note: b.reason,
      };
      need(!rulesOverlap(RULES, r), 409, "rule_overlap");
      RULES.push(r);
      ruleChains.set(r.id, sign(ruleChain(pct), actor(), nowIso()));
      record("rate.changed", "rule", r.id, null, { scope: r.scope, agentPct: r.agentPct, from: r.from, status: r.status }, b.reason);
      return ok(ruleView(r));
    }));
  }),
  http.patch("/api/finance/revenue/rules/:id", async ({ request, params }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ to?: string; reason?: string } & Record<string, unknown>>(request);
    return idempotent(request, () => run(() => {
      const r = RULES.find((x) => x.id === params.id);
      need(r, 404, "not_found");
      // REV §8: a rule is only ever end-dated; every other field is frozen.
      need(Object.keys(b).every((k) => k === "to" || k === "reason") && b.to, 422, "validation");
      need(r!.scope !== "global", 422, "validation");
      need(!isRetroactive(b.to!, today()) && b.to! >= r!.from, 422, "retroactive");
      need(b.reason?.trim(), 422, "reason_required");
      const before = { to: r!.to };
      r!.to = b.to!.slice(0, 10);
      record("rate.changed", "rule", r!.id, before, { to: r!.to }, b.reason);
      return ok(ruleView(r!));
    }));
  }),
  http.post("/api/finance/revenue/rules/:id/:decision", async ({ request, params }) => {
    const g = guard(true);
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ reason?: string }>(request);
    return idempotent(request, () => run(() => {
      const r = RULES.find((x) => x.id === params.id);
      need(r, 404, "not_found");
      need(r!.status === "pending_approval", 409, "conflict");
      const me = actor();
      need(isExec(me), 403, "forbidden");
      const chain = ruleChains.get(r!.id) ?? [];
      const c = canSign(chain, me, []);
      if (!c.ok) throw new FinError(403, c.reason === "same_approver" ? "same_approver" : "forbidden");
      const before = { status: r!.status };
      if (params.decision === "reject") {
        need(b.reason?.trim(), 422, "reason_required");
        r!.status = "ended"; r!.to = r!.from; r!.note = b.reason;
      } else {
        ruleChains.set(r!.id, sign(chain, me, nowIso()));
        r!.status = r!.from <= today() ? "active" : "scheduled"; r!.approvedBy = ref(me);
      }
      record("rate.changed", "rule", r!.id, before, { status: r!.status }, b.reason);
      return ok(ruleView(r!));
    }));
  }),

  // ---- adjustments
  http.get("/api/finance/revenue/adjustments", async () => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    const me = actor();
    return ok({ items: [...ADJUSTMENTS].reverse().map((a) => adjView(a, me)), workers: AGENTS.map((a) => who(a.id)) });
  }),
  http.post("/api/finance/revenue/adjustments", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ workerId?: string; amount?: number; reason?: AdjReason; note?: string; allocationId?: string }>(request);
    return idempotent(request, () => run(() => {
      need(b.workerId && AGENTS.some((a) => a.id === b.workerId), 422, "validation");
      need(Number.isInteger(b.amount) && b.amount !== 0, 422, "validation");
      // Refund-linked adjustments are created by the refund flow (D-16), never by hand.
      need(b.reason && ["correction", "bonus", "clawback", "other"].includes(b.reason), 422, "validation");
      need(b.note?.trim(), 422, "reason_required");
      const a: Adjustment = { id: `adj-${String(++adjN).padStart(4, "0")}`, workerId: b.workerId!, amount: b.amount!, reason: b.reason!, note: b.note!.trim(), allocationId: b.allocationId, status: "proposed" };
      ADJUSTMENTS.push(a);
      adjMeta.set(a.id, { chain: sign(adjustmentChain(a), actor(), nowIso()), createdBy: ref(actor()), at: nowIso() });
      record("allocation.adjusted", "adjustment", a.id, null, { workerId: a.workerId, amount: a.amount, reason: a.reason, status: a.status }, a.note);
      return ok(adjView(a));
    }));
  }),
  http.post("/api/finance/revenue/adjustments/:id/approve", async ({ request, params }) => {
    const g = guard(true);
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    return idempotent(request, () => run(() => {
      const a = ADJUSTMENTS.find((x) => x.id === params.id);
      need(a, 404, "not_found");
      need(a!.status === "proposed", 409, "conflict");
      const m = adjMeta.get(a!.id)!;
      const c = canSign(m.chain, actor(), [m.createdBy.id]);
      if (!c.ok) throw new FinError(403, c.reason === "same_approver" ? "same_approver" : "forbidden");
      m.chain = sign(m.chain, actor(), nowIso());
      a!.status = "approved"; a!.approvedBy = ref(actor());
      record("allocation.adjusted", "adjustment", a!.id, { status: "proposed" }, { status: a!.status });
      return ok(adjView(a!));
    }));
  }),

  // ---- fees
  http.get("/api/finance/revenue/fees", async () => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    return ok({ items: [...FEES].sort((x, y) => y.month.localeCompare(x.month)).map(feeView), workers: AGENTS.filter((a) => kindOf(a.id) === "external").map((a) => who(a.id)), monthly: POLICY.licenceFeeMonthly });
  }),
  http.post("/api/finance/revenue/fees", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ workerId?: string; kind?: AgentFee["kind"]; amount?: number; month?: string }>(request);
    return idempotent(request, () => run(() => {
      need(b.workerId && kindOf(b.workerId) === "external", 422, "validation");
      need(Number.isInteger(b.amount) && b.amount! > 0 && b.kind && /^\d{4}-\d{2}$/.test(b.month ?? ""), 422, "validation");
      need(!FEES.some((f) => f.workerId === b.workerId && f.month === b.month && f.kind === b.kind), 409, "conflict");
      const f: AgentFee = { id: `fee-${++feeN}`, workerId: b.workerId!, kind: b.kind!, amount: b.amount!, month: b.month!, status: "due" };
      FEES.push(f);
      record("allocation.adjusted", "fee", f.id, null, { ...f });
      return ok(feeView(f));
    }));
  }),
  http.post("/api/finance/revenue/fees/:id/waive", async ({ request, params }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ reason?: string }>(request);
    return idempotent(request, () => run(() => {
      const f = FEES.find((x) => x.id === params.id);
      need(f, 404, "not_found");
      need(f!.status === "due", 409, "conflict");
      need(b.reason?.trim(), 422, "reason_required");
      f!.status = "waived";
      record("allocation.adjusted", "fee", f!.id, { status: "due" }, { status: "waived" }, b.reason);
      return ok(feeView(f!));
    }));
  }),

  // ---- agent-side views of finance-world (x) — for the agent-world re-point (hand-back)
  http.get("/api/finance/revenue/x/agent/:workerId", async ({ params }) => {
    const id = String(params.workerId);
    const g = guard(true);
    if (g) return g;
    return ok({
      allocations: allocationsFor(id).map((a) => ({ ...a, shares: a.shares.filter((s) => s.workerId === id) })),
      payouts: BATCHES.flatMap((b) => b.lines.filter((l) => l.workerId === id).map((l) => ({ batchNo: b.no, period: b.period, batchStatus: b.status, ...lineView(b, l) }))),
      adjustments: ADJUSTMENTS.filter((a) => a.workerId === id),
    });
  }),

  // ---- payouts
  http.get("/api/finance/payouts/batches", async () => {
    await delay(250);
    const g = guard(true);
    if (g) return g;
    const me = actor();
    return ok({ items: [...BATCHES].sort((x, y) => y.no.localeCompare(x.no)).map((b) => batchView(b, me)), payoutDay: POLICY.payoutDay });
  }),
  http.get("/api/finance/payouts/preview", async ({ request }) => {
    await delay(300);
    const g = guard(true);
    if (g) return g;
    const q = new URL(request.url).searchParams;
    const period = q.get("period") ?? month(today());
    const runNo = Number(q.get("run") ?? 1) || 1;
    const no = periodNo(period, runNo);
    const d = buildLines(period, (q.get("excluded") ?? "").split(",").filter(Boolean), no);
    const lines = d.lines.map(({ meta, ...l }) => ({ ...l, name: nameOf(l.workerId), kind: kindOf(l.workerId), taxable: meta.taxable, carriedIn: meta.carriedIn, parts: meta.parts }));
    return ok({ no, period, exists: BATCHES.some((b) => b.no === no) ? no : null, lines, totals: sumTotals(lines), blockers: d.blockers } satisfies Preview);
  }),
  http.get("/api/finance/payouts/batches/:no", async ({ params }) => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    return run(() => ok(batchView(batchOf(String(params.no)))));
  }),
  http.get("/api/finance/payouts/batches/:no/export", async ({ request, params }) => {
    await delay(600);
    const g = guard(true);
    if (g) return g;
    return run(() => {
      const b = batchOf(String(params.no));
      const fmt = (new URL(request.url).searchParams.get("format") ?? "summary") as ExportFile["kind"];
      need(["bank", "momo", "wht", "summary"].includes(fmt), 422, "validation");
      need(["authorised", "executing", "paid", "partially_paid", "closed"].includes(b.status), 409, "awaiting_executive");
      const x = exportFile(b, fmt);
      b.exports = [...b.exports.filter((e) => e.kind !== fmt), x.file];
      record("payout.exported", "batch", b.no, null, { file: x.file.name, checksum: x.file.checksum, rows: x.rows }, undefined, "data");
      return ok({ ...x.file, content: x.content, rows: x.rows });
    });
  }),
  http.post("/api/finance/payouts/batches", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const b = await body<{ period?: string; run?: number; excluded?: string[] }>(request);
    return idempotent(request, () => run(() => {
      need(/^\d{4}-\d{2}$/.test(b.period ?? ""), 422, "validation");
      const no = periodNo(b.period!, b.run ?? 1);
      need(!BATCHES.some((x) => x.no === no), 409, "conflict");
      const d = buildLines(b.period!, b.excluded ?? [], no);
      need(d.blockers.length === 0, 422, "destination_unverified");
      need(d.lines.some((l) => l.status === "pending"), 422, "empty_batch");
      const me = actor();
      const lines = d.lines.map(({ meta: _m, ...l }) => l);
      const batch: PayoutBatch = { no, period: b.period!, status: "draft", preparedBy: ref(me), totals: sumTotals(lines), lines, exports: [] };
      BATCHES.push(batch);
      batchMeta.set(no, { chain: batchChain(batch.totals.net), rev: 1, lines: new Map(d.lines.map((l) => [l.id, l.meta])) });
      record("payout.prepared", "batch", no, null, { status: "draft", net: batch.totals.net, lines: lines.length });
      return ok(batchView(batch));
    }));
  }),
  http.post("/api/finance/payouts/batches/:no/:action", async ({ request, params }) => {
    const action = String(params.action);
    const g = guard(action === "authorise" || action === "reject");
    if (g) return g;
    if (action === "authorise" && !stepUpOk(request)) return needStepUp();
    const b = await body<{ rev?: number; reason?: string }>(request);
    return idempotent(request, () => run(() => {
      const batch = batchOf(String(params.no));
      const m = batchMeta.get(batch.no)!;
      checkRev(m.rev, b.rev);
      const me = actor(), before = { status: batch.status };
      const inBatch = (s: Allocation["status"], to: Allocation["status"]) => {
        for (const l of batch.lines) if (l.status !== "excluded") {
          const lm = m.lines.get(l.id);
          for (const p of lm?.parts.allocations ?? []) { const a = ALLOCATIONS.find((x) => x.id === p.id); if (a && a.status === s) { a.status = to; a.batchNo = to === "in_batch" ? batch.no : undefined; } }
          for (const p of lm?.parts.adjustments ?? []) { const a = ADJUSTMENTS.find((x) => x.id === p.id); if (a) a.status = to === "in_batch" ? "in_batch" : "approved"; }
        }
      };
      switch (action) {
        case "submit": {
          need(batch.status === "draft" && batch.lines.some((l) => l.status === "pending"), 422, batch.status === "draft" ? "empty_batch" : "conflict");
          need(batch.lines.every((l) => l.status === "excluded" || (l.destination.verified && !(l.destination.coolingUntil && Date.parse(l.destination.coolingUntil) > Date.now()))), 422, "destination_unverified");
          m.chain = sign(batchChain(batch.totals.net), me, nowIso());
          batch.preparedBy = ref(me); batch.status = "submitted"; m.rejectNote = undefined;
          inBatch("approved_for_payment", "in_batch");
          break;
        }
        case "authorise": case "reject": {
          need(batch.status === "submitted", 409, "conflict");
          const c = canSign(m.chain, me, [batch.preparedBy.id]);
          if (!c.ok) throw new FinError(403, c.reason === "same_approver" ? "same_approver" : "forbidden");
          if (action === "reject") {
            need(b.reason?.trim(), 422, "reason_required");
            batch.status = "rejected";
            record("payout.rejected", "batch", batch.no, before, { status: "rejected" }, b.reason);
            batch.status = "draft"; m.rejectNote = b.reason; m.chain = batchChain(batch.totals.net);
            inBatch("in_batch", "approved_for_payment");
          } else {
            m.chain = sign(m.chain, me, nowIso());
            if (m.chain.every((s) => s.signedBy)) { batch.status = "authorised"; batch.authorisedBy = ref(me); }
          }
          break;
        }
        case "execute": {
          need(batch.status === "authorised", 409, "conflict");
          batch.status = "executing";
          break;
        }
        case "close": {
          need(batch.status === "paid" || batch.status === "partially_paid", 409, "conflict");
          for (const l of batch.lines) {
            const lm = m.lines.get(l.id);
            lm?.carriedFrom.forEach((id) => consumed.add(id));
            if (l.status !== "paid") continue;
            for (const p of lm?.parts.allocations ?? []) { const a = ALLOCATIONS.find((x) => x.id === p.id); if (a && a.status === "in_batch") a.status = "paid"; }
            for (const p of lm?.parts.adjustments ?? []) { const a = ADJUSTMENTS.find((x) => x.id === p.id); if (a) a.status = "settled"; }
            for (const p of lm?.parts.fees ?? []) { const f = FEES.find((x) => x.id === p.id); if (f) f.status = "netted"; }
          }
          batch.status = "closed";
          m.statementsAt = Date.now() + 4_000; // statements job (mock): ready after a few seconds
          break;
        }
        default: throw new FinError(404, "not_found");
      }
      bump(batch);
      if (action !== "reject") record(action === "authorise" ? "payout.approved" : `payout.${action === "submit" ? "submitted" : action === "execute" ? "executing" : "closed"}`, "batch", batch.no, before, { status: batch.status });
      return ok(batchView(batch));
    }));
  }),
  http.post("/api/finance/payouts/lines/:id/:action", async ({ request, params }) => {
    const action = String(params.action);
    const g = guard();
    if (g) return g;
    if (action === "paid" && !stepUpOk(request)) return needStepUp();
    const b = await body<{ ref?: string; reason?: string; proofDocId?: string }>(request);
    return idempotent(request, () => run(() => {
      const { b: batch, l } = lineOf(String(params.id));
      const lm = batchMeta.get(batch.no)!.lines.get(l.id);
      const before = { status: l.status };
      if (action === "exclude") {
        need(batch.status === "draft" && l.status === "pending", 409, "conflict");
        need(b.reason?.trim(), 422, "reason_required");
        l.status = "excluded";
      } else if (action === "paid" || action === "failed") {
        need(batch.status === "executing", 409, "conflict");
        // Idempotent per line: the same outcome twice returns the line unchanged.
        if (l.status === action) return ok(batchView(batch));
        need(canMove("line", l.status, action), 409, "conflict");
        if (action === "paid") {
          need(b.ref?.trim(), 422, "validation");
          l.status = "paid"; l.providerRef = b.ref!.trim(); l.proofDocId = b.proofDocId;
          if (lm) lm.paidAt = nowIso();
        } else {
          need(b.reason?.trim(), 422, "reason_required");
          l.status = "failed";
          if (lm) lm.failReason = b.reason;
        }
        settleStatus(batch);
      } else throw new FinError(404, "not_found");
      bump(batch);
      record(action === "paid" ? "payout.paid" : action === "failed" ? "payout.failed" : "payout.line.excluded", "batch", batch.no, { line: l.id, ...before }, { line: l.id, status: l.status, ref: l.providerRef }, b.reason);
      return ok(batchView(batch));
    }));
  }),

  // ---- simulate (mock mode)
  http.post("/api/finance/x/simulate/sm-review", () => {
    const a = ALLOCATIONS.find((x) => x.status === "pending_review");
    if (!a) return fail(409, "conflict", "Nothing awaiting review");
    a.status = "reviewed"; a.reviewedBy = USERS.sm;
    const m = am(a.id); m.rev++; m.last = { by: USERS.sm.name, at: nowIso() };
    record("allocation.reviewed", "allocation", a.id, { status: "pending_review" }, { status: "reviewed" });
    return ok({ id: a.id });
  }),
  http.post("/api/finance/x/simulate/agent-question", () => {
    const a = ALLOCATIONS.find((x) => !x.question && x.status !== "voided");
    if (!a) return fail(409, "conflict", "No allocation");
    a.question = { id: `q-${a.id}`, status: "open", text: "My share looks lower than I expected — was a deduction applied?" };
    return ok({ id: a.id });
  }),
  http.post("/api/finance/x/simulate/allocation-conflict", () => {
    const a = ALLOCATIONS.find((x) => x.status === "reviewed") ?? ALLOCATIONS[1];
    const m = am(a.id); m.rev++; m.last = { by: USERS.finance2.name, at: nowIso() };
    return ok({ id: a.id });
  }),
  http.post("/api/finance/x/simulate/disbursement-fail", () => {
    const b = BATCHES.find((x) => x.status === "executing");
    const l = b?.lines.find((x) => x.status === "pending");
    if (!b || !l) return fail(409, "conflict", "No line is being paid");
    l.status = "failed";
    const lm = batchMeta.get(b.no)!.lines.get(l.id);
    if (lm) lm.failReason = "Provider rejected: wallet not registered";
    settleStatus(b); bump(b);
    record("payout.failed", "batch", b.no, { line: l.id, status: "pending" }, { line: l.id, status: "failed" }, "provider");
    return ok({ line: l.id });
  }),
  http.post("/api/finance/x/simulate/batch-conflict", () => {
    const b = BATCHES.find((x) => x.status !== "closed");
    if (!b) return fail(409, "conflict", "No open batch");
    const m = batchMeta.get(b.no)!;
    m.rev++; m.last = { by: USERS.finance2.name, at: nowIso() };
    return ok({ no: b.no });
  }),
];

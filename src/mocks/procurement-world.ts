// Stage 12 procurement mock world (plan 12 §9.3). One world computes every figure (BD-4); amounts are PLACEHOLDER
// illustrative except the worked examples (§2.4). Dates are relative to load time so the Done-when alerts always fire.
// Lane handlers (handlers-procurement-*.ts) mutate these arrays directly and call record() once per mutation.
// shortcut: in-memory per tab session, upgrade per endpoint as /api/procurement/* ships.
import { audit } from "./audit";
import { currentPersona } from "./personas";
import { PROC_POLICY } from "@/shared/policy";
import type { Role } from "@/shared/auth/roles";
import {
  DEFAULT_LIMITS, addDays, ageingBucket, budgetMeter, contractStatus, daysBetween, depositReturnDue, match, noticeDeadline, reminderDates, totals, withCalc,
} from "@/shared/procurement/rules";
import type {
  Advance, ApprovalLimits, BankChange, Bill, BudgetCategory, Contract, GoodsReceipt, Line, ProcAlert, ProcApproval, ProcNote, ProcSummary,
  PurchaseOrder, PurchaseRequest, SettingsProposal, UserRef, Vendor, VendorPayment,
} from "@/shared/procurement/types";

const H = 3600_000;
export const LOADED = Date.now();
/** Mock clock: "Simulate +24 h" moves it forward (J3). Never read in render. */
export const clock = { offset: 0 };
export const now = () => LOADED + clock.offset;
export const nowIso = () => new Date(now()).toISOString();
export const today = () => new Date(now()).toISOString().slice(0, 10);
const T0 = new Date(LOADED).toISOString().slice(0, 10);
const d = (n: number) => addDays(T0, n);
const at = (hours: number) => new Date(LOADED + hours * H).toISOString();
export const YEAR = new Date(LOADED).getUTCFullYear();

// ---------------------------------------------------------------- people (§0.2)
export const P = {
  josiane: { id: "mock-procurement", name: "Josiane Uwera" },
  patrick: { id: "mock-finance", name: "Patrick Niyonzima" },
  solange: { id: "mock-finance2", name: "Solange Mukeshimana" },
  alice: { id: "mock-exec", name: "Alice Mutoni" },
  diane: { id: "mock-sm", name: "Diane Mukamana" },
  eric: { id: "mock-agent", name: "Eric Habimana" },
} satisfies Record<string, UserRef>;
export type Actor = UserRef & { roles: Role[] };
export function actor(): Actor {
  const p = currentPersona();
  return p ? { id: `mock-${p.key}`, name: p.name, roles: p.roles } : { ...P.josiane, roles: ["staff:procurement"] };
}
export const ref = (a: Actor): UserRef => ({ id: a.id, name: a.name });
export const has = (a: Actor, r: Role) => a.roles.includes(r);
export const isProc = (a: Actor) => has(a, "staff:procurement");
export const isFin = (a: Actor) => has(a, "staff:finance");
export const isExec = (a: Actor) => has(a, "staff:executive");

export class ProcError extends Error {
  constructor(public status: number, public code: string, public data?: unknown) { super(code); }
}
/** One audit row per mutation (§10.3). Call after guards pass. */
export const record = (action: string, kind: string, id: string, before: unknown, after: unknown, reason?: string) =>
  audit({ actor: actor().name, action, entity: { kind, id }, before, after, reason });

// ---------------------------------------------------------------- numbering (R-17, PLACEHOLDER(proc-numbering))
const counters: Record<string, number> = { PR: 90, PO: 66, GRN: 53, BL: 122, VP: 31, RA: 93, CT: 9, DP: 11, ADV: 8, V: 69 };
export function nextNo(prefix: keyof typeof counters | string, pad = 4) {
  counters[prefix] = (counters[prefix] ?? 0) + 1;
  return prefix === "V" ? `V-${String(counters[prefix]).padStart(4, "0")}` : `${prefix}-${YEAR}-${String(counters[prefix]).padStart(pad, "0")}`;
}
let idSeq = 1000;
export const uid = (p: string) => `${p}-${++idSeq}`;

// ---------------------------------------------------------------- settings (F-SET-01) — budgets PLACEHOLDER(budget-categories)
export const LIMITS: ApprovalLimits = { ...DEFAULT_LIMITS };
export const BUDGETS: BudgetCategory[] = [
  { code: "RENT", name: "Rent", annualBudget: 19_000_000, committed: 0, actual: 14_500_000 },
  { code: "UTIL", name: "Utilities", annualBudget: 2_400_000, committed: 0, actual: 1_610_000 },
  { code: "INTERNET", name: "Internet", annualBudget: 3_000_000, committed: 0, actual: 2_360_000 },
  { code: "OFFICE", name: "Office supplies", annualBudget: 1_200_000, committed: 142_000, actual: 270_000 }, // §2.4 #11
  { code: "PROF", name: "Professional fees", annualBudget: 4_000_000, committed: 0, actual: 1_180_000 },
  { code: "PRINT", name: "Printing", annualBudget: 1_500_000, committed: 0, actual: 723_400 },
  { code: "COUR", name: "Couriers", annualBudget: 1_200_000, committed: 0, actual: 810_000 },
  { code: "SOFT", name: "Software", annualBudget: 2_000_000, committed: 0, actual: 480_000 },
  { code: "CLEAN", name: "Cleaning", annualBudget: 2_400_000, committed: 100_000, actual: 1_800_000 },
];
export const PROPOSALS: SettingsProposal[] = [];
export const budgetOf = (code: string) => BUDGETS.find((b) => b.code === code);

// ---------------------------------------------------------------- vendors (PE-18, fictional)
const v = (o: Partial<Vendor> & Pick<Vendor, "id" | "code" | "type" | "legalName" | "tinMasked">): Vendor => ({
  categories: [], contacts: [], paymentTermsDays: 30, bankStatus: "verified", status: "active", balance: 0, openBills: 0, documents: [],
  vatRegistered: true, version: 1, ...o,
});
export const VENDORS: Vendor[] = [
  v({ id: "v-kiyovu", code: "V-0042", type: "landlord", legalName: "Kiyovu Heights Ltd", tinMasked: "•••• 3456", rdbNumber: "RDB-•••-118", categories: ["RENT"],
    contacts: [{ name: "Jean Bosco Kamanzi", role: "Property manager", phone: "+250 788 000 142", email: "leasing@kiyovu-heights.example" }],
    address: "KN 3 Rd, Kiyovu, Kigali", bank: { kind: "bank", label: "BK", masked: "•••• 4417" }, rating: 4,
    documents: [{ id: "doc-k1", name: "Lease agreement 2024.pdf", expiresOn: d(60) }, { id: "doc-k2", name: "RDB certificate.pdf" }] }),
  v({ id: "v-kigalinet", code: "V-0043", type: "service_provider", legalName: "KigaliNet Fibre Ltd", tinMasked: "•••• 7781", categories: ["INTERNET"],
    contacts: [{ name: "Aline Uwase", role: "Accounts", phone: "+250 788 000 311", email: "billing@kigalinet.example" }],
    bank: { kind: "momo", label: "MTN MoMo", masked: "•••• 214" }, rating: 4, documents: [{ id: "doc-n1", name: "Service agreement.pdf", expiresOn: d(200) }] }),
  v({ id: "v-simba", code: "V-0044", type: "supplier", legalName: "Simba Office Supplies Ltd", tradingName: "Simba Office", tinMasked: "•••• 9012", categories: ["OFFICE", "PRINT"],
    contacts: [{ name: "Claude Mugisha", role: "Sales", phone: "+250 788 000 455", email: "orders@simba-office.example" }],
    bank: { kind: "bank", label: "BK", masked: "•••• 2214" }, bankStatus: "unverified", rating: 3, paymentTermsDays: 14,
    documents: [{ id: "doc-s1", name: "Trading licence.pdf", expiresOn: d(21) }] }),
  v({ id: "v-printpro", code: "V-0045", type: "supplier", legalName: "PrintPro Kigali", tinMasked: "•••• 5530", categories: ["PRINT"],
    contacts: [{ name: "Olivier Habimana", role: "Owner", phone: "+250 788 000 520", email: "hello@printpro.example" }],
    bank: { kind: "bank", label: "I&M", masked: "•••• 0931" }, rating: 5 }),
  v({ id: "v-cleanco", code: "V-0046", type: "service_provider", legalName: "CleanCo Services", tinMasked: "•••• 6402", categories: ["CLEAN"],
    contacts: [{ name: "Vestine Ingabire", role: "Supervisor", phone: "+250 788 000 610" }], bank: { kind: "airtel", label: "Airtel Money", masked: "•••• 778" }, rating: 4 }),
  v({ id: "v-express", code: "V-0047", type: "service_provider", legalName: "Express Couriers Rwanda", tinMasked: "•••• 1189", categories: ["COUR"],
    contacts: [{ name: "Eric Nshuti", role: "Dispatch", email: "dispatch@express-couriers.example" }], bank: { kind: "momo", label: "MTN MoMo", masked: "•••• 905" }, rating: 3 }),
  v({ id: "v-notary", code: "V-0048", type: "service_provider", legalName: "Me Uwimana Notary", tinMasked: "•••• 4471", categories: ["PROF"], vatRegistered: true,
    contacts: [{ name: "Me Uwimana", role: "Notary", phone: "+250 788 000 733" }], bank: { kind: "bank", label: "Equity", masked: "•••• 6620" }, rating: 5 }),
  v({ id: "v-power", code: "V-0049", type: "government_body", legalName: "Kigali Water & Power Office", tinMasked: "•••• 0004", categories: ["UTIL"], vatRegistered: true,
    contacts: [{ name: "Customer care", phone: "+250 788 000 900" }], bank: { kind: "bank", label: "BNR", masked: "•••• 0001" }, paymentTermsDays: 10 }),
  v({ id: "v-cloudline", code: "V-0050", type: "service_provider", legalName: "Cloudline Software Ltd", tinMasked: "•••• 8320", categories: ["SOFT"],
    bank: { kind: "bank", label: "BK", masked: "•••• 7720" }, rating: 4 }),
  v({ id: "v-simba-old", code: "V-0039", type: "supplier", legalName: "Simba Office Supply", tinMasked: "•••• 9012", categories: ["OFFICE"],
    status: "blocked", blockReason: "Duplicate record of V-0044", bank: { kind: "bank", label: "BK", masked: "•••• 1180" } }),
  // 20 generated rows for pagination (fictional).
  ...["Akagera", "Bugesera", "Gisozi", "Huye", "Inyange", "Jabana", "Kacyiru", "Kimironko", "Muhima", "Nyamirambo", "Nyarutarama", "Remera",
    "Rubavu", "Rusizi", "Gikondo", "Kanombe", "Kicukiro", "Masaka", "Ndera", "Gacuriro"].map((n, i) => v({
    id: `v-gen-${i}`, code: `V-${String(51 + i).padStart(4, "0")}`, type: (["supplier", "service_provider", "supplier", "landlord"] as const)[i % 4],
    legalName: `${n} ${["Stationers", "Maintenance Ltd", "Traders", "Properties"][i % 4]}`, tinMasked: `•••• ${String(2100 + i * 37).slice(-4)}`,
    categories: [["OFFICE", "PROF", "PRINT", "RENT"][i % 4]], status: i === 7 ? "inactive" : "active", rating: (i % 5) + 1,
    bank: { kind: "bank", label: "BK", masked: `•••• ${String(3000 + i * 13).slice(-4)}` },
  })),
];
export const vendorOf = (id: string) => VENDORS.find((x) => x.id === id || x.code === id);
export const vendorName = (id?: string) => (id ? vendorOf(id)?.legalName ?? id : "");

export const BANK_CHANGES: BankChange[] = [{
  id: "bc-1", vendorId: "v-simba", requestedBy: P.josiane, requestedAt: at(-10 / 60), newKind: "bank", newLabel: "BK", newMasked: "•••• 8810",
  oldMasked: "•••• 2214", callbackNumber: "+250 788 000 455", reason: "Supplier letter: account moved to new branch", status: "requested",
  doc: { id: "doc-bc1", name: "Simba bank letter.pdf" },
}];

// ---------------------------------------------------------------- contracts (S7–S12)
const ct = (o: Omit<Contract, "reminders" | "documents" | "version" | "ownerId" | "status"> & Partial<Contract>): Contract => ({
  ownerId: P.josiane.id, status: "active", documents: [], version: 1, ...o,
  reminders: reminderDates(o.endOn, LIMITS.reminderOffsets).map((r) => ({ ...r, channel: "in_app" as const, sentAt: r.on <= T0 ? `${r.on}T07:00:00.000Z` : undefined })),
});
export const CONTRACTS: Contract[] = [
  ct({ id: "ct-lease-1", ref: "CT-LEASE-001", vendorId: "v-kiyovu", kind: "lease", title: "Office lease — Kiyovu", startOn: addDays(d(60), -3 * 365),
    endOn: d(60), amount: 1_450_000, frequency: "monthly", dueDay: 5, escalationPercent: 5, noticeDays: 90, autoRenew: false, depositAmount: 2_900_000,
    depositNo: "DP-2026-003", budgetCategory: "RENT", documents: [{ id: "doc-l1", name: "Lease agreement signed.pdf" }] }),
  ct({ id: "ct-lease-2", ref: "CT-LEASE-002", vendorId: "v-kiyovu", kind: "lease", title: "Branch office lease (spec example)", startOn: "2026-12-01",
    endOn: "2027-11-30", amount: 800_000, frequency: "monthly", dueDay: 5, escalationPercent: 5, noticeDays: 90, autoRenew: false, depositAmount: 1_600_000,
    depositNo: "DP-2026-010", budgetCategory: "RENT" }),
  ct({ id: "ct-net", ref: "CT-2026-0003", vendorId: "v-kigalinet", kind: "service", title: "Fibre internet 100 Mbps", startOn: d(-165), endOn: d(200),
    amount: 236_000, frequency: "monthly", dueDay: 15, escalationPercent: 0, noticeDays: 30, autoRenew: true, budgetCategory: "INTERNET" }),
  ct({ id: "ct-clean", ref: "CT-2026-0004", vendorId: "v-cleanco", kind: "service", title: "Office cleaning", startOn: d(-340), endOn: d(25),
    amount: 180_000, frequency: "monthly", dueDay: 1, escalationPercent: 3, noticeDays: 30, autoRenew: false, budgetCategory: "CLEAN" }),
  ct({ id: "ct-courier", ref: "CT-2026-0005", vendorId: "v-express", kind: "service", title: "Courier retainer", startOn: d(-60), endOn: d(300),
    amount: 90_000, frequency: "monthly", dueDay: 28, escalationPercent: 0, noticeDays: 30, autoRenew: true, budgetCategory: "COUR" }),
  ct({ id: "ct-print-old", ref: "CT-2025-0009", vendorId: "v-printpro", kind: "supply", title: "Printing framework 2025", startOn: d(-385), endOn: d(-20),
    amount: 150_000, frequency: "one_off", escalationPercent: 0, noticeDays: 30, autoRenew: false, depositAmount: 150_000, depositNo: "DP-2025-011", budgetCategory: "PRINT" }),
  ct({ id: "ct-courier-old", ref: "CT-2025-0007", vendorId: "v-express", kind: "service", title: "Courier equipment hire", startOn: d(-407), endOn: d(-42),
    amount: 40_000, frequency: "monthly", escalationPercent: 0, noticeDays: 30, autoRenew: false, depositAmount: 200_000, depositNo: "DP-2025-008",
    budgetCategory: "COUR", status: "terminated", termination: { effectiveOn: d(-42), checklist: ["notice", "handover"], at: at(-80 * 24) } }),
];
export const contractOf = (idOrRef: string) => CONTRACTS.find((c) => c.id === idOrRef || c.ref === idOrRef);
export const liveStatus = (c: Contract) => contractStatus(c, today());

// ---------------------------------------------------------------- requests, orders, receipts
const ln = (id: string, description: string, qty: number, unitPrice: number, vatable = true, mode: "excl" | "incl" = "excl"): Line =>
  withCalc({ id, description, qty, unitPrice, vatable }, mode);
const pr = (o: Omit<PurchaseRequest, "estimatedTotal" | "version" | "quotes" | "decisions" | "route" | "routeReasons"> & Partial<PurchaseRequest>): PurchaseRequest => ({
  quotes: [], decisions: [], route: "finance", routeReasons: [], version: 1, ...o, estimatedTotal: totals(o.lines).total,
});
const q3 = (base: number) => [
  { id: uid("q"), name: "Quote Simba.pdf", vendorName: "Simba Office Supplies Ltd", amount: base },
  { id: uid("q"), name: "Quote PrintPro.pdf", vendorName: "PrintPro Kigali", amount: Math.round(base * 1.09) },
  { id: uid("q"), name: "Quote Gisozi.pdf", vendorName: "Gisozi Traders", amount: Math.round(base * 1.15) },
];
export const PRS: PurchaseRequest[] = [
  pr({ id: "pr-87", no: "PR-2026-0087", title: "Toner cartridges for 2nd floor printers", requester: P.eric, requesterWorkspace: "agent", vendorId: "v-simba",
    lines: [ln("l1", "HP 26A toner cartridge", 6, 45_000, false)], budgetCategory: "OFFICE", neededBy: d(7),
    justification: "Both printers on the 2nd floor are out of toner; client files are printed there daily.", status: "submitted",
    quotes: [{ id: "q-87", name: "Simba quote 2231.pdf", vendorName: "Simba Office Supplies Ltd", amount: 270_000 }], chosenQuoteId: "q-87",
    createdAt: at(-26), submittedAt: at(-26), decisions: [{ step: "submit", by: P.eric, at: at(-26), outcome: "done" }] }),
  pr({ id: "pr-85", no: "PR-2026-0085", title: "Ergonomic chairs (8)", requester: P.diane, requesterWorkspace: "ops", lines: [ln("l1", "Ergonomic office chair", 8, 80_000, false)],
    budgetCategory: "OFFICE", neededBy: d(14), justification: "Replacing broken chairs in the service team area.", status: "approved", quotes: q3(640_000),
    createdAt: at(-96), submittedAt: at(-95), chosenQuoteId: undefined, vendorId: "v-simba",
    decisions: [{ step: "submit", by: P.diane, at: at(-95), outcome: "done" }, { step: "approve", by: P.patrick, at: at(-50), outcome: "approved" }] }),
  pr({ id: "pr-90", no: "PR-2026-0090", title: "Laptops for new interns (3)", requester: P.diane, requesterWorkspace: "ops", lines: [ln("l1", "Laptop 14\" i5 16GB", 3, 300_000, false)],
    budgetCategory: "OFFICE", neededBy: d(21), justification: "Three interns start next month and need laptops for case work.", status: "submitted", quotes: q3(900_000),
    route: "executive", routeReasons: ["over_budget"], createdAt: at(-5), submittedAt: at(-5), decisions: [{ step: "submit", by: P.diane, at: at(-5), outcome: "done" }] }),
  pr({ id: "pr-86", no: "PR-2026-0086", title: "Whiteboard for meeting room", requester: P.diane, requesterWorkspace: "ops", lines: [ln("l1", "Whiteboard 180×120", 1, 95_000, false)],
    budgetCategory: "OFFICE", neededBy: d(10), justification: "Meeting room needs a whiteboard for client workshops.", status: "info_requested",
    createdAt: at(-48), submittedAt: at(-47),
    decisions: [{ step: "submit", by: P.diane, at: at(-47), outcome: "done" }, { step: "request_info", by: P.patrick, at: at(-20), outcome: "info_requested", reason: "Is the magnetic version needed? Please attach a quote." }] }),
  pr({ id: "pr-80", no: "PR-2026-0080", title: "Toner stock for Q4", requester: P.josiane, requesterWorkspace: "procurement", vendorId: "v-simba",
    lines: [ln("l1", "HP 26A toner cartridge", 8, 45_000, false)], budgetCategory: "OFFICE", neededBy: d(-10), justification: "Quarterly toner stock.", status: "ordered",
    poNo: "PO-2026-0064", createdAt: at(-30 * 24), submittedAt: at(-30 * 24),
    decisions: [{ step: "submit", by: P.josiane, at: at(-30 * 24), outcome: "done" }, { step: "approve", by: P.patrick, at: at(-29 * 24), outcome: "approved" }] }),
  pr({ id: "pr-78", no: "PR-2026-0078", title: "Brochures for tax season campaign", requester: P.josiane, requesterWorkspace: "procurement", vendorId: "v-printpro",
    lines: [ln("l1", "Tri-fold brochure (lot of 2,000)", 1, 450_000, false)], budgetCategory: "PRINT", neededBy: d(-20), justification: "Campaign print run.",
    status: "ordered", poNo: "PO-2026-0061", createdAt: at(-40 * 24),
    decisions: [{ step: "approve", by: P.patrick, at: at(-39 * 24), outcome: "approved" }] }),
  pr({ id: "pr-79", no: "PR-2026-0079", title: "Coffee machine", requester: P.eric, requesterWorkspace: "agent", lines: [ln("l1", "Coffee machine", 1, 420_000, false)],
    budgetCategory: "OFFICE", neededBy: d(-5), justification: "Staff kitchen.", status: "rejected", createdAt: at(-12 * 24),
    decisions: [{ step: "approve", by: P.patrick, at: at(-11 * 24), outcome: "rejected", reason: "Not in this year's budget plan." }] }),
  pr({ id: "pr-81", no: "PR-2026-0081", title: "Extra monitor", requester: P.diane, requesterWorkspace: "ops", lines: [ln("l1", "24\" monitor", 1, 160_000, false)],
    budgetCategory: "OFFICE", neededBy: d(-2), justification: "Second screen for dispatch.", status: "withdrawn", createdAt: at(-9 * 24),
    decisions: [{ step: "submit", by: P.diane, at: at(-9 * 24), outcome: "done" }] }),
  pr({ id: "pr-83", no: "PR-2026-0083", title: "Cleaning supplies", requester: P.josiane, requesterWorkspace: "procurement", vendorId: "v-cleanco",
    lines: [ln("l1", "Cleaning supplies pack", 4, 25_000, false)], budgetCategory: "CLEAN", neededBy: d(3), justification: "Monthly cleaning consumables.",
    status: "ordered", poNo: "PO-2026-0066", createdAt: at(-6 * 24), decisions: [{ step: "approve", by: P.patrick, at: at(-5 * 24), outcome: "approved" }] }),
];
const po = (o: Omit<PurchaseOrder, "subtotal" | "vat" | "total" | "version" | "issuedBy" | "deliveryAddress" | "paymentTermsDays"> & Partial<PurchaseOrder>): PurchaseOrder => ({
  issuedBy: P.josiane, deliveryAddress: "HEBUZA office, KN 3 Rd, Kigali", paymentTermsDays: 30, version: 1, ...o, ...totals(o.lines),
});
const pl = (l: Line, received: number) => ({ ...l, received });
export const POS: PurchaseOrder[] = [
  po({ id: "po-64", no: "PO-2026-0064", prNo: "PR-2026-0080", vendorId: "v-simba", lines: [pl(ln("l1", "HP 26A toner cartridge", 8, 45_000), 6)],
    status: "partially_received", neededBy: d(-10), issuedAt: at(-28 * 24), sentAt: at(-28 * 24), sentTo: "orders@simba-office.example" }),
  po({ id: "po-61", no: "PO-2026-0061", prNo: "PR-2026-0078", vendorId: "v-printpro", lines: [pl(ln("l1", "Tri-fold brochure (lot of 2,000)", 1, 381_356), 1)],
    status: "received", neededBy: d(-20), issuedAt: at(-38 * 24), sentAt: at(-38 * 24), sentTo: "hello@printpro.example" }),
  po({ id: "po-62", no: "PO-2026-0062", prNo: "PR-2026-0077", vendorId: "v-printpro", lines: [pl(ln("l1", "Annual printer maintenance", 1, 270_000), 1)],
    status: "received", neededBy: d(-15), issuedAt: at(-25 * 24), sentAt: at(-25 * 24), sentTo: "hello@printpro.example" }),
  po({ id: "po-65", no: "PO-2026-0065", prNo: "PR-2026-0082", vendorId: "v-simba", lines: [pl(ln("l1", "Box files A4", 20, 3_500), 20)],
    status: "received", neededBy: d(-3), issuedAt: at(-8 * 24), sentAt: at(-8 * 24), sentTo: "orders@simba-office.example" }),
  po({ id: "po-63", no: "PO-2026-0063", prNo: "PR-2026-0084", vendorId: "v-kigalinet", lines: [pl(ln("l1", "Router replacement (service)", 1, 150_000), 1)],
    status: "received", neededBy: d(-9), issuedAt: at(-14 * 24) }),
  po({ id: "po-66", no: "PO-2026-0066", prNo: "PR-2026-0083", vendorId: "v-cleanco", lines: [pl(ln("l1", "Cleaning supplies pack", 4, 25_000), 0)],
    status: "issued", neededBy: d(3), issuedAt: at(-4 * 24), sentAt: at(-4 * 24), sentTo: "—" }),
];
export const poOf = (no: string) => POS.find((x) => x.no === no || x.id === no);
export const GRNS: GoodsReceipt[] = [
  { id: "grn-51", no: "GRN-2026-0051", poNo: "PO-2026-0064", lines: [{ lineId: "l1", qty: 6, condition: "good" }], receivedBy: P.josiane, receivedAt: at(-20 * 24),
    evidence: { id: "ev-51", name: "delivery-note-2231.jpg" }, service: false, invoiced: true },
  { id: "grn-49", no: "GRN-2026-0049", poNo: "PO-2026-0061", lines: [{ lineId: "l1", qty: 1, condition: "good" }], receivedBy: P.josiane, receivedAt: at(-21 * 24),
    evidence: { id: "ev-49", name: "brochures-delivery.jpg" }, service: false, invoiced: true },
  { id: "grn-50", no: "GRN-2026-0050", poNo: "PO-2026-0062", lines: [{ lineId: "l1", qty: 1, condition: "good" }], receivedBy: P.josiane, receivedAt: at(-12 * 24), service: true, invoiced: true },
  { id: "grn-52", no: "GRN-2026-0052", poNo: "PO-2026-0065", lines: [{ lineId: "l1", qty: 20, condition: "good" }], receivedBy: P.diane, receivedAt: at(-3 * 24),
    evidence: { id: "ev-52", name: "box-files.jpg" }, service: false, invoiced: false },
  { id: "grn-53", no: "GRN-2026-0053", poNo: "PO-2026-0063", lines: [{ lineId: "l1", qty: 1, condition: "good" }], receivedBy: P.josiane, receivedAt: at(-9 * 24), service: true, invoiced: false },
];

// ---------------------------------------------------------------- bills, payments, advances
const bill = (o: Omit<Bill, "subtotal" | "vat" | "total" | "payable" | "version" | "appliedAdvances" | "amountPaid" | "route" | "routeReasons" | "createdAt" | "vatMode"> & Partial<Bill>): Bill => {
  const t = totals(o.lines);
  const applied = (o.appliedAdvances ?? []).reduce((s, a) => s + a.amount, 0);
  return { vatMode: "excl", appliedAdvances: [], amountPaid: 0, route: "finance", routeReasons: [], createdAt: o.preparedAt ?? o.invoiceDate, version: 1, ...o, ...t, payable: t.total - applied };
};
const poMatch = (poNo: string, lines: Line[]) => ({ ...match(poOf(poNo)!.lines, lines, LIMITS) });
const b119Lines = [ln("l1", "HP 26A toner cartridge", 8, 45_000)];
const b121Lines = [ln("l1", "Annual printer maintenance", 1, 273_400)];
const b118Lines = [ln("l1", "Tri-fold brochure (lot of 2,000)", 1, 450_000, true, "incl")];
export const BILLS: Bill[] = [
  bill({ id: "bl-119", no: "BL-2026-0119", vendorId: "v-simba", vendorInvoiceNo: "INV-SIM-2231", invoiceDate: d(-6), dueOn: d(8), poNo: "PO-2026-0064", lines: b119Lines,
    status: "match_exception", match: poMatch("PO-2026-0064", b119Lines), preparedBy: P.josiane, preparedAt: at(-30), budgetCategory: "OFFICE",
    file: { id: "f-119", name: "INV-SIM-2231.pdf" } }),
  bill({ id: "bl-121", no: "BL-2026-0121", vendorId: "v-printpro", vendorInvoiceNo: "INV-PP-0412", invoiceDate: d(-4), dueOn: d(26), poNo: "PO-2026-0062", lines: b121Lines,
    status: "matched", match: poMatch("PO-2026-0062", b121Lines), preparedBy: P.josiane, preparedAt: at(-20), budgetCategory: "PRINT", file: { id: "f-121", name: "INV-PP-0412.pdf" } }),
  bill({ id: "bl-118", no: "BL-2026-0118", vendorId: "v-printpro", vendorInvoiceNo: "INV-PP-0398", invoiceDate: d(-18), dueOn: d(4), poNo: "PO-2026-0061", lines: b118Lines,
    vatMode: "incl", status: "approved", match: poMatch("PO-2026-0061", b118Lines), preparedBy: P.josiane, preparedAt: at(-17 * 24), approvedBy: P.patrick, approvedAt: at(-40),
    budgetCategory: "PRINT", file: { id: "f-118", name: "INV-PP-0398.pdf" } }),
  bill({ id: "bl-117", no: "BL-2026-0117", vendorId: "v-kigalinet", vendorInvoiceNo: "INV-KIG-1188", invoiceDate: d(-12), dueOn: d(3), contractRef: "CT-2026-0003",
    lines: [ln("l1", "Fibre internet — this month", 1, 236_000, true, "incl")], vatMode: "incl", status: "authorised", match: { result: "contract", lines: [] },
    preparedBy: P.josiane, preparedAt: at(-11 * 24), approvedBy: P.patrick, approvedAt: at(-6 * 24), authorisedBy: P.solange, authorisedAt: at(-3 * 24),
    budgetCategory: "INTERNET", file: { id: "f-117", name: "INV-KIG-1188.pdf" } }),
  bill({ id: "bl-113", no: "BL-2026-0113", vendorId: "v-notary", vendorInvoiceNo: "MU-2026-033", invoiceDate: d(-42), dueOn: d(-12), lines: [ln("l1", "Notarisation of lease documents", 1, 236_000, true, "incl")],
    vatMode: "incl", noPoJustification: "Urgent notarisation for the lease file; executive approved.", status: "approved", match: { result: "no_po", lines: [], exceptionApproved: true },
    route: "executive", routeReasons: ["no_po"], preparedBy: P.josiane, preparedAt: at(-40 * 24), approvedBy: P.alice, approvedAt: at(-35 * 24), budgetCategory: "PROF",
    file: { id: "f-113", name: "MU-2026-033.pdf" } }),
  bill({ id: "bl-122", no: "BL-2026-0122", vendorId: "v-kiyovu", vendorInvoiceNo: "KH-SC-Q4", invoiceDate: d(-3), dueOn: d(12), contractRef: "CT-LEASE-001",
    lines: [ln("l1", "Service charge and parking (Q4)", 1, 1_500_000, false)], status: "approved", match: { result: "contract", lines: [] },
    preparedBy: P.josiane, preparedAt: at(-60), approvedBy: P.patrick, approvedAt: at(-24), budgetCategory: "RENT", file: { id: "f-122", name: "KH-SC-Q4.pdf" } }),
  bill({ id: "bl-116", no: "BL-2026-0116", vendorId: "v-express", vendorInvoiceNo: "EXP-077", invoiceDate: d(-9), dueOn: d(5), contractRef: "CT-2026-0005",
    lines: [ln("l1", "Courier retainer", 1, 90_000, false)], status: "disputed", disputedFrom: "matched", disputeReason: "Two deliveries in the period were not made.",
    match: { result: "contract", lines: [] }, preparedBy: P.josiane, preparedAt: at(-8 * 24), budgetCategory: "COUR", file: { id: "f-116", name: "EXP-077.pdf" } }),
  bill({ id: "bl-120", no: "BL-2026-0120", vendorId: "v-power", vendorInvoiceNo: "KWP-88213", invoiceDate: d(-2), dueOn: d(8), lines: [ln("l1", "Electricity — office meter", 1, 145_000, true, "incl")],
    vatMode: "incl", noPoJustification: "Utility bill; no PO is raised for metered electricity.", status: "submitted", match: { result: "no_po", lines: [] },
    route: "executive", routeReasons: ["no_po"], preparedBy: P.josiane, preparedAt: at(-30), budgetCategory: "UTIL", file: { id: "f-120", name: "KWP-88213.pdf" } }),
  bill({ id: "bl-115", no: "BL-2026-0115", vendorId: "v-simba", vendorInvoiceNo: "INV-SIM-2198", invoiceDate: d(-35), dueOn: d(-21), poNo: "PO-2026-0064", lines: [ln("l1", "A4 paper and files", 1, 270_000)],
    status: "paid", match: { result: "matched", lines: [] }, preparedBy: P.josiane, preparedAt: at(-34 * 24), approvedBy: P.patrick, approvedAt: at(-30 * 24),
    authorisedBy: P.solange, authorisedAt: at(-28 * 24), amountPaid: 318_600, budgetCategory: "OFFICE", file: { id: "f-115", name: "INV-SIM-2198.pdf" } }),
  bill({ id: "bl-112", no: "BL-2026-0112", vendorId: "v-kigalinet", vendorInvoiceNo: "INV-KIG-1142", invoiceDate: d(-42), dueOn: d(-27), contractRef: "CT-2026-0003",
    lines: [ln("l1", "Fibre internet — last month", 1, 236_000, true, "incl")], vatMode: "incl", status: "paid", match: { result: "contract", lines: [] }, preparedBy: P.josiane,
    preparedAt: at(-41 * 24), approvedBy: P.patrick, approvedAt: at(-35 * 24), authorisedBy: P.solange, authorisedAt: at(-30 * 24), amountPaid: 236_000, budgetCategory: "INTERNET" }),
  bill({ id: "bl-110", no: "BL-2026-0110", vendorId: "v-kiyovu", vendorInvoiceNo: "KH-RENT-11", invoiceDate: d(-12), dueOn: d(-8), contractRef: "CT-LEASE-001",
    lines: [ln("l1", "Office rent — this month", 1, 1_450_000, false)], status: "paid", match: { result: "contract", lines: [] }, preparedBy: P.josiane, preparedAt: at(-12 * 24),
    approvedBy: P.patrick, approvedAt: at(-11 * 24), authorisedBy: P.alice, authorisedAt: at(-10 * 24), amountPaid: 1_450_000, budgetCategory: "RENT" }),
];
export const billOf = (no: string) => BILLS.find((b) => b.no === no || b.id === no);
export const PAYMENTS: VendorPayment[] = [
  { id: "vp-30", no: "VP-2026-0030", vendorId: "v-kiyovu", allocations: [{ billNo: "BL-2026-0110", amount: 1_450_000 }], amount: 1_450_000, method: "bank",
    reference: "BK-TRF-771203", proof: { id: "pf-30", name: "bk-transfer-771203.pdf" }, paidBy: P.solange, paidAt: at(-9 * 24),
    remittance: { no: "RA-2026-0092", status: "sent", sentAt: at(-9 * 24), to: "leasing@kiyovu-heights.example" } },
  { id: "vp-31", no: "VP-2026-0031", vendorId: "v-simba", allocations: [{ billNo: "BL-2026-0115", amount: 318_600 }], amount: 318_600, method: "bank",
    reference: "BK-TRF-771540", proof: { id: "pf-31", name: "bk-transfer-771540.pdf" }, paidBy: P.patrick, paidAt: at(-22 * 24),
    remittance: { no: "RA-2026-0093", status: "sent", sentAt: at(-22 * 24), to: "orders@simba-office.example" } },
  { id: "vp-29", no: "VP-2026-0029", vendorId: "v-kigalinet", allocations: [{ billNo: "BL-2026-0112", amount: 236_000 }], amount: 236_000, method: "mtn_momo",
    reference: "MP261012.1452.A77", proof: { id: "pf-29", name: "momo-receipt.png" }, paidBy: P.solange, paidAt: at(-26 * 24),
    remittance: { no: "RA-2026-0091", status: "sent", sentAt: at(-26 * 24), to: "billing@kigalinet.example" } },
];
export const ADVANCES: Advance[] = [
  { id: "adv-7", no: "ADV-2026-007", vendorId: "v-printpro", kind: "advance", amount: 300_000, remaining: 300_000, paidOn: d(-25), status: "active", note: "Advance on brochure print run" },
  { id: "adv-8", no: "ADV-2026-008", vendorId: "v-cloudline", kind: "prepayment", amount: 480_000, remaining: 320_000, paidOn: d(-120), status: "active", note: "Annual software licence prepaid" },
  { id: "dp-3", no: "DP-2026-003", vendorId: "v-kiyovu", kind: "deposit", amount: 2_900_000, remaining: 2_900_000, contractRef: "CT-LEASE-001", paidOn: addDays(d(60), -3 * 365),
    returnDueOn: depositReturnDue(d(60)), status: "held" },
  { id: "dp-10", no: "DP-2026-010", vendorId: "v-kiyovu", kind: "deposit", amount: 1_600_000, remaining: 1_600_000, contractRef: "CT-LEASE-002", paidOn: "2026-12-01",
    returnDueOn: depositReturnDue("2027-11-30"), status: "pending_payment" },
  { id: "dp-11", no: "DP-2025-011", vendorId: "v-printpro", kind: "deposit", amount: 150_000, remaining: 150_000, contractRef: "CT-2025-0009", paidOn: d(-385),
    returnDueOn: depositReturnDue(d(-20)), status: "return_due" },
  { id: "dp-8", no: "DP-2025-008", vendorId: "v-express", kind: "deposit", amount: 200_000, remaining: 200_000, contractRef: "CT-2025-0007", paidOn: d(-407),
    returnDueOn: depositReturnDue(d(-42)), status: "return_due" },
  { id: "rf-1", no: "ADV-2026-006", vendorId: "v-kigalinet", kind: "refund", amount: 36_000, remaining: 36_000, status: "active", note: "Credit for 3-day outage (supplier credit note)" },
];
export const advanceOf = (no: string) => ADVANCES.find((a) => a.no === no || a.id === no);

// ---------------------------------------------------------------- derived figures
export const isLocked = (vd: Vendor) => vd.bankStatus === "unverified" || (!!vd.lockUntil && Date.parse(vd.lockUntil) > now());
const OPEN = new Set(["submitted", "matched", "match_exception", "approved", "authorised", "partially_paid", "disputed"]);
/** Recomputes vendor balances/open bills/last payment and bill status side effects. Call after every mutation. */
export function refresh() {
  for (const vd of VENDORS) {
    const mine = BILLS.filter((b) => b.vendorId === vd.id);
    vd.openBills = mine.filter((b) => OPEN.has(b.status)).length;
    vd.balance = mine.filter((b) => OPEN.has(b.status)).reduce((s, b) => s + b.payable - b.amountPaid, 0);
    vd.lastPaymentAt = PAYMENTS.filter((p) => p.vendorId === vd.id).map((p) => p.paidAt).sort().at(-1);
    const bc = BANK_CHANGES.filter((c) => c.vendorId === vd.id).at(-1);
    if (bc?.status === "verified" && vd.lockUntil && Date.parse(vd.lockUntil) <= now()) vd.lockUntil = undefined;
  }
  for (const a of ADVANCES) if (a.kind === "deposit" && a.status === "held" && a.returnDueOn) {
    const c = a.contractRef ? contractOf(a.contractRef) : undefined;
    if (c && (c.status === "terminated" || today() > c.endOn)) a.status = "return_due";
  }
}
refresh();

export function alerts(horizon = 90, t = today()): ProcAlert[] {
  const out: ProcAlert[] = [];
  const within = (on: string) => daysBetween(t, on) <= horizon;
  for (const c of CONTRACTS) {
    const s = contractStatus(c, t);
    if (s !== "active" && s !== "expiring") continue;
    const vn = vendorName(c.vendorId);
    if (within(c.endOn)) out.push({ id: `a-end-${c.id}`, kind: "contract_end", on: c.endOn, title: `${c.title} — ${vn}`, ref: c.ref, href: `/procurement/contracts/${c.id}?renew=1`, days: daysBetween(t, c.endOn), amount: c.amount });
    const nd = noticeDeadline(c);
    if (nd >= t && within(nd)) out.push({ id: `a-notice-${c.id}`, kind: "notice", on: nd, title: `Notice deadline — ${c.title}`, ref: c.ref, href: `/procurement/contracts/${c.id}`, days: daysBetween(t, nd) });
    if (c.frequency === "monthly" && c.dueDay) {
      const due = (() => { const x = new Date(`${t}T00:00:00Z`); const m = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + (x.getUTCDate() > c.dueDay! ? 1 : 0), c.dueDay!)); return m.toISOString().slice(0, 10); })();
      if (c.kind === "lease" && due <= c.endOn && within(due)) out.push({ id: `a-rent-${c.id}`, kind: "rent_due", on: due, title: `Rent due — ${c.title}`, ref: c.ref, href: `/procurement/contracts/${c.id}?tab=bills`, days: daysBetween(t, due), amount: c.amount });
    }
  }
  for (const b of BILLS) if (OPEN.has(b.status) && b.status !== "disputed") {
    const days = daysBetween(t, b.dueOn);
    if (days < 0) out.push({ id: `a-od-${b.id}`, kind: "bill_overdue", on: b.dueOn, title: `Overdue — ${vendorName(b.vendorId)} ${b.vendorInvoiceNo}`, ref: b.no, href: `/procurement/bills/${b.no}`, days, amount: b.payable - b.amountPaid });
    else if (within(b.dueOn)) out.push({ id: `a-due-${b.id}`, kind: "bill_due", on: b.dueOn, title: `${vendorName(b.vendorId)} — ${b.vendorInvoiceNo}`, ref: b.no, href: `/procurement/bills/${b.no}`, days, amount: b.payable - b.amountPaid });
  }
  for (const a of ADVANCES) if (a.kind === "deposit" && a.returnDueOn && ["held", "return_due", "partially_returned"].includes(a.status) && within(a.returnDueOn))
    out.push({ id: `a-dep-${a.id}`, kind: "deposit_return", on: a.returnDueOn, title: `Deposit return — ${vendorName(a.vendorId)}`, ref: a.no, href: `/procurement/deposits?item=${a.no}`, days: daysBetween(t, a.returnDueOn), amount: a.remaining });
  for (const vd of VENDORS) for (const doc of vd.documents) if (doc.expiresOn && within(doc.expiresOn) && doc.expiresOn >= t)
    out.push({ id: `a-doc-${doc.id}`, kind: "document", on: doc.expiresOn, title: `${doc.name} — ${vd.legalName}`, ref: vd.code, href: `/procurement/suppliers/${vd.id}?tab=documents`, days: daysBetween(t, doc.expiresOn) });
  for (const c of BANK_CHANGES) if (c.status === "requested")
    out.push({ id: `a-bank-${c.id}`, kind: "bank_change", on: c.requestedAt.slice(0, 10), title: `Bank details changed — ${vendorName(c.vendorId)}`, ref: vendorOf(c.vendorId)?.code ?? "", href: `/procurement/suppliers/${c.vendorId}`, days: 0 });
  return out.sort((x, y) => x.on.localeCompare(y.on));
}

/** Unified approvals queue (§9.2 GET /approvals). blockedSelf = shown but locked by segregation. */
export function approvalsFor(a: Actor = actor()): ProcApproval[] {
  const items: ProcApproval[] = [];
  const exec = isExec(a), fin = isFin(a);
  for (const p of PRS) if (p.status === "submitted" && ((p.route === "finance" && fin) || exec) && (p.route === "executive" ? exec : true))
    items.push({ id: p.id, kind: "pr", ref: p.no, title: p.title, amount: p.estimatedTotal, reasons: p.routeReasons, maker: p.requester, at: p.submittedAt ?? p.createdAt,
      href: exec && !fin ? `/exec/approvals?type=pr&item=${p.no}` : `/finance/payables?tab=approve&item=${p.no}`, blockedSelf: p.requester.id === a.id, vendorName: vendorName(p.vendorId) });
  for (const b of BILLS) {
    const mk = { ref: b.no, title: `${vendorName(b.vendorId)} · ${b.vendorInvoiceNo}`, vendorName: vendorName(b.vendorId), amount: b.total, maker: b.preparedBy ?? P.josiane,
      locked: isLocked(vendorOf(b.vendorId)!) ? vendorOf(b.vendorId)!.lockUntil ?? "pending" : undefined };
    const approvable = b.status === "matched" || b.status === "submitted" || (b.status === "match_exception" && b.match?.exceptionApproved);
    if (approvable && ((b.route === "finance" && fin) || (b.route === "executive" && exec)))
      items.push({ id: b.id, kind: "bill_approve", reasons: b.routeReasons, at: b.preparedAt ?? b.createdAt, href: b.route === "executive" ? `/exec/approvals?type=bills&item=${b.no}` : `/finance/payables?tab=approve&item=${b.no}`,
        blockedSelf: b.preparedBy?.id === a.id, ...mk });
    if (b.status === "match_exception" && b.match?.exceptionRequested && !b.match.exceptionApproved && exec)
      items.push({ id: `${b.id}-x`, kind: "exception", reasons: ["match_exception"], at: b.preparedAt ?? b.createdAt, href: `/exec/approvals?type=exceptions&item=${b.no}`, ...mk });
    if (b.status === "approved") {
      const execStep = b.total > LIMITS.financeMax;
      if ((execStep && exec) || (!execStep && fin))
        items.push({ id: `${b.id}-a`, kind: "bill_authorise", reasons: execStep ? ["over_limit"] : [], at: b.approvedAt ?? b.createdAt,
          href: execStep ? `/exec/approvals?type=bills&item=${b.no}` : `/finance/payables?tab=authorise&item=${b.no}`,
          blockedSelf: b.approvedBy?.id === a.id || b.preparedBy?.id === a.id, ...mk });
    }
  }
  if (exec) {
    for (const c of CONTRACTS) if (c.renewal?.status === "requested")
      items.push({ id: `${c.id}-r`, kind: "renewal", ref: c.ref, title: c.title, vendorName: vendorName(c.vendorId), amount: c.renewal.amount, reasons: [], maker: P.josiane, at: c.renewal.at, href: `/exec/approvals?type=renewals&item=${c.ref}` });
    for (const p of PROPOSALS) if (p.status === "pending")
      items.push({ id: p.id, kind: "settings", ref: p.id, title: "Procurement limits and budgets", reasons: [], maker: p.by, at: p.at, href: `/exec/approvals?type=settings&item=${p.id}`, blockedSelf: p.by.id === a.id });
    for (const x of ADVANCES) if (x.forfeit?.status === "requested")
      items.push({ id: `${x.id}-f`, kind: "forfeit", ref: x.no, title: `Forfeit deposit — ${vendorName(x.vendorId)}`, vendorName: vendorName(x.vendorId), amount: x.remaining, reasons: [], maker: P.josiane, at: nowIso(), href: `/exec/approvals?type=exceptions&item=${x.no}` });
  }
  if (fin) for (const c of BANK_CHANGES) if (c.status === "requested")
    items.push({ id: c.id, kind: "bank", ref: vendorOf(c.vendorId)?.code ?? c.vendorId, title: `Bank details — ${vendorName(c.vendorId)}`, vendorName: vendorName(c.vendorId), reasons: [], maker: c.requestedBy, at: c.requestedAt,
      href: `/finance/payables?tab=bank&item=${c.id}`, blockedSelf: c.requestedBy.id === a.id });
  return items.sort((x, y) => x.at.localeCompare(y.at));
}

export function summary(a: Actor = actor()): ProcSummary {
  refresh();
  const t = today();
  const al = alerts(90, t);
  const live = (b: Bill) => OPEN.has(b.status) && b.status !== "disputed";
  const dueWeek = BILLS.filter((b) => live(b) && b.dueOn >= t && daysBetween(t, b.dueOn) <= 7);
  const overdue = BILLS.filter((b) => live(b) && b.dueOn < t);
  const lease = CONTRACTS.filter((c) => c.kind === "lease" && ["active", "expiring"].includes(contractStatus(c, t))).sort((x, y) => x.endOn.localeCompare(y.endOn))[0];
  const leaseDays = lease ? daysBetween(t, lease.endOn) : undefined;
  const budgetTotal = BUDGETS.reduce((s, b) => s + b.annualBudget, 0);
  const used = BUDGETS.reduce((s, b) => s + b.actual, 0);
  const prOpen = PRS.filter((p) => p.status === "submitted" || p.status === "approved").length;
  const exceptions = BILLS.filter((b) => b.status === "match_exception" || b.status === "draft").length;
  const appr = approvalsFor(a).filter((i) => !i.blockedSelf);
  const ends = (n: number) => CONTRACTS.filter((c) => ["active", "expiring"].includes(contractStatus(c, t)) && daysBetween(t, c.endOn) <= n).length;
  return {
    tiles: {
      contracts60: ends(60), contracts90: ends(90),
      billsDueWeek: dueWeek.reduce((s, b) => s + b.payable - b.amountPaid, 0), billsDueWeekCount: dueWeek.length,
      overdue: overdue.reduce((s, b) => s + b.payable - b.amountPaid, 0), overdueCount: overdue.length,
      notInvoiced: GRNS.filter((g) => !g.invoiced && !g.reverses).length,
      depositsOutstanding: ADVANCES.filter((x) => x.kind === "deposit" && ["held", "return_due", "partially_returned"].includes(x.status)).reduce((s, x) => s + x.remaining, 0),
      budgetUsedPct: budgetTotal ? Math.round((used * 100) / budgetTotal) : 0,
    },
    banner: { leaseDays: leaseDays !== undefined && leaseDays <= 90 ? leaseDays : undefined, leaseRef: lease?.ref, billsDue: dueWeek.length, requests: prOpen },
    balances: [...VENDORS].filter((x) => x.balance > 0).sort((x, y) => y.balance - x.balance).slice(0, 5).map((x) => ({ vendorId: x.id, name: x.legalName, balance: x.balance })),
    obligations: al.filter((x) => x.kind !== "bank_change").slice(0, 5),
    checklist: {
      landlord: VENDORS.some((x) => x.type === "landlord" && x.status === "active"), lease: CONTRACTS.some((c) => c.kind === "lease"),
      budgets: BUDGETS.length > 0, limits: LIMITS.financeMax > 0,
    },
    badges: {
      requests: PRS.filter((p) => p.status === "approved").length, bills: exceptions,
      deposits: ADVANCES.filter((x) => x.status === "return_due" && x.returnDueOn && x.returnDueOn < t).length,
      payables: appr.filter((i) => i.href.startsWith("/finance")).length, execApprovals: appr.filter((i) => i.href.startsWith("/exec")).length,
    },
    firstRun: VENDORS.length === 0,
  };
}

/** Bell items per persona (§8.2), derived from alerts + queue. */
export function notesFor(a: Actor = actor()): ProcNote[] {
  const out: ProcNote[] = [];
  const t = today();
  if (isProc(a)) {
    for (const x of alerts(60, t)) out.push({ id: `n-${x.id}`, kind: x.kind, text: x.title, ref: x.ref, href: x.href, at: `${x.on}T06:00:00.000Z`, read: false });
    for (const b of BILLS) if (b.status === "match_exception") out.push({ id: `n-mx-${b.id}`, kind: "bill_exception", text: `Match exception — ${b.no}`, ref: b.no, href: `/procurement/bills/${b.no}?tab=match`, at: b.preparedAt ?? b.createdAt, read: false });
    for (const p of PRS) if (p.status === "approved") out.push({ id: `n-pr-${p.id}`, kind: "pr_decided", text: `Approved — ${p.title}`, ref: p.no, href: `/procurement/requests/${p.no}`, at: p.decisions.at(-1)?.at ?? p.createdAt, read: true });
  }
  if (isFin(a) || isExec(a)) {
    for (const i of approvalsFor(a)) if (!i.blockedSelf) out.push({ id: `n-${i.id}`, kind: i.kind, text: i.title, ref: i.ref, href: i.href, at: i.at, read: false });
    for (const x of alerts(30, t)) if (x.kind === "bill_overdue" || x.kind === "deposit_return" || (x.kind === "bill_due" && x.days <= PROC_POLICY.dueSoonDays))
      out.push({ id: `n-${x.id}`, kind: x.kind, text: x.title, ref: x.ref, href: isFin(a) ? `/finance/payables?tab=pay` : x.href, at: `${x.on}T06:00:00.000Z`, read: false });
  }
  return out.sort((x, y) => y.at.localeCompare(x.at)).slice(0, 30);
}

/** Bucket figures for the ageing report (R-12). */
export function ageing(asOf = today()) {
  const rows = BILLS.filter((b) => OPEN.has(b.status) && b.payable - b.amountPaid > 0).map((b) => ({ bill: b, bucket: ageingBucket(b.dueOn, asOf), open: b.payable - b.amountPaid }));
  return rows;
}
export const meterFor = (code: string, adding = 0) => { const b = budgetOf(code); return b ? budgetMeter(b, adding, LIMITS) : null; };
export { noticeDeadline };

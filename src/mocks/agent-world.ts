// Stage 4 fixture world for the Internal Agent (persona Eric Habimana, ag-eric, 30% share, SM Diane).
// Built ON TOP of ops-world: Eric's cases are the ops CASES assigned to ag-eric, and accepting an offer assigns the
// ops case, so /ops and /agent always agree. Lanes may add fields by wrapping in their own handler files.
// shortcut: mock-only shapes (x_agent extension, plan §6); replace per endpoint as /api/agent/x/* lands.
import {
  CASES,
  CLIENTS,
  MANAGER,
  SERVICES,
  serviceOf,
  type OpsCase,
} from "./ops-world";
import { expectedEarning, shareOf, type MoneyState, type Rate } from "@/lib/agent/money";

const H = 3600_000;
const NOW = Date.now();
const at = (h: number) => new Date(NOW + h * H).toISOString();

export let ME = {
  id: "ag-eric",
  name: "Eric Habimana",
  title: "Tax adviser",
  kind: "Internal partner",
  sharePct: 0.3,
  shareBps: 3000, // internal agent: share only (X-2)
  email: "eric.habimana@hebuza.example",
  phone: "+250 788 000 214",
  manager: MANAGER,
};

// ---------------------------------------------------------------- workspace state (duty, leave, clearance)
export type Duty = "on" | "away";
export type Clearance =
  "new" | "in_progress" | "submitted" | "changes_requested" | "cleared";
export let STATE = {
  duty: "on" as Duty,
  awayUntil: null as string | null,
  leave: null as null | {
    from: string;
    to: string;
    status: "pending" | "approved" | "declined";
    reason: string;
  },
  clearance: "cleared" as Clearance,
  outbox: 0,
};

// ---------------------------------------------------------------- offers (3 pending = Today strip + Offers tab)
export type OfferStatus =
  "pending" | "accepted" | "declined" | "expired" | "returned";
export type Offer = {
  id: string;
  ref: string;
  service: string;
  clientId: string;
  summary: string;
  sentAt: string;
  expiresAt: string;
  dueAt: string;
  effortH: number;
  eligible: number;
  shared: [number, number]; // items shared of total
  skills: string[];
  status: OfferStatus;
  decidedAt?: string;
  reason?: string;
  note?: string;
  /** Stage 8: agreed rate for externals (flat or bps); internal offers use ME.shareBps. */
  rate?: Rate;
  /** Stage 8 counter-proposal (TTL paused while pending). */
  counter?: { due: string; reason: string; status: "pending" | "accepted" | "declined" };
};
const offer = (
  ref: string,
  summary: string,
  expiresH: number,
  dueH: number,
  effortH: number,
  shared: [number, number],
  skills: string[],
  status: OfferStatus = "pending",
  decidedH?: number,
  reason?: string,
): Offer => {
  const c = CASES.find((x) => x.ref === ref)!;
  return {
    id: `of-${ref}`,
    ref,
    service: c.service,
    clientId: c.clientId,
    summary,
    sentAt: at(-1),
    expiresAt: at(expiresH),
    dueAt: at(dueH),
    effortH,
    eligible: serviceOf(c.service)?.fee ?? 0,
    shared,
    skills,
    status,
    decidedAt: decidedH === undefined ? undefined : at(decidedH),
    reason,
  };
};
export let OFFERS: Offer[] = [
  offer(
    "HBZ-8VB2XC",
    "Prepare and submit the VAT declaration for the October 2026 period.",
    3.2,
    52,
    3,
    [4, 9],
    ["VAT", "RRA e-Tax"],
  ),
  offer(
    "HBZ-9QW5ZE",
    "Register the cooperative with RDB.",
    48,
    72,
    4,
    [2, 6],
    ["RDB"],
  ),
  offer(
    "HBZ-2RT8LM",
    "Obtain the tax clearance certificate from RRA.",
    120,
    120,
    2,
    [3, 7],
    ["RRA"],
  ),
  offer(
    "HBZ-6LP4WS",
    "Trademark search and filing.",
    -20,
    230,
    5,
    [2, 5],
    ["Trademark"],
    "expired",
    -20,
  ),
  offer(
    "HBZ-1ZQ9YU",
    "Investment certificate application.",
    -30,
    230,
    8,
    [3, 8],
    ["RDB"],
    "declined",
    -30,
    "expertise",
  ),
];

// ---------------------------------------------------------------- my cases + per-case agent extras
export const mine = (c: OpsCase) => c.assignees.some((a) => a.id === ME.id);
export const myCases = () => CASES.filter(mine);

export type ChecklistStep = {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
};
export type DeliverableVersion = {
  v: string;
  name: string;
  size: number;
  at: string;
  state: "uploaded" | "returned" | "approved";
  comment?: string;
};
export type DeliverableSlot = {
  key: string;
  label: string;
  required: boolean;
  versions: DeliverableVersion[];
};
export type TimeEntry = {
  id: string;
  date: string;
  minutes: number;
  activity: string;
  note?: string;
};
export type CaseExtra = {
  instructions: string;
  checklist: ChecklistStep[];
  slots: DeliverableSlot[];
  clientNote: string;
  review: null | {
    state: "submitted" | "returned" | "approved" | "released";
    at: string;
    comments?: { slot: string; text: string; by: string; at: string }[];
  };
  timesheet: TimeEntry[];
  dispute: null | { id: string; text: string; openedAt: string };
  unread: number;
  docsToCheck: number;
};
const STEPS: Record<string, string[]> = {
  "vat-declaration": [
    "Collect sales book",
    "Reconcile EBM receipts",
    "File on RRA e-Tax",
    "Upload filing receipt",
  ],
  "company-registration": [
    "Check shareholder IDs",
    "Reserve company name",
    "Submit on RDB portal",
    "Upload certificate",
  ],
  "trademark-registration": [
    "Run trademark search",
    "Prepare class list",
    "File with RDB IP office",
    "Upload filing receipt",
  ],
};
const SLOTS: Record<string, [string, string, boolean][]> = {
  "vat-declaration": [
    ["return", "VAT return (PDF)", true],
    ["receipt", "RRA filing receipt (PDF)", true],
    ["note", "Cover note to client", false],
  ],
  "company-registration": [
    ["certificate", "Certificate of incorporation", true],
    ["note", "Cover note to client", false],
  ],
};
const EXTRA = new Map<string, CaseExtra>();
export function extraOf(ref: string): CaseExtra {
  let e = EXTRA.get(ref);
  if (e) return e;
  const c = CASES.find((x) => x.ref === ref);
  const svc = c?.service ?? "vat-declaration";
  const steps = STEPS[svc] ?? STEPS["vat-declaration"];
  const inReview = c?.status === "awaiting_internal_review";
  e = {
    instructions: `Please verify the client's figures before filing and request anything missing early. Due dates are firm for RRA.`,
    checklist: steps.map((label, i) => ({
      id: `s${i + 1}`,
      label,
      done: inReview || (c?.status === "in_progress" && i < 2),
    })),
    slots: (SLOTS[svc] ?? SLOTS["company-registration"]).map(
      ([key, label, required]) => ({
        key,
        label,
        required,
        versions:
          inReview && required
            ? [
                {
                  v: "v1.0",
                  name: `${key}_v1.pdf`,
                  size: 245_000,
                  at: at(-3),
                  state: "uploaded",
                },
              ]
            : [],
      }),
    ),
    clientNote: "",
    review: inReview ? { state: "submitted", at: at(-3) } : null,
    timesheet:
      c?.status === "in_progress"
        ? [
            {
              id: "t1",
              date: at(-24),
              minutes: 90,
              activity: "advisory",
              note: "Reviewed sales book",
            },
          ]
        : [],
    dispute:
      c?.status === "refund_requested"
        ? {
            id: "DS-2026-0042",
            text: "Client says the filing was late.",
            openedAt: at(-30),
          }
        : null,
    unread: c?.ref === "HBZ-8VB2XCQ" ? 2 : c?.ref === "HBZ-6LP4WSS" ? 1 : 0,
    docsToCheck: c?.ref === "HBZ-8VB2XCQ" ? 2 : 0,
  };
  EXTRA.set(ref, e);
  return e;
}

// ---------------------------------------------------------------- earnings (Jul–Nov) — every amount through shareOf
export type Allocation = {
  id: string;
  ref: string;
  service: string;
  clientId: string;
  eligible: number;
  amount: number;
  state: MoneyState;
  at: string;
  payoutRef?: string;
  question?: { id: string; status: "open" | "answered" };
};
const alloc = (
  i: number,
  ref: string,
  service: string,
  clientId: string,
  eligible: number,
  state: MoneyState,
  daysAgo: number,
): Allocation => ({
  id: `al-${i}`,
  ref,
  service,
  clientId,
  eligible,
  amount: shareOf(eligible, ME.shareBps),
  state,
  at: at(-24 * daysAgo),
});
const svcs = SERVICES.filter((s) => s.fee && s.fee < 100_000);
export let ALLOCATIONS: Allocation[] = Array.from({ length: 24 }, (_, i) => {
  const s = svcs[i % svcs.length];
  const daysAgo = 2 + i * 5; // spans ~Jul → Nov
  const state: MoneyState =
    daysAgo > 40
      ? "paid"
      : daysAgo > 20
        ? "scheduled"
        : daysAgo > 8
          ? "approved"
          : "allocated";
  return alloc(
    i,
    `HBZ-${(7_000 + i * 37).toString(36).toUpperCase().padStart(6, "Q")}`,
    s.slug,
    CLIENTS[i % CLIENTS.length].id,
    s.fee ?? 15_000,
    state,
    daysAgo,
  );
});
export let PAYOUTS = [
  {
    id: "po-3",
    date: at(-24 * 10),
    method: "MTN MoMo",
    ref: "MP26112834",
    amount: 0,
    status: "pending" as "pending" | "paid" | "failed",
  },
  {
    id: "po-2",
    date: at(-24 * 40),
    method: "MTN MoMo",
    ref: "MP26101887",
    amount: 0,
    status: "paid" as const,
  },
  {
    id: "po-1",
    date: at(-24 * 70),
    method: "Airtel Money",
    ref: "AM25091821",
    amount: 0,
    status: "paid" as const,
  },
];
export let PAYOUT_METHOD = {
  kind: "momo" as "momo" | "bank",
  label: "MTN MoMo",
  last4: "0214",
  verified: true,
};

/** Offer → share the agent would earn (D2). */
export const offerShare = (o: Offer) =>
  o.rate ? expectedEarning(o.eligible, o.rate) : shareOf(o.eligible, ME.shareBps);

/** Accept: assigns the ops case to Eric (shared world), optionally starts work (D4). */
export function acceptOffer(o: Offer, startNow: boolean) {
  const c = CASES.find((x) => x.ref === o.ref);
  if (c) {
    c.assignees = [{ id: ME.id, role: "lead" }];
    c.previous = c.status;
    c.status = startNow ? "in_progress" : "approved_assigned";
    c.dueAt = o.dueAt;
    c.updatedAt = new Date().toISOString();
  }
  o.status = "accepted";
  o.decidedAt = new Date().toISOString();
}

// ---------------------------------------------------------------- Stage 8: actor-aware world (plan §9.4)
// The /agent and /work workspaces share these handlers; each actor has its own world, swapped in through ES live
// bindings before every /api/agent/* request (handlers-work.ts preHandlers). Eric's data is untouched.
// shortcut: one active world at a time (single-user browser mock), upgrade when the real API scopes by token.
export type World = {
  ME: typeof ME;
  STATE: typeof STATE;
  OFFERS: Offer[];
  ALLOCATIONS: Allocation[];
  PAYOUTS: typeof PAYOUTS;
  PAYOUT_METHOD: typeof PAYOUT_METHOD;
};
const WORLDS: Record<string, World> = {
  agent: { ME, STATE, OFFERS, ALLOCATIONS, PAYOUTS, PAYOUT_METHOD },
};
let active = "agent";
export const registerWorld = (key: string, w: World) => {
  WORLDS[key] = w;
};
/** Make `key`'s world the one every agent handler reads. Unknown keys fall back to Eric. */
export function selectWorld(key: string) {
  const k = WORLDS[key] ? key : "agent";
  if (k === active) return;
  active = k;
  ({ ME, STATE, OFFERS, ALLOCATIONS, PAYOUTS, PAYOUT_METHOD } = WORLDS[k]);
}
export const activeWorld = () => active;

// Lane C mocks: staff MFA/invite (F-IAM-05/09), workload + workforce approvals (M9), SLA rules/health (F-REQ-12),
// deliverable reviews + gate override + second approval (F-DLV-03/05), revenue allocation (F-REV-06).
// shortcut: ★ mock — spec-shaped; replace per endpoint as the server ships them. Reads/mutates ops-world so numbers agree.
// Demo rules: TOTP "123456" passes; a backup code passes once if it is in the issued set (codes()); invite token "expired" → 410, "bad" → 404.
import { http, HttpResponse, delay } from "msw";
import {
  CASES,
  AGENTS,
  SERVICES,
  MANAGER,
  serviceOf,
  agentOf,
  type OpsCase,
} from "./ops-world";
import type { CaseStatus } from "@/shared/domain/case-status";
import { PERSONAS, currentPersona, setPersona } from "./personas";
import { audit, auditFor } from "./audit";
import { POLICY } from "@/shared/policy";

const ok = <T>(data: T, message = "OK") =>
  HttpResponse.json({ success: true, message, errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );
const H = 3600_000;
const iso = (t: number) => new Date(t).toISOString();
// Backup codes are single use: checked against the issued set and burned (F-IAM-05). Defined after codes() below.
const goodCode = (code: string, backup?: boolean) =>
  backup ? issued.delete(code.trim().toUpperCase()) : code === "123456";
/** Mock actor: the active persona (Diane by default). */
const actor = () => { const p = currentPersona(); return { id: p?.key ?? "sm", name: p?.name ?? MANAGER.name }; };
/** Audit reason: body field, else the X-Audit-Reason header the client sends (spec §2.7). */
const why = (req: Request, body?: string) => body ?? decodeURIComponent(req.headers.get("x-audit-reason") ?? "");
/** Runs audit(); a blank required reason becomes 422 reason_required. */
const audited = (e: Parameters<typeof audit>[0]) => {
  try { audit(e); return null; } catch { return fail(422, "reason_required", "Give a reason."); }
};
const stepUpOk = (r: Request) =>
  r.headers.get("x-step-up-token")?.startsWith("su_");
const needStepUp = () =>
  fail(401, "step_up_required", "Confirm it's you first.");
const CLOSED: CaseStatus[] = [
  "completed_delivered",
  "rejected",
  "cancelled",
  "refunded",
];
const PAUSED: CaseStatus[] = [
  "on_hold",
  "awaiting_client_documents",
  "awaiting_external_institution",
  "awaiting_quotation",
  "awaiting_payment",
];

// ---------------------------------------------------------------- U3 MFA
const MFA_KEY = "posiba.mfaEnrolled";
const enrolled = () => {
  try {
    return localStorage.getItem(MFA_KEY) !== "0";
  } catch {
    return true;
  }
};
const setEnrolled = (v: boolean) => {
  try {
    localStorage.setItem(MFA_KEY, v ? "1" : "0");
  } catch {}
};
/** Not scannable: a deterministic pattern standing in for the server-rendered QR. */
const fakeQr = (seed: string) => {
  let h = 0;
  const cells: string[] = [];
  for (let y = 0; y < 25; y++)
    for (let x = 0; x < 25; x++) {
      const finder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
      h = (h * 31 + seed.charCodeAt((x + y) % seed.length) + x * 7 + y) >>> 0;
      const on = finder
        ? x % 6 === 0 ||
          y % 6 === 0 ||
          (x % 6 > 1 && x % 6 < 5 && y % 6 > 1 && y % 6 < 5) ||
          x === 18 ||
          x === 24 ||
          y === 18 ||
          y === 24
        : h % 3 === 0;
      if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 29 29" shape-rendering="crispEdges"><rect x="-2" y="-2" width="29" height="29" fill="#fff"/><g fill="#111218">${cells.join("")}</g></svg>`)}`;
};
const codes = () =>
  Array.from(
    { length: 10 },
    (_, i) =>
      `${"KQ7MXR2TWBNP"[i]}${(4831 + i * 977).toString(36).toUpperCase().padStart(3, "Z")}-${(1000 + ((i * 7919) % 9000)).toString()}`,
  );
let issued = new Set(codes());
const issue = (list: string[]) => ((issued = new Set(list)), list);
let devices = [
  {
    id: "dev-1",
    label: "Chrome · Linux",
    place: "Kigali",
    lastSeen: iso(Date.now()),
    current: true,
  },
  {
    id: "dev-2",
    label: "Android app",
    place: "Kigali",
    lastSeen: iso(Date.now() - 50 * H),
    current: false,
  },
  {
    id: "dev-3",
    label: "Safari · iPhone",
    place: "Musanze",
    lastSeen: iso(Date.now() - 9 * 24 * H),
    current: false,
  },
];

// ---------------------------------------------------------------- U11 workload
const open = (c: OpsCase) => !CLOSED.includes(c.status);
const casesOf = (id: string) =>
  CASES.filter((c) => open(c) && c.assignees.some((a) => a.id === id));
const weekStart = (offset: number) => {
  const d = new Date(Date.now() + 2 * H);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offset * 7);
  return d.getTime() - 2 * H;
};
const row = (a: (typeof AGENTS)[number], week = 0) => {
  const mine = casesOf(a.id),
    now = Date.now(),
    ws = weekStart(week);
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    external: !!a.external,
    skillsLabel: a.skillsLabel,
    status: a.status,
    onLeaveUntil: a.onLeaveUntil ?? null,
    load: a.load,
    cap: a.cap,
    dueWeek: mine.filter(
      (c) => Date.parse(c.dueAt) >= ws && Date.parse(c.dueAt) < ws + 7 * 24 * H,
    ).length,
    overdue: mine.filter(
      (c) => !PAUSED.includes(c.status) && Date.parse(c.dueAt) < now,
    ).length,
    onTime: a.onTime,
    rating: a.rating,
    days: [0, -1, 0, 1, 0].map((d, i) =>
      a.status === "leave"
        ? 0
        : Math.max(
            0,
            a.load + d + ((i + week + a.name.length) % 3 === 0 ? 1 : 0) - 1,
          ),
    ),
    services: a.services,
  };
};
const agentCase = (c: OpsCase) => ({
  ref: c.ref,
  service: serviceOf(c.service).name,
  serviceSlug: c.service,
  status: c.status,
  dueAt: c.dueAt,
});
const plus = (days: number) => iso(Date.now() + days * 24 * H).slice(0, 10);
type Approval = {
  id: string;
  kind: "leave" | "skill" | "due";
  agentId: string;
  agentName: string;
  state: "pending" | "approved" | "declined";
  submittedAt: string;
  reason: string;
  from?: string;
  to?: string;
  impact?: string[];
  skill?: string;
  certificate?: string;
  ref?: string;
  service?: string;
  currentDue?: string;
  proposedDue?: string;
};
const dueCase = CASES.find(
  (c) => open(c) && c.assignees.some((a) => a.id === "ag-jp"),
);
const approvals: Approval[] = [
  {
    id: "ap-leave-1",
    kind: "leave",
    agentId: "ag-claudine",
    agentName: agentOf("ag-claudine").name,
    state: "pending",
    submittedAt: iso(Date.now() - 20 * H),
    reason: "Personal reasons",
    from: plus(8),
    to: plus(12),
    impact: casesOf("ag-claudine")
      .slice(0, 4)
      .map((c) => c.ref),
  },
  {
    id: "ap-skill-1",
    kind: "skill",
    agentId: "ag-eric",
    agentName: agentOf("ag-eric").name,
    state: "pending",
    submittedAt: iso(Date.now() - 30 * H),
    reason: "Completed RDB IP training",
    skill: "Trademark registration",
    certificate: "RDB-IP-certificate.pdf",
  },
  {
    id: "ap-due-1",
    kind: "due",
    agentId: "ag-jp",
    agentName: agentOf("ag-jp").name,
    state: "pending",
    submittedAt: iso(Date.now() - 4 * H),
    reason: "Client asked to add a second shareholder",
    ref: dueCase?.ref,
    service: dueCase ? serviceOf(dueCase.service).name : undefined,
    currentDue: dueCase?.dueAt,
    proposedDue: dueCase
      ? iso(Date.parse(dueCase.dueAt) + 4 * 24 * H)
      : undefined,
  },
];

// ---------------------------------------------------------------- U13 reviews
const page = (title: string, v: number, n: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 594"><rect width="420" height="594" fill="#fff"/><rect x="32" y="36" width="120" height="14" rx="3" fill="#3c0074"/><text x="32" y="92" font-family="sans-serif" font-size="18" fill="#111218">${title.replace(/&/g, "&amp;")}</text><text x="32" y="116" font-family="sans-serif" font-size="12" fill="#6b6b6b">Version ${v} · page ${n}</text>${Array.from({ length: 14 }, (_, i) => `<rect x="32" y="${150 + i * 26}" width="${300 - ((i * 37 + v * 23) % 120)}" height="8" rx="4" fill="${v > 1 && i === 5 ? "#ffec3e" : "#e9e4d8"}"/>`).join("")}<rect x="280" y="500" width="100" height="56" rx="6" fill="none" stroke="#3c0074" stroke-dasharray="4 3"/><text x="292" y="533" font-family="sans-serif" font-size="11" fill="#3c0074">${v > 1 ? "Signed" : "Unsigned"}</text></svg>`,
  )}`;
type Review = {
  id: string;
  ref: string;
  deliverable: string;
  authorId: string;
  authorName: string;
  version: number;
  submittedAt: string;
  reviewDueAt: string;
  secondLevel: boolean;
  state: "awaiting" | "returned" | "approved";
  files: {
    id: string;
    name: string;
    kind: "pdf" | "image";
    versions: { v: number; pages: string[] }[];
  }[];
  comments: {
    id: string;
    fileId: string;
    author: string;
    body: string;
    at: string;
    page: number;
    x: number;
    y: number;
  }[];
  requirements: { id: string; label: string; met: boolean }[];
  chain: {
    name: string;
    role: string;
    state: "approved" | "pending" | "requested" | "waiting";
  }[];
  override: { reason: string; by: string; at: string } | null;
  allocation: {
    fee: number;
    deductions: { label: string; amount: number }[];
    agentPct: number;
    shares: { id: string; name: string; pct: number }[];
    reviewed: boolean;
  } | null;
  returned: { to: string; due: string } | null;
  firstBy?: string;
  pending?: string;
};
const DELIVERABLE: Record<string, [string, string][]> = {
  "company-registration": [
    ["Certificate of incorporation.pdf", "pdf"],
    ["RDB receipt.pdf", "pdf"],
  ],
  "vat-declaration": [["VAT return Q3.pdf", "pdf"]],
  "tax-clearance-certificate": [["Tax clearance certificate.pdf", "pdf"]],
  "investment-certificate": [
    ["Investment certificate.pdf", "pdf"],
    ["RDB approval letter.pdf", "pdf"],
    ["Site photo.jpg", "image"],
  ],
  "paye-monthly-filing": [["PAYE filing October.pdf", "pdf"]],
  "trademark-registration": [["Trademark certificate.pdf", "pdf"]],
};
const reviews: Review[] = CASES.filter(
  (c) =>
    c.status === "awaiting_internal_review" ||
    c.status === "completed_delivered",
).map((c, i) => {
  const lead = c.assignees.find((a) => a.role === "lead")!;
  const author =
    c.service === "paye-monthly-filing" && c.status !== "completed_delivered"
      ? { id: MANAGER.id, name: MANAGER.name }
      : { id: lead.id, name: agentOf(lead.id).name };
  const files = (DELIVERABLE[c.service] ?? [["Deliverable.pdf", "pdf"]]).map(
    ([name, kind], j) => ({
      id: `f-${c.ref}-${j}`,
      name,
      kind: kind as "pdf" | "image",
      versions: [1, 2]
        .slice(0, j === 0 ? 2 : 1)
        .map((v) => ({
          v,
          pages: [1, 2, 3]
            .slice(0, kind === "image" ? 1 : 3)
            .map((n) => page(name.replace(/\.\w+$/, ""), v, n)),
        })),
    }),
  );
  const high = (c.amount ?? 0) >= 500_000;
  const done = c.status === "completed_delivered";
  const fee = c.amount ?? serviceOf(c.service).fee ?? 0;
  return {
    id: `rv-${c.ref}`,
    ref: c.ref,
    deliverable: files[0].name,
    authorId: author.id,
    authorName: author.name,
    version: files[0].versions.length,
    submittedAt: done ? c.updatedAt : iso(Date.now() - (2 + i) * H),
    reviewDueAt: done ? c.dueAt : iso(Date.now() + (6 + i * 5) * H),
    secondLevel: high,
    state: (done ? "approved" : "awaiting") as Review["state"],
    files,
    comments: [
      {
        id: `cm-${i}`,
        fileId: files[0].id,
        author: author.name,
        body: "v2 adds the signed page and corrects the TIN.",
        at: iso(Date.now() - 2 * H),
        page: 1,
        x: 70,
        y: 84,
      },
    ],
    requirements: [
      { id: "r1", label: "Matches the brief's scope", met: true },
      { id: "r2", label: "Client name and TIN correct", met: true },
      {
        id: "r3",
        label: "Signed and stamped by the institution",
        met: !(i % 3 === 1),
      },
      { id: "r4", label: "All requested documents included", met: true },
    ],
    chain: [
      {
        name: MANAGER.name,
        role: "Service Manager",
        state: (done ? "approved" : "pending") as "approved" | "pending",
      },
      ...(high
        ? [
            {
              name: "Senior manager",
              role: "Second level",
              state: "waiting" as const,
            },
          ]
        : []),
    ],
    override: null,
    allocation:
      done || high
        ? {
            fee,
            deductions: [
              { label: "Institution fee", amount: Math.round(fee * 0.1) },
              {
                label: "Mobile money charges",
                amount: Math.round(fee * 0.015),
              },
            ],
            agentPct: 60,
            shares:
              c.service === "company-registration" && done
                ? [
                    { id: "ag-grace", name: "Grace Uwimana", pct: 70 },
                    { id: "ag-eric", name: "Eric Habimana", pct: 30 },
                  ]
                : [{ id: lead.id, name: agentOf(lead.id).name, pct: 100 }],
            reviewed: false,
          }
        : null,
    returned: null,
  };
});
const caseOf = (r: Review) => CASES.find((c) => c.ref === r.ref)!;
const outstanding = (r: Review) => {
  const c = caseOf(r);
  return c.payment === "unpaid"
    ? (c.amount ?? 0)
    : c.payment === "partial"
      ? Math.round((c.amount ?? 0) / 2)
      : 0;
};
const item = (r: Review) => {
  const c = caseOf(r);
  return {
    id: r.id,
    ref: r.ref,
    service: serviceOf(c.service).name,
    deliverable: r.deliverable,
    authorId: r.authorId,
    authorName: r.authorName,
    version: r.version,
    submittedAt: r.submittedAt,
    reviewDueAt: r.reviewDueAt,
    payment: c.payment,
    outstanding: r.override ? 0 : outstanding(r),
    amount: c.amount ?? 0,
    secondLevel: r.secondLevel,
    state: r.state,
  };
};
const findReview = (id: string) => reviews.find((r) => r.id === id);

export const handlers = [
  // Staff sign-in (AU2): @hebuza.* emails sign in as Diane (persona "sm"); anything else falls through to handlers-auth.
  // Must be registered before handlers-auth. Demo: password "locked" → 423, under 8 chars → 401.
  http.post("/api/auth/login", async ({ request }) => {
    const b = (await request.clone().json()) as { identifier: string; password: string };
    if (!/@hebuza\./i.test(b.identifier ?? "")) return;
    await delay(400);
    if (b.password === "locked") return fail(423, "locked", "Account locked for 15 minutes.");
    if (b.password.length < 8) return fail(401, "unauthorized", "Email or password is incorrect. 3 attempts left.");
    // Stage 5: a known staff persona email signs in as that persona; any other @hebuza.* is Diane.
    const p = PERSONAS.find((x) => x.email.toLowerCase() === b.identifier.toLowerCase() && x.key !== "agent") ?? PERSONAS.find((x) => x.key === "sm")!;
    setPersona(p.key);
    return ok({
      session: { userId: `mock-${p.key}`, name: p.name, email: b.identifier, phone: null, role: p.roles[0], roles: p.roles, isEmailVerified: true, language: "en", createdAt: iso(Date.now()), expiresAt: iso(Date.now() + 12 * H) },
      maskedEmail: b.identifier,
    });
  }),
  // ---------- U3 invite (real GET contract /api/auth/set-password/{token}; ★ POST)
  http.get("/api/auth/set-password/:token", async ({ params }) => {
    await delay(250);
    if (params.token === "bad")
      return fail(404, "not_found", "This link doesn't work.");
    if (params.token === "expired")
      return fail(410, "expired", "This invitation expired.");
    return ok({
      name: MANAGER.name,
      email: "diane.mukamana@hebuza.example",
      role: "admin",
      issuedBy: "Jean Bosco (System Administrator)",
      issuedAt: iso(Date.now() - 2 * 24 * H),
      expiresAt: iso(Date.now() + 5 * 24 * H),
    });
  }),
  http.post("/api/auth/set-password/:token", async ({ params }) => {
    await delay(400);
    if (params.token === "expired")
      return fail(410, "expired", "This invitation expired.");
    setEnrolled(false); // new staff must enrol
    return ok({ ok: true });
  }),
  // ---------- U3 MFA
  http.get("/api/auth/mfa/status", async () => {
    await delay(150);
    return ok({ enrolled: enrolled(), trustedDevice: false });
  }),
  http.post("/api/auth/mfa/enrol", async () => {
    await delay(300);
    const secret = "JBSWY3DPEHPK3PXP";
    return ok({ secret, qrSvg: fakeQr(secret), periodS: 30 });
  }),
  http.post("/api/auth/mfa/enrol/verify", async ({ request }) => {
    await delay(300);
    const { code } = (await request.json()) as { code: string };
    if (!goodCode(code))
      return fail(400, "invalid_code", "That code didn't match.");
    setEnrolled(true);
    return ok({ backupCodes: issue(codes()) });
  }),
  http.post("/api/auth/mfa/step-up", async ({ request }) => {
    await delay(300);
    const b = (await request.json()) as { code: string; backup: boolean };
    if (!goodCode(b.code, b.backup))
      return fail(400, "invalid_code", "That code didn't match.");
    return ok({
      token: `su_${Math.abs(b.code.length * 7919)}_${Date.now()}`,
      expiresAt: iso(Date.now() + 5 * 60_000),
    });
  }),
  http.post("/api/auth/mfa/backup-codes", async ({ request }) => {
    await delay(300);
    if (!stepUpOk(request)) return needStepUp();
    return ok({ backupCodes: issue(codes().reverse()) });
  }),
  http.get("/api/auth/mfa/devices", async () => {
    await delay(200);
    return ok({ devices });
  }),
  http.delete("/api/auth/mfa/devices/:id", async ({ params }) => {
    await delay(250);
    devices = devices.filter((d) => d.id !== params.id || d.current);
    return ok({ ok: true });
  }),

  // ---------- U11 workload
  http.get("/api/admin/ops/workload", async ({ request }) => {
    await delay(250);
    const week =
      Number(new URL(request.url).searchParams.get("week") ?? 0) || 0;
    return ok({
      agents: AGENTS.map((a) => row(a, week)),
      weekStart: iso(weekStart(week)),
    });
  }),
  http.get("/api/admin/ops/workload/:id", async ({ params }) => {
    await delay(250);
    const a = AGENTS.find((x) => x.id === params.id);
    if (!a) return fail(404, "not_found", "Agent not found.");
    const leave = approvals
      .filter(
        (p) =>
          p.kind === "leave" && p.agentId === a.id && p.state !== "declined",
      )
      .map((p) => ({
        from: p.from!,
        to: p.to!,
        state:
          p.state === "approved" ? ("approved" as const) : ("pending" as const),
      }));
    if (a.onLeaveUntil)
      leave.push({ from: plus(-2), to: a.onLeaveUntil, state: "approved" });
    return ok({
      ...row(a),
      skills: Object.entries(a.skills).map(([slug, level]) => ({
        name: serviceOf(slug)?.name ?? slug,
        level,
      })),
      cases: casesOf(a.id).map(agentCase),
      spark: Array.from({ length: 30 }, (_, i) =>
        Math.max(1, a.load + ((i * 5 + a.name.length) % 5) - 2),
      ),
      leave,
    });
  }),
  // Real contract path PATCH /api/admin/agents/{agent_id}/settings (daily_case_cap); step-up + audit enforced here.
  http.patch("/api/admin/agents/:id/settings", async ({ params, request }) => {
    await delay(300);
    if (!stepUpOk(request)) return needStepUp();
    const a = AGENTS.find((x) => x.id === params.id);
    const b = (await request.json()) as { daily_case_cap?: number; reason?: string };
    if (!a) return fail(404, "not_found", "Agent not found.");
    if (!b.daily_case_cap || b.daily_case_cap < 1 || b.daily_case_cap > POLICY.capMax)
      return fail(422, "validation", `Cap must be 1–${POLICY.capMax}.`);
    const bad = audited({ actor: actor().name, action: "capacity_cap.change", entity: { kind: "agent", id: a.id }, before: { cap: a.cap }, after: { cap: b.daily_case_cap }, reason: why(request, b.reason), requireReason: true });
    if (bad) return bad;
    a.cap = b.daily_case_cap;
    return ok({ daily_case_cap: a.cap });
  }),
  http.post("/api/admin/ops/rebalance", async ({ request }) => {
    await delay(350);
    const b = (await request.json()) as {
      from: string;
      to: string;
      refs: string[];
    };
    const from = AGENTS.find((a) => a.id === b.from),
      to = AGENTS.find((a) => a.id === b.to);
    if (!from || !to) return fail(404, "not_found", "Agent not found.");
    const moved: string[] = [];
    for (const ref of b.refs) {
      const c = CASES.find((x) => x.ref === ref);
      const lead = c?.assignees.find((a) => a.id === b.from);
      if (!c || !lead) continue;
      lead.id = b.to;
      moved.push(ref);
    }
    from.load -= moved.length;
    to.load += moved.length;
    return ok({ moved });
  }),
  http.get("/api/admin/ops/approvals", async () => {
    await delay(250);
    return ok({ approvals });
  }),
  http.post("/api/admin/ops/approvals/:id", async ({ params, request }) => {
    await delay(300);
    const p = approvals.find((x) => x.id === params.id);
    if (!p) return fail(404, "not_found", "Request not found.");
    const b = (await request.json()) as {
      decision: "approve" | "decline" | "pending";
    };
    p.state =
      b.decision === "approve"
        ? "approved"
        : b.decision === "decline"
          ? "declined"
          : "pending";
    if (p.kind === "due" && p.ref) {
      const c = CASES.find((x) => x.ref === p.ref);
      if (c) c.dueAt = p.state === "approved" ? p.proposedDue! : p.currentDue!;
    }
    return ok(p);
  }),

  // ---------- U12 SLA
  http.get("/api/admin/ops/sla/health", async () => {
    await delay(250);
    const breaches = CASES.filter(
      (c) =>
        open(c) &&
        !PAUSED.includes(c.status) &&
        Date.parse(c.dueAt) < Date.now(),
    ).length;
    return ok({
      metPct: 94,
      avgFirstResponseMs: 72 * 60_000,
      breaches,
      trend: Array.from(
        { length: 30 },
        (_, i) => 88 + ((i * 7) % 9) + (i > 24 ? 1 : 0),
      ),
    });
  }),
  http.get("/api/admin/ops/sla/rules", async () => {
    await delay(200);
    return ok({
      rules: SERVICES.map((s) => ({
        service: s.slug,
        name: s.name,
        firstResponseH: 4,
        completionDays: s.slaDays,
        pauses: PAUSED,
      })),
      holidays: ["2026-12-25", "2026-12-26", "2027-01-01"],
    });
  }),
  // Real contract: PATCH /api/admin/applications/{code}/due (SetDueDateRequest)
  http.patch(
    "/api/admin/applications/:code/due",
    async ({ params, request }) => {
      await delay(300);
      const c = CASES.find((x) => x.ref === params.code);
      const b = (await request.json()) as { due_date: string; note?: string };
      if (!c) return fail(404, "not_found", "Case not found.");
      const t = Date.parse(`${b.due_date}T15:00:00Z`); // 17:00 Kigali
      if (!b.due_date || Number.isNaN(t) || t < Date.now())
        return fail(422, "validation", "Pick a future date.");
      c.dueAt = iso(t);
      c.updatedAt = iso(Date.now());
      return ok({ code: c.ref, due_at: c.dueAt });
    },
  ),
  // Real contract: PATCH /api/admin/oversight/cases/{code}/escalate (EscalateCaseRequest)
  http.patch(
    "/api/admin/oversight/cases/:code/escalate",
    async ({ params }) => {
      await delay(250);
      return CASES.some((x) => x.ref === params.code)
        ? ok({ escalated: true })
        : fail(404, "not_found", "Case not found.");
    },
  ),

  // ---------- U13 reviews
  http.get("/api/admin/ops/reviews", async ({ request }) => {
    await delay(250);
    const tab = new URL(request.url).searchParams.get("tab") ?? "mine";
    const state =
      tab === "returned"
        ? "returned"
        : tab === "approved"
          ? "approved"
          : "awaiting";
    const count = (s: Review["state"]) =>
      reviews.filter((r) => r.state === s).length;
    return ok({
      items: reviews.filter((r) => r.state === state).map(item),
      counts: {
        mine: count("awaiting"),
        returned: count("returned"),
        approved: count("approved"),
      },
    });
  }),
  http.get("/api/admin/ops/reviews/:id", async ({ params }) => {
    await delay(250);
    const r = findReview(String(params.id));
    if (!r) return fail(404, "not_found", "Review not found.");
    const out = outstanding(r);
    return ok({
      ...item(r),
      viewerId: MANAGER.id,
      files: r.files,
      comments: r.comments,
      requirements: r.requirements,
      chain: r.chain,
      gate: { blocked: out > 0 && !r.override, override: r.override },
      allocation: r.allocation,
      returned: r.returned,
    });
  }),
  http.post(
    "/api/admin/ops/reviews/:id/comments",
    async ({ params, request }) => {
      await delay(200);
      const r = findReview(String(params.id));
      if (!r) return fail(404, "not_found", "Review not found.");
      const b = (await request.json()) as {
        fileId: string;
        body: string;
        page: number;
        x: number;
        y: number;
      };
      if (!b.body?.trim()) return fail(422, "validation", "Write a comment.");
      r.comments.push({
        ...b,
        id: `cm-${Date.now()}`,
        author: MANAGER.name,
        at: iso(Date.now()),
      });
      return ok({ ok: true });
    },
  ),
  http.post(
    "/api/admin/ops/reviews/:id/decision",
    async ({ params, request }) => {
      await delay(350);
      const r = findReview(String(params.id));
      if (!r) return fail(404, "not_found", "Review not found.");
      const b = (await request.json()) as {
        decision: string;
        note?: string;
        due?: string;
      };
      const c = caseOf(r);
      if (b.decision === "reopen") {
        r.state = "awaiting";
        r.returned = null;
        r.chain[0].state = "pending";
        c.status = "awaiting_internal_review";
        return ok(item(r));
      }
      if (r.authorId === MANAGER.id)
        return fail(403, "own_work", "You can't approve your own work.");
      if (b.decision === "return") {
        r.state = "returned";
        r.returned = { to: r.authorName, due: b.due ?? plus(3) };
        c.status = "in_progress";
        return ok(item(r));
      }
      if (b.decision === "approve_release" && outstanding(r) > 0 && !r.override)
        return fail(409, "payment_gate", "Release blocked: unpaid.");
      if (r.secondLevel && r.chain[1]?.state !== "approved") {
        r.chain[0].state = "approved";
        r.firstBy = actor().id;
        r.pending = b.decision;
        if (r.chain[1].state === "waiting") r.chain[1].state = "requested";
        return ok(item(r), "Waiting for second approval");
      }
      r.chain[0].state = "approved";
      r.state = "approved";
      c.status =
        b.decision === "approve_release"
          ? "completed_delivered"
          : "awaiting_internal_review";
      return ok(item(r));
    },
  ),
  http.post(
    "/api/admin/ops/reviews/:id/override",
    async ({ params, request }) => {
      await delay(350);
      if (!stepUpOk(request)) return needStepUp();
      const r = findReview(String(params.id));
      if (!r) return fail(404, "not_found", "Review not found.");
      const b = (await request.json()) as {
        reason: string;
        note?: string;
        proof: string | null;
      };
      if (b.reason === "paid_offline" && !b.proof)
        return fail(422, "validation", "Attach the payment proof.");
      const bad = audited({ actor: actor().name, action: "payment_gate.override", entity: { kind: "case", id: r.ref }, before: { blocked: true }, after: { blocked: false, proof: b.proof }, reason: [why(request, b.reason), b.note].filter(Boolean).join(": "), requireReason: true });
      if (bad) return bad;
      r.override = { reason: b.reason, by: actor().name, at: iso(Date.now()) };
      return ok({ ok: true });
    },
  ),
  http.post(
    "/api/admin/ops/reviews/:id/second-approval",
    async ({ params }) => {
      await delay(300);
      const r = findReview(String(params.id));
      if (!r?.chain[1])
        return fail(404, "not_found", "No second level for this review.");
      r.chain[1].state = "requested";
      return ok({ ok: true });
    },
  ),
  // RV5 level-2 approve (P0-OPS-1): a different person than the level-1 approver must sign off.
  http.post(
    "/api/admin/ops/reviews/:id/second-approve",
    async ({ params }) => {
      await delay(300);
      const r = findReview(String(params.id));
      if (!r?.chain[1] || r.chain[0].state !== "approved" || r.chain[1].state !== "requested")
        return fail(409, "conflict", "Nothing waiting for a second approval.");
      const me = actor();
      if (me.id === r.firstBy)
        return fail(409, "same_approver", "A different person must approve this.");
      r.chain[1] = { ...r.chain[1], name: me.name, state: "approved" };
      r.state = "approved";
      caseOf(r).status = r.pending === "approve_release" ? "completed_delivered" : "awaiting_internal_review";
      audit({ actor: me.name, action: "review.second_approve", entity: { kind: "case", id: r.ref }, after: { decision: r.pending } });
      return ok(item(r));
    },
  ),
  http.get("/api/admin/ops/audit/:kind/:id", async ({ params }) => {
    await delay(150);
    return ok({ items: auditFor(String(params.kind), String(params.id)) });
  }),
  http.post(
    "/api/admin/ops/reviews/:id/allocation",
    async ({ params, request }) => {
      await delay(300);
      const r = findReview(String(params.id));
      if (!r?.allocation) return fail(404, "not_found", "No allocation.");
      const b = (await request.json()) as {
        shares: { id: string; name: string; pct: number }[];
        reason: string;
      };
      if (b.shares.reduce((s, x) => s + x.pct, 0) !== 100)
        return fail(422, "validation", "Shares must add up to 100%.");
      // PLACEHOLDER(allocation-rules): split rules are mock-invented until Finance confirms them.
      const bad = audited({ actor: actor().name, action: "allocation.review", entity: { kind: "case", id: r.ref }, before: r.allocation.shares, after: b.shares, reason: why(request, b.reason), requireReason: true });
      if (bad) return bad;
      r.allocation.shares = b.shares;
      r.allocation.reviewed = true;
      return ok({ ok: true });
    },
  ),
];

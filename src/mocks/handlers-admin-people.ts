// MSW handlers for /api/admin/{applications,agents,clients,partners,people,team,subscriptions,oversight,deadlines,
// audit-log,analytics,settings} (contract: contract/openapi.json). Built over the ops-world fixture so counts agree
// with the ops pages. State lives in module arrays and persists for the session.
import { http, HttpResponse } from "msw";
import {
  AGENTS,
  CASES,
  CLIENTS,
  SERVICES,
  agentOf,
  clientOf,
  serviceOf,
  type OpsCase,
} from "./ops-world";

const ok = <T>(data: T, message = "OK") =>
  HttpResponse.json({ success: true, message, errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );
const nf = () => fail(404, "not_found", "Not found.");
const body = async <T>(r: Request) =>
  ((await r.json().catch(() => ({}))) ?? {}) as T;
const now = () => new Date().toISOString();
const DAY = 86_400_000;
const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const pdf = (name: string) =>
  new HttpResponse(
    new Blob(["%PDF-1.4\n% mock file\n"], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
      },
    },
  );

// ---------------------------------------------------------------- audit log (every mutation here appends)
type Entry = {
  id: string;
  timestamp: string;
  actor: string;
  actorType: string;
  description: string;
  kind: string;
};
const AUDIT: Entry[] = [
  {
    id: "al-3",
    timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(),
    actor: "Diane Mukamana",
    actorType: "admin",
    description: "Assigned HBZ-4K2M9Q to Grace Uwimana",
    kind: "assignment",
  },
  {
    id: "al-2",
    timestamp: new Date(Date.now() - DAY).toISOString(),
    actor: "System",
    actorType: "system",
    description: "Payment received for HBZ-4K2M9Q",
    kind: "payment",
  },
  {
    id: "al-1",
    timestamp: new Date(Date.now() - 3 * DAY).toISOString(),
    actor: "Diane Mukamana",
    actorType: "admin",
    description: "Updated platform settings",
    kind: "settings",
  },
];
const log = (description: string, kind: string) =>
  AUDIT.unshift({
    id: `al-${AUDIT.length + 1}-${Date.now()}`,
    timestamp: now(),
    actor: "Diane Mukamana",
    actorType: "admin",
    description,
    kind,
  });

// ---------------------------------------------------------------- applications (view over CASES)
type Extra = {
  history: {
    status: string;
    changed_by: string | null;
    changed_by_role: string | null;
    note: string | null;
    created_at: string;
  }[];
  quote_status: string | null;
  agreed: number | null;
  percent: number | null;
  partnerId: string | null;
  clientId: string | null;
};
const EXTRA = new Map<string, Extra>();
const extra = (c: OpsCase): Extra => {
  let e = EXTRA.get(c.ref);
  if (!e)
    EXTRA.set(
      c.ref,
      (e = {
        history: [
          {
            status: "received",
            changed_by: null,
            changed_by_role: "client",
            note: null,
            created_at: c.createdAt,
          },
        ],
        quote_status: c.amount == null ? "waiting" : null,
        agreed: c.amount,
        percent: null,
        partnerId: null,
        clientId: c.clientId,
      }),
    );
  return e;
};
const lead = (c: OpsCase) =>
  c.assignees.find((a) => a.role === "lead") ?? c.assignees[0];
const summary = (c: OpsCase) => {
  const s = serviceOf(c.service),
    cl = clientOf(c.clientId),
    a = lead(c),
    e = extra(c),
    p = PARTNERS.find((x) => x.partnerId === e.partnerId);
  const ded = cl.dedicatedAgentId ? agentOf(cl.dedicatedAgentId) : null;
  const due = Date.parse(c.dueAt);
  return {
    application_id: c.ref,
    code: c.ref,
    service_name: s.name,
    service_slug: s.slug,
    status: c.status,
    tier: c.flags.includes("urgent") ? "express" : "standard",
    submitted_at: c.createdAt,
    payment_status: c.payment,
    handler: p ? "partner" : "hebuza",
    retainer: c.flags.includes("subscriber"),
    assigned_agent_name: a ? agentOf(a.id).name : null,
    client_name: cl.name,
    client_phone: cl.phone,
    has_account: !!e.clientId,
    assignee_id: a?.id ?? null,
    assignee_name: a ? agentOf(a.id).name : null,
    sla_deadline: c.dueAt,
    sla_breached: due < Date.now(),
    waiting_days: Math.max(
      0,
      Math.floor((Date.now() - Date.parse(c.createdAt)) / DAY),
    ),
    partner_id: p?.partnerId ?? null,
    partner_name: p?.orgName ?? null,
    quote_status: e.quote_status,
    dedicated_agent_id: ded?.id ?? null,
    dedicated_agent_name: ded?.name ?? null,
    due_at: c.dueAt,
    due_source: "sla",
    deadline_state:
      due < Date.now()
        ? "overdue"
        : due - Date.now() < 2 * DAY
          ? "due_soon"
          : "on_track",
    is_urgent: c.flags.includes("urgent"),
    client_preferred_date: null,
  };
};
const detail = (c: OpsCase) => {
  const s = summary(c),
    e = extra(c),
    cl = clientOf(c.clientId);
  return {
    ...s,
    personal_info: { name: cl.name, phone: cl.phone, email: cl.email },
    service_data: {},
    payment_amount: c.amount,
    agreed_amount_rwf: e.agreed,
    hebuza_percent: e.percent,
    assigned_partner_id: s.partner_id,
    basis_amount_rwf: c.amount,
    price_band_snapshot: null,
    payment_split: null,
    status_display: c.status.replace(/_/g, " "),
    payment_info:
      c.payment === "paid" && c.amount
        ? {
            method: "mtn-momo",
            amount: c.amount,
            governmentFee: 0,
            vatRate: 0.18,
            paidAt: c.createdAt,
            receiptNumber: `RCP-${c.ref}`,
          }
        : null,
    assigned_agent_id: s.assignee_id,
    structure_version_id: null,
    structure_version: null,
    structure_snapshot: null,
    status_history: e.history,
    documents: c.checklist
      .filter((d) => d.docId)
      .map((d, i) => ({
        document_id: `${c.ref}-${d.key}`,
        application_id: c.ref,
        requirement_key: d.key,
        original_filename: `${d.key}.pdf`,
        mime_type: "application/pdf",
        file_size_bytes: 120_000 + i * 9_000,
        uploaded_by: c.clientId,
        uploaded_by_role: "client",
        version: 1,
        qc_status: d.state === "check" ? "pending" : "passed",
        qc_notes: null,
        is_active: true,
        created_at: c.createdAt,
        source: "upload" as const,
      })),
    messages: [],
    partner_client_lane_open: false,
    chat_lanes: ["client"],
    chat_write_lanes: ["client"],
    client_id: e.clientId,
    open_flag: null,
    deadline_mode: "sla",
  };
};
const caseOf = (code: unknown) => CASES.find((c) => c.ref === code);
const page = <T>(rows: T[], u: URL) => {
  const offset = Number(u.searchParams.get("offset") ?? 0),
    limit = Number(u.searchParams.get("limit") ?? 50);
  return {
    applications: rows.slice(offset, offset + limit),
    total: rows.length,
    offset,
    limit,
  };
};
const setStatus = (c: OpsCase, status: string, note: string | null = null) => {
  c.status = status as OpsCase["status"];
  c.updatedAt = now();
  extra(c).history.push({
    status,
    changed_by: "sm-diane",
    changed_by_role: "admin",
    note,
    created_at: now(),
  });
};

// ---------------------------------------------------------------- people: agents, clients, partners
const AGENT_STATE = new Map(
  AGENTS.map((a, i) => [
    a.id,
    {
      email: `${a.name.toLowerCase().replace(/[^a-z]+/g, ".")}@hebuza.example`,
      phone: `+25078800${String(i).padStart(4, "0")}`,
      is_active: true,
      twofa: i % 3 !== 2,
      skills: Object.keys(
        (a as { skills?: Record<string, number> }).skills ?? {},
      ).map((k) => ({
        service_category: k,
        proficiency_level: 3,
        notes: null as string | null,
      })),
      papers: [
        { kind: "cv", status: "accepted" },
        { kind: "contract", status: i % 2 ? "pending" : "accepted" },
      ].map((p) => ({
        ...p,
        documentId: `ap-${a.id}-${p.kind}`,
        originalFilename: `${p.kind}.pdf`,
        uploadedAt: new Date(Date.now() - 30 * DAY).toISOString(),
        reviewNote: null as string | null,
      })),
    },
  ]),
);
const openCases = (id: string) =>
  CASES.filter(
    (c) =>
      c.assignees.some((a) => a.id === id) &&
      !["completed", "cancelled", "closed"].includes(c.status),
  ).length;
const agentRow = (a: (typeof AGENTS)[number]) => {
  const s = AGENT_STATE.get(a.id)!;
  return {
    agent_id: a.id,
    name: a.name,
    email: s.email,
    phone: s.phone,
    is_active: s.is_active,
    twofa_enabled: s.twofa,
    created_at: "2025-01-15T08:00:00.000Z",
    role: "agent",
    papers_status: papersOf(a.id).papersStatus,
    skills: a.services,
    open_cases: openCases(a.id),
  };
};
const papersOf = (id: string) => {
  const a = agentOf(id),
    s = AGENT_STATE.get(id)!;
  const st = s.papers.some((p) => p.status === "rejected")
    ? "rejected"
    : s.papers.some((p) => p.status === "pending")
      ? "pending"
      : "accepted";
  return {
    agentId: id,
    name: a.name,
    cleared: st === "accepted",
    papersStatus: st,
    papersRequired: SETTINGS.requireAgentPapers,
    papers: s.papers,
  };
};
const leaderboard = (me?: string) =>
  AGENTS.map((a) => ({
    initials: initials(a.name),
    name: a.name,
    count:
      CASES.filter(
        (c) =>
          c.status === "completed_delivered" && c.assignees.some((x) => x.id === a.id),
      ).length +
      ((a as { load?: number }).load ?? 2) * 3,
    isMe: a.id === me,
  })).sort((x, y) => y.count - x.count);
const AGENT_SETTINGS = new Map<string, Record<string, unknown>>();
const agentSettings = (id: string) => {
  if (!AGENT_SETTINGS.has(id))
    AGENT_SETTINGS.set(id, {
      accepting_cases: true,
      daily_case_cap: (agentOf(id) as { cap?: number }).cap ?? 6,
      notification_new_case: true,
      notification_client_reply: true,
      notification_sla_alert: true,
      notification_daily_summary: false,
      is_on_duty: true,
      monthly_percent: null,
      one_off_percent: null,
      default_monthly_percent: SETTINGS.defaultMonthlyPercent,
      default_one_off_percent: SETTINGS.defaultOneOffPercent,
      payout_phone: AGENT_STATE.get(id)?.phone ?? null,
      payout_bank_name: null,
      payout_bank_account: null,
      payout_account_name: null,
    });
  return AGENT_SETTINGS.get(id)!;
};

const ACCOUNTS = new Map(
  CLIENTS.map((c) => [
    c.id,
    {
      name: c.name,
      phone: c.phone as string | null,
      email: c.email as string | null,
      role: "client",
      isActive: true,
    },
  ]),
);

type OrgType =
  | "law-firm"
  | "accounting"
  | "notary"
  | "business-centre"
  | "consultancy"
  | "other";
type DocStatus = "missing" | "pending" | "accepted" | "rejected";
const PARTNERS = [
  {
    partnerId: "pt-ingabo",
    orgName: "Ingabo Legal Partners",
    orgType: "law-firm" as OrgType,
    contactName: "Jean-Paul Nkurunziza",
    contactEmail: "jean-paul.nkurunziza@ingabo.example",
    status: "active" as "active" | "suspended",
    referredByAgentName: "Grace Uwimana",
    contactPhone: "+250788300100",
    registrationNumber: "RDB-108223",
    joinedAt: "2025-06-02T09:00:00.000Z",
    startingPercent: 20 as number | null,
    payoutPhone: "+250788300100" as string | null,
    payoutBankName: "Bank of Kigali" as string | null,
    payoutBankAccount: "00040-0688112-17" as string | null,
    payoutAccountName: "Ingabo Legal Partners" as string | null,
  },
  {
    partnerId: "pt-umucyo",
    orgName: "Umucyo Accounting",
    orgType: "accounting" as OrgType,
    contactName: "Claudette Uwera",
    contactEmail: "hello@umucyo.example",
    status: "active" as "active" | "suspended",
    referredByAgentName: null,
    contactPhone: "+250722410500",
    registrationNumber: null,
    joinedAt: "2026-02-11T09:00:00.000Z",
    startingPercent: null,
    payoutPhone: null,
    payoutBankName: null,
    payoutBankAccount: null,
    payoutAccountName: null,
  },
];
const PARTNER_DOCS = new Map<
  string,
  {
    kind: "cv" | "contract";
    documentId: string | null;
    originalFilename: string | null;
    fileSizeBytes: number | null;
    uploadedAt: string | null;
    uploadedByName: string | null;
    status: DocStatus;
    reviewNote: string | null;
    reviewedAt: string | null;
  }[]
>();
const partnerDocs = (id: string) => {
  if (!PARTNER_DOCS.has(id))
    PARTNER_DOCS.set(
      id,
      (["cv", "contract"] as const).map((kind) =>
        id === "pt-ingabo"
          ? {
              kind,
              documentId: `pd-${id}-${kind}`,
              originalFilename: `${kind}.pdf`,
              fileSizeBytes: 182_000,
              uploadedAt: "2025-06-03T09:00:00.000Z",
              uploadedByName: "Diane Mukamana",
              status: "accepted",
              reviewNote: null,
              reviewedAt: "2025-06-04T09:00:00.000Z",
            }
          : {
              kind,
              documentId: null,
              originalFilename: null,
              fileSizeBytes: null,
              uploadedAt: null,
              uploadedByName: null,
              status: "missing",
              reviewNote: null,
              reviewedAt: null,
            },
      ),
    );
  return PARTNER_DOCS.get(id)!;
};
const partnerPapers = (id: string) => {
  const p = PARTNERS.find((x) => x.partnerId === id)!,
    d = partnerDocs(id),
    st = d.map((x) => x.status);
  const papersStatus = st.every((s) => s === "missing")
    ? "missing"
    : st.includes("rejected")
      ? "rejected"
      : st.includes("missing")
        ? "incomplete"
        : st.includes("pending")
          ? "pending"
          : "accepted";
  return {
    partnerId: id,
    orgName: p.orgName,
    documents: d,
    papersStatus: papersStatus as DocStatus | "incomplete",
  };
};
const partnerRow = (p: (typeof PARTNERS)[number]) => {
  const cases = CASES.filter((c) => extra(c).partnerId === p.partnerId);
  return {
    ...p,
    clientCount: new Set(cases.map((c) => c.clientId)).size,
    activeCaseCount: cases.filter((c) => c.status !== "completed_delivered").length,
    verified: partnerPapers(p.partnerId).papersStatus === "accepted",
  };
};

// ---------------------------------------------------------------- subscriptions
type Plan = {
  planId: string;
  name: string;
  interval: string;
  amountRwf: number;
  isActive: boolean;
  kind: string;
  maxApplicationsPerMonth: number | null;
  trialDays: number | null;
  description: string | null;
  features: string[];
  badge: string | null;
  sortOrder: number;
  isPublic: boolean;
  archivedAt: string | null;
  isSignupTrial: boolean;
};
const PLANS: Plan[] = [
  {
    planId: "plan-trial",
    name: "Free trial",
    interval: "month",
    amountRwf: 0,
    isActive: true,
    kind: "retainer",
    maxApplicationsPerMonth: 1,
    trialDays: 14,
    description: "Try a dedicated agent for two weeks.",
    features: ["1 application"],
    badge: null,
    sortOrder: 0,
    isPublic: false,
    archivedAt: null,
    isSignupTrial: true,
  },
  {
    planId: "plan-basic",
    name: "Basic",
    interval: "month",
    amountRwf: 30_000,
    isActive: true,
    kind: "retainer",
    maxApplicationsPerMonth: 3,
    trialDays: null,
    description: "Monthly tax filings for a small business.",
    features: ["VAT & PAYE filings", "Dedicated agent"],
    badge: null,
    sortOrder: 1,
    isPublic: true,
    archivedAt: null,
    isSignupTrial: false,
  },
  {
    planId: "plan-business",
    name: "Business",
    interval: "month",
    amountRwf: 75_000,
    isActive: true,
    kind: "retainer",
    maxApplicationsPerMonth: 10,
    trialDays: null,
    description: "Everything a growing company files.",
    features: ["All filings", "Priority SLA", "Dedicated agent"],
    badge: "Popular",
    sortOrder: 2,
    isPublic: true,
    archivedAt: null,
    isSignupTrial: false,
  },
];
type Sub = {
  subscriptionId: string;
  clientId: string;
  planId: string;
  status: string;
  startedAt: string;
  periodEnd: string;
  lastRecordedPaymentAt: string | null;
  dedicatedAgentId: string | null;
  note: string | null;
  focus: { categories: string[]; serviceIds: string[] };
};
const SUBS: Sub[] = [
  {
    subscriptionId: "sub-aline",
    clientId: "cl-aline",
    planId: "plan-basic",
    status: "active",
    startedAt: new Date(Date.now() - 60 * DAY).toISOString(),
    periodEnd: new Date(Date.now() + 12 * DAY).toISOString(),
    lastRecordedPaymentAt: new Date(Date.now() - 18 * DAY).toISOString(),
    dedicatedAgentId: "ag-grace",
    note: null,
    focus: {
      categories: ["taxes-and-business-support"],
      serviceIds: ["vat-declaration", "paye-monthly-filing"],
    },
  },
  {
    subscriptionId: "sub-kff",
    clientId: "cl-kff",
    planId: "plan-business",
    status: "past_due",
    startedAt: new Date(Date.now() - 200 * DAY).toISOString(),
    periodEnd: new Date(Date.now() - 2 * DAY).toISOString(),
    lastRecordedPaymentAt: new Date(Date.now() - 32 * DAY).toISOString(),
    dedicatedAgentId: "ag-jp",
    note: "Pays by bank transfer.",
    focus: { categories: [], serviceIds: [] },
  },
];
const live = (planId: string) =>
  SUBS.filter(
    (s) =>
      s.planId === planId &&
      ["active", "past_due", "trialing"].includes(s.status),
  ).length;
const planRow = (p: Plan) => ({
  ...p,
  onPricing: p.isPublic && p.isActive,
  visibility: (p.archivedAt
    ? "archived"
    : p.isSignupTrial
      ? "trial"
      : !p.isActive
        ? "inactive"
        : p.isPublic
          ? "listed"
          : "hidden") as
    "listed" | "inactive" | "hidden" | "trial" | "archived",
  liveSubscribers: live(p.planId),
  everUsed: SUBS.some((s) => s.planId === p.planId),
});
const subRow = (s: Sub) => {
  const c = clientOf(s.clientId),
    p = PLANS.find((x) => x.planId === s.planId)!;
  return {
    subscriptionId: s.subscriptionId,
    clientId: s.clientId,
    clientName: c.name,
    clientEmail: c.email,
    clientPhone: c.phone,
    planId: p.planId,
    planName: p.name,
    planKind: p.kind,
    amountRwf: p.amountRwf,
    status: s.status,
    startedAt: s.startedAt,
    periodEnd: s.periodEnd,
    lastRecordedPaymentAt: s.lastRecordedPaymentAt,
    dedicatedAgentId: s.dedicatedAgentId,
    dedicatedAgentName: s.dedicatedAgentId
      ? agentOf(s.dedicatedAgentId).name
      : null,
    openCaseCount: CASES.filter(
      (x) => x.clientId === s.clientId && x.status !== "completed_delivered",
    ).length,
    maxApplicationsPerMonth: p.maxApplicationsPerMonth,
    note: s.note,
  };
};
const focusOf = (s: Sub) => ({
  subscriptionId: s.subscriptionId,
  categories: s.focus.categories.map((slug) => ({
    slug,
    name: slug.replace(/-/g, " ").replace(/^./, (x) => x.toUpperCase()),
  })),
  services: s.focus.serviceIds
    .map((id) => SERVICES.find((x) => x.slug === id))
    .filter((x) => !!x)
    .map((x) => ({
      serviceId: x.slug,
      slug: x.slug,
      name: x.name,
      category:
        x.institution === "RDB"
          ? "business-registration"
          : "taxes-and-business-support",
      deadlineMode: "sla",
    })),
});
type PlanBody = Partial<Omit<Plan, "planId">>;
const applyPlan = (p: Plan, b: PlanBody) => {
  for (const [k, v] of Object.entries(b))
    if (v !== null && v !== undefined) (p as Record<string, unknown>)[k] = v;
  return p;
};

// ---------------------------------------------------------------- settings
const SETTINGS = {
  acceptNewApps: true,
  guestApps: true,
  dataRetention: "7y",
  compactTables: false,
  enforce2FA: true,
  sessionTimeout: 30,
  ipAllowlist: "",
  maintenanceMode: false,
  requireAgentPapers: true,
  paymentsEnabled: true,
  defaultMonthlyPercent: 30,
  defaultOneOffPercent: 40,
  chatRetentionYears: 7,
};

const RESOLVED = new Set<string>();
const traceFor = (clientId?: string | null, name?: string | null) => {
  const cases = CASES.filter(
    (c) => c.clientId === clientId || clientOf(c.clientId).name === name,
  );
  return {
    documents: cases.flatMap((c) =>
      detail(c).documents.map((d) => ({
        documentId: d.document_id,
        filename: d.original_filename,
        source: "upload",
        applicationCode: c.ref,
        createdAt: d.created_at,
      })),
    ),
    threads: cases.map((c) => ({
      code: c.ref,
      serviceName: serviceOf(c.service).name,
      status: c.status,
      messageCount: 2,
      lastMessage: "Thanks, we have received your documents.",
      lastMessageAt: c.updatedAt,
      lastSenderRole: "agent",
    })),
  };
};

export const handlers = [
  // ------------------------------------------------ applications
  http.get("*/api/admin/applications", ({ request }) => {
    const u = new URL(request.url),
      q = (k: string) => u.searchParams.get(k);
    let rows = CASES.map(summary);
    if (q("status"))
      rows = rows.filter((r) => q("status")!.split(",").includes(r.status));
    if (q("service_id"))
      rows = rows.filter((r) => r.service_slug === q("service_id"));
    if (q("agent_id"))
      rows = rows.filter((r) => r.assignee_id === q("agent_id"));
    if (q("client_id"))
      rows = rows.filter((r) => caseOf(r.code)!.clientId === q("client_id"));
    if (q("tier")) rows = rows.filter((r) => r.tier === q("tier"));
    if (q("payment_status"))
      rows = rows.filter((r) => r.payment_status === q("payment_status"));
    if (q("pool") === "unassigned") rows = rows.filter((r) => !r.assignee_id);
    return ok(page(rows, u));
  }),
  http.get("*/api/admin/applications/:code", ({ params }) => {
    const c = caseOf(params.code);
    return c ? ok(detail(c)) : nf();
  }),
  http.get("*/api/admin/applications/:code/workload", ({ params, request }) => {
    const c = caseOf(params.code),
      id =
        new URL(request.url).searchParams.get("agent_id") ?? (c && lead(c)?.id);
    if (!c || !id) return nf();
    const dueDate =
        new URL(request.url).searchParams.get("due_date") ??
        c.dueAt.slice(0, 10),
      open = openCases(id),
      cap = agentSettings(id).daily_case_cap as number;
    return ok({
      agentId: id,
      agentName: agentOf(id).name,
      openCases: open,
      dueThatWeek: Math.min(open, 3),
      dailyCap: cap,
      accepting: agentSettings(id).accepting_cases as boolean,
      deadlineMode: "sla",
      etaBusinessDays: serviceOf(c.service).slaDays,
      defaultDueDate: c.dueAt.slice(0, 10),
      earliestReasonable: new Date(Date.now() + DAY).toISOString().slice(0, 10),
      dueDate,
      warnings: open >= cap ? ["Agent is at capacity."] : [],
    });
  }),
  http.patch(
    "*/api/admin/applications/:code/assign",
    async ({ params, request }) => {
      const c = caseOf(params.code),
        b = await body<{ agent_id: string; note?: string; due_date?: string }>(
          request,
        );
      if (!c) return nf();
      c.assignees = [{ id: b.agent_id, role: "lead" }];
      if (b.due_date) c.dueAt = new Date(b.due_date).toISOString();
      if (c.status === "received") setStatus(c, "in_progress", b.note ?? null);
      log(`Assigned ${c.ref} to ${agentOf(b.agent_id).name}`, "assignment");
      return ok(null, "Assigned.");
    },
  ),
  http.patch("*/api/admin/applications/:code/unassign", ({ params }) => {
    const c = caseOf(params.code);
    if (!c) return nf();
    c.assignees = [];
    log(`Unassigned ${c.ref}`, "assignment");
    return ok(null, "Unassigned.");
  }),
  http.post("*/api/admin/applications/:code/auto-assign", ({ params }) => {
    const c = caseOf(params.code);
    if (!c) return nf();
    const pick = AGENTS.filter(
      (a) => a.services.includes(c.service) && AGENT_STATE.get(a.id)!.is_active,
    ).sort((x, y) => openCases(x.id) - openCases(y.id))[0];
    if (!pick) return ok({ assigned: false });
    c.assignees = [{ id: pick.id, role: "lead" }];
    log(`Auto-assigned ${c.ref} to ${pick.name}`, "assignment");
    return ok({ assigned: true });
  }),
  http.patch(
    "*/api/admin/applications/:code/partner",
    async ({ params, request }) => {
      const c = caseOf(params.code),
        b = await body<{ partner_id?: string | null; note?: string }>(request);
      if (!c) return nf();
      if (b.partner_id && !PARTNERS.some((p) => p.partnerId === b.partner_id))
        return fail(422, "validation", "Unknown partner.");
      extra(c).partnerId = b.partner_id ?? null;
      log(
        `${b.partner_id ? "Routed" : "Unrouted"} ${c.ref} ${b.partner_id ? `to partner ${b.partner_id}` : "from partner"}`,
        "assignment",
      );
      return ok(detail(c));
    },
  ),
  http.patch(
    "*/api/admin/applications/:code/price",
    async ({ params, request }) => {
      const c = caseOf(params.code),
        b = await body<{
          agreed_amount_rwf?: number | null;
          hebuza_percent?: number | null;
          quote_status?: string | null;
        }>(request);
      if (!c) return nf();
      const e = extra(c);
      if (b.agreed_amount_rwf != null) {
        e.agreed = b.agreed_amount_rwf;
        c.amount = b.agreed_amount_rwf;
      }
      if (b.hebuza_percent != null) e.percent = b.hebuza_percent;
      if (b.quote_status) e.quote_status = b.quote_status;
      log(`Updated price on ${c.ref}`, "pricing");
      return ok(detail(c));
    },
  ),
  http.patch(
    "*/api/admin/applications/:code/status",
    async ({ params, request }) => {
      const c = caseOf(params.code),
        b = await body<{
          status: string;
          note?: string | null;
          rejection_reason?: string | null;
        }>(request);
      if (!c) return nf();
      if (!b.status) return fail(422, "validation", "Status is required.");
      setStatus(c, b.status, b.note ?? b.rejection_reason ?? null);
      log(`Moved ${c.ref} to ${b.status}`, "status");
      return ok(detail(c));
    },
  ),
  http.post(
    "*/api/admin/applications/:code/link-client",
    async ({ params, request }) => {
      const c = caseOf(params.code),
        b = await body<{ client_id: string }>(request);
      if (!c) return nf();
      if (!ACCOUNTS.has(b.client_id))
        return fail(404, "not_found", "Client not found.");
      extra(c).clientId = b.client_id;
      c.clientId = b.client_id;
      log(`Linked ${c.ref} to client ${b.client_id}`, "client");
      return ok(detail(c));
    },
  ),

  // ------------------------------------------------ agents
  http.get("*/api/admin/agents", () => ok({ agents: AGENTS.map(agentRow) })),
  http.get("*/api/admin/agents/leaderboard", () =>
    ok({ leaderboard: leaderboard() }),
  ),
  http.patch("*/api/admin/agents/:id", async ({ params, request }) => {
    const s = AGENT_STATE.get(String(params.id)),
      a = AGENTS.find((x) => x.id === params.id);
    if (!s || !a) return nf();
    const b = await body<{
      is_active?: boolean | null;
      reset_password?: boolean | null;
      name?: string | null;
      phone?: string | null;
    }>(request);
    const updated: string[] = [];
    if (b.is_active != null) {
      s.is_active = b.is_active;
      updated.push("is_active");
    }
    if (b.reset_password) updated.push("password");
    if (b.name) {
      a.name = b.name;
      updated.push("name");
    }
    if (b.phone) {
      s.phone = b.phone;
      updated.push("phone");
    }
    log(`Updated agent ${a.name} (${updated.join(", ")})`, "agent");
    return ok({ agent_id: a.id, updated });
  }),
  http.get("*/api/admin/agents/:id/skills", ({ params }) => {
    const s = AGENT_STATE.get(String(params.id));
    return s ? ok({ agent_id: String(params.id), skills: s.skills }) : nf();
  }),
  http.patch("*/api/admin/agents/:id/skills", async ({ params, request }) => {
    const s = AGENT_STATE.get(String(params.id));
    if (!s) return nf();
    s.skills = (await body<{ skills: typeof s.skills }>(request)).skills ?? [];
    log(`Updated skills for ${agentOf(String(params.id)).name}`, "agent");
    return ok({ agent_id: String(params.id), skills: s.skills });
  }),
  http.get("*/api/admin/agents/:id/settings", ({ params }) =>
    AGENT_STATE.has(String(params.id))
      ? ok(agentSettings(String(params.id)))
      : nf(),
  ),
  http.get("*/api/admin/agents/:id/metrics", ({ params }) => {
    const id = String(params.id),
      a = AGENTS.find((x) => x.id === id) as
        | ((typeof AGENTS)[number] & { onTime?: number; rating?: number })
        | undefined;
    if (!a) return nf();
    const lb = leaderboard(id),
      done = lb.find((x) => x.isMe)!.count;
    return ok({
      completedCount: done,
      completedDelta: "+2",
      avgTurnaround: 2.4,
      avgTurnaroundDelta: "-0.3d",
      onTimeSLAPercent: Math.round((a.onTime ?? 0.9) * 100),
      clientRating: a.rating ?? 4.5,
      ratingsCount: 18,
      weeklyBars: [6, 5, 4, 3, 2, 1, 0].map((w) => ({
        week: `W-${w}`,
        count: 2 + ((w * 7 + id.length) % 6),
        isCurrent: w === 0,
      })),
      leaderboard: lb,
      retainerCompleted: Math.floor(done / 3),
      oneOffCompleted: done - Math.floor(done / 3),
    });
  }),
  http.get("*/api/admin/agents/:id/papers", ({ params }) =>
    AGENT_STATE.has(String(params.id)) ? ok(papersOf(String(params.id))) : nf(),
  ),
  http.post(
    "*/api/admin/agents/:id/papers/:kind/review",
    async ({ params, request }) => {
      const s = AGENT_STATE.get(String(params.id)),
        p = s?.papers.find((x) => x.kind === params.kind);
      if (!p) return nf();
      const b = await body<{ status: string; note?: string | null }>(request);
      Object.assign(p, { status: b.status, reviewNote: b.note ?? null });
      log(
        `Reviewed ${p.kind} for ${agentOf(String(params.id)).name}: ${b.status}`,
        "agent",
      );
      return ok(papersOf(String(params.id)));
    },
  ),
  http.get("*/api/admin/agents/:id/papers/:doc/file", ({ params }) =>
    pdf(`${params.doc}.pdf`),
  ),

  // ------------------------------------------------ clients / people / team / access requests
  http.get("*/api/admin/clients", () =>
    ok({
      clients: CLIENTS.map((c) => {
        const s = SUBS.find((x) => x.clientId === c.id),
          mine = CASES.filter((x) => x.clientId === c.id),
          acc = ACCOUNTS.get(c.id)!;
        const ded = s?.dedicatedAgentId ?? c.dedicatedAgentId;
        return {
          clientId: c.id,
          profileKey: c.id,
          name: acc.name,
          phone: acc.phone,
          email: acc.email,
          hasAccount: true,
          accountActive: acc.isActive,
          caseCount: mine.length,
          latestCode: mine.at(-1)?.ref ?? null,
          subscriptionId: s?.subscriptionId ?? null,
          subscriptionStatus: s?.status ?? "none",
          planName: s ? PLANS.find((p) => p.planId === s.planId)!.name : null,
          dedicatedAgentId: ded,
          dedicatedAgentName: ded ? agentOf(ded).name : null,
          periodEnd: s?.periodEnd ?? null,
        };
      }),
    }),
  ),
  http.get("*/api/admin/clients/cases", ({ request }) => {
    const u = new URL(request.url),
      key = u.searchParams.get("profile_key");
    return ok(page(CASES.filter((c) => c.clientId === key).map(summary), u));
  }),
  http.get("*/api/admin/clients/trace", ({ request }) =>
    ok(traceFor(new URL(request.url).searchParams.get("profile_key"))),
  ),
  http.get("*/api/admin/clients/:id/trace", ({ params }) =>
    ok(traceFor(String(params.id))),
  ),
  http.patch("*/api/admin/people/:id/profile", async ({ params, request }) => {
    const a = ACCOUNTS.get(String(params.id));
    if (!a) return nf();
    const b = await body<{ name?: string | null; phone?: string | null }>(
      request,
    );
    if (b.name) a.name = b.name;
    if (b.phone !== undefined) a.phone = b.phone;
    log(`Edited profile of ${a.name}`, "people");
    return ok({
      userId: String(params.id),
      name: a.name,
      email: a.email,
      phone: a.phone,
    });
  }),
  http.post("*/api/admin/people/:id/access", async ({ params, request }) => {
    const id = String(params.id),
      a = ACCOUNTS.get(id),
      ag = AGENT_STATE.get(id);
    if (!a && !ag) return nf();
    const { action } = await body<{
      action: "reset" | "suspend" | "reinstate";
    }>(request);
    if (!["reset", "suspend", "reinstate"].includes(action))
      return fail(422, "validation", "Unknown action.");
    const isActive =
      action === "suspend"
        ? false
        : action === "reinstate"
          ? true
          : (a?.isActive ?? ag!.is_active);
    if (a) a.isActive = isActive;
    if (ag) ag.is_active = isActive;
    log(`${action} access for ${a?.name ?? agentOf(id).name}`, "people");
    return ok({ userId: id, role: a ? "client" : "agent", isActive, action });
  }),
  http.post("*/api/admin/team", async ({ request }) => {
    const b = await body<{
      name: string;
      email: string;
      password: string;
      role?: string;
      skills?: string[] | null;
      smsPhone?: string | null;
    }>(request);
    if (!b.name || !b.email || (b.password ?? "").length < 8)
      return fail(
        422,
        "validation",
        "Name, email and an 8+ character password are required.",
      );
    if ([...AGENT_STATE.values()].some((s) => s.email === b.email))
      return fail(409, "conflict", "That email is already in use.");
    const role = b.role ?? "agent",
      userId = `ag-${Date.now().toString(36)}`;
    if (role === "agent") {
      AGENTS.push({
        id: userId,
        name: b.name,
        role: "Agent",
        services: b.skills ?? [],
        skillsLabel: [],
        status: "available",
        load: 0,
        cap: 6,
        onTime: 1,
        rating: 0,
        languages: ["rw"],
      } as unknown as (typeof AGENTS)[number]);
      AGENT_STATE.set(userId, {
        email: b.email,
        phone: b.smsPhone ?? "",
        is_active: true,
        twofa: false,
        skills: [],
        papers: [],
      });
    }
    log(`Invited ${b.name} as ${role}`, "people");
    return ok(
      {
        userId,
        name: b.name,
        email: b.email,
        role,
        createdAt: now(),
        welcomeEmailSent: true,
        linkedRoles: [role],
      },
      "Team member created.",
    );
  }),
  // Real logic lives in handlers-system-b's "/api/admin/access-requests/:id/:op"; these explicit paths fall through to it.
  http.post("*/api/admin/access-requests/:id/approve", () => undefined),
  http.post("*/api/admin/access-requests/:id/decline", () => undefined),

  // ------------------------------------------------ partners
  http.get("*/api/admin/partners", () =>
    ok({ partners: PARTNERS.map(partnerRow) }),
  ),
  http.patch("*/api/admin/partners/:id", async ({ params, request }) => {
    const p = PARTNERS.find((x) => x.partnerId === params.id);
    if (!p) return nf();
    const b = await body<Partial<(typeof PARTNERS)[number]>>(request);
    for (const [k, v] of Object.entries(b))
      if (v !== null && v !== undefined && k in p && k !== "partnerId")
        (p as Record<string, unknown>)[k] = v;
    log(`Updated partner ${p.orgName}`, "partner");
    return ok(partnerRow(p));
  }),
  http.get("*/api/admin/partners/:id/documents", ({ params }) =>
    PARTNERS.some((x) => x.partnerId === params.id)
      ? ok(partnerPapers(String(params.id)))
      : nf(),
  ),
  http.post(
    "*/api/admin/partners/:id/documents",
    async ({ params, request }) => {
      const id = String(params.id);
      if (!PARTNERS.some((x) => x.partnerId === id)) return nf();
      const f = await request.formData().catch(() => null),
        kind = (f?.get("kind") ?? "cv") as "cv" | "contract",
        file = f?.get("file");
      const d = partnerDocs(id).find((x) => x.kind === kind);
      if (!d) return fail(422, "validation", "Unknown document kind.");
      Object.assign(d, {
        documentId: `pd-${id}-${kind}-${Date.now()}`,
        originalFilename: file instanceof File ? file.name : `${kind}.pdf`,
        fileSizeBytes: file instanceof File ? file.size : 100_000,
        uploadedAt: now(),
        uploadedByName: "Diane Mukamana",
        status: "pending",
        reviewNote: null,
        reviewedAt: null,
      });
      return ok(partnerPapers(id), "Uploaded.");
    },
  ),
  http.post(
    "*/api/admin/partners/:id/documents/:kind/review",
    async ({ params, request }) => {
      const d = PARTNERS.some((x) => x.partnerId === params.id)
        ? partnerDocs(String(params.id)).find((x) => x.kind === params.kind)
        : undefined;
      if (!d || d.status === "missing") return nf();
      const b = await body<{
        status: "accepted" | "rejected";
        note?: string | null;
      }>(request);
      Object.assign(d, {
        status: b.status,
        reviewNote: b.note ?? null,
        reviewedAt: now(),
      });
      return ok(partnerPapers(String(params.id)));
    },
  ),
  http.delete("*/api/admin/partners/:id/documents/:kind", ({ params }) => {
    const d = PARTNERS.some((x) => x.partnerId === params.id)
      ? partnerDocs(String(params.id)).find((x) => x.kind === params.kind)
      : undefined;
    if (!d) return nf();
    Object.assign(d, {
      documentId: null,
      originalFilename: null,
      fileSizeBytes: null,
      uploadedAt: null,
      uploadedByName: null,
      status: "missing",
      reviewNote: null,
      reviewedAt: null,
    });
    return ok(partnerPapers(String(params.id)));
  }),
  http.get("*/api/admin/partners/:id/documents/:doc/file", ({ params }) =>
    pdf(`${params.doc}.pdf`),
  ),

  // ------------------------------------------------ subscriptions & plans
  http.get("*/api/admin/subscriptions", ({ request }) => {
    const u = new URL(request.url),
      q = (k: string) => u.searchParams.get(k);
    let rows = SUBS.map(subRow);
    if (q("q"))
      rows = rows.filter((r) =>
        `${r.clientName} ${r.clientEmail} ${r.clientPhone}`
          .toLowerCase()
          .includes(q("q")!.toLowerCase()),
      );
    if (q("status")) rows = rows.filter((r) => r.status === q("status"));
    if (q("agent_id"))
      rows = rows.filter((r) => r.dedicatedAgentId === q("agent_id"));
    if (q("has_agent"))
      rows = rows.filter(
        (r) => !!r.dedicatedAgentId === (q("has_agent") === "true"),
      );
    return ok({ subscriptions: rows });
  }),
  http.post("*/api/admin/subscriptions", async ({ request }) => {
    const b = await body<{
      clientId: string;
      planId?: string | null;
      dedicatedAgentId?: string | null;
      note?: string | null;
    }>(request);
    if (!CLIENTS.some((c) => c.id === b.clientId))
      return fail(404, "not_found", "Client not found.");
    if (SUBS.some((s) => s.clientId === b.clientId && s.status !== "cancelled"))
      return fail(409, "conflict", "Client already has a subscription.");
    const s: Sub = {
      subscriptionId: `sub-${Date.now().toString(36)}`,
      clientId: b.clientId,
      planId: b.planId ?? "plan-basic",
      status: "active",
      startedAt: now(),
      periodEnd: new Date(Date.now() + 30 * DAY).toISOString(),
      lastRecordedPaymentAt: null,
      dedicatedAgentId: b.dedicatedAgentId ?? null,
      note: b.note ?? null,
      focus: { categories: [], serviceIds: [] },
    };
    SUBS.push(s);
    log(
      `Started subscription for ${clientOf(s.clientId).name}`,
      "subscription",
    );
    return ok(subRow(s), "Subscription created.");
  }),
  http.patch("*/api/admin/subscriptions/:id", async ({ params, request }) => {
    const s = SUBS.find((x) => x.subscriptionId === params.id);
    if (!s) return nf();
    const b = await body<{
      status?: string | null;
      planId?: string | null;
      dedicatedAgentId?: string | null;
      clearAgent?: boolean;
      recordPayment?: boolean;
      note?: string | null;
    }>(request);
    if (b.status) s.status = b.status;
    if (b.planId) s.planId = b.planId;
    if (b.dedicatedAgentId) s.dedicatedAgentId = b.dedicatedAgentId;
    if (b.clearAgent) s.dedicatedAgentId = null;
    if (b.note !== undefined) s.note = b.note;
    if (b.recordPayment) {
      s.lastRecordedPaymentAt = now();
      s.periodEnd = new Date(
        Math.max(Date.now(), Date.parse(s.periodEnd)) + 30 * DAY,
      ).toISOString();
      s.status = "active";
    }
    log(`Updated subscription ${s.subscriptionId}`, "subscription");
    return ok(subRow(s));
  }),
  http.get("*/api/admin/subscriptions/:id/focus", ({ params }) => {
    const s = SUBS.find((x) => x.subscriptionId === params.id);
    return s ? ok(focusOf(s)) : nf();
  }),
  http.put(
    "*/api/admin/subscriptions/:id/focus",
    async ({ params, request }) => {
      const s = SUBS.find((x) => x.subscriptionId === params.id);
      if (!s) return nf();
      const b = await body<{ categories?: string[]; serviceIds?: string[] }>(
        request,
      );
      s.focus = {
        categories: b.categories ?? s.focus.categories,
        serviceIds: b.serviceIds ?? s.focus.serviceIds,
      };
      return ok(focusOf(s));
    },
  ),
  http.get("*/api/admin/subscriptions/plans", ({ request }) => {
    const all =
      new URL(request.url).searchParams.get("include_archived") === "true";
    return ok({
      plans: PLANS.filter((p) => all || !p.archivedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(planRow),
    });
  }),
  http.post("*/api/admin/subscriptions/plans", async ({ request }) => {
    const b = await body<PlanBody>(request);
    if (!b.name || b.amountRwf == null || b.amountRwf < 0)
      return fail(
        422,
        "validation",
        "Name and a non-negative amount are required.",
      );
    const p = applyPlan(
      {
        planId: `plan-${Date.now().toString(36)}`,
        name: "",
        interval: "month",
        amountRwf: 0,
        isActive: true,
        kind: "retainer",
        maxApplicationsPerMonth: null,
        trialDays: null,
        description: null,
        features: [],
        badge: null,
        sortOrder: PLANS.length,
        isPublic: true,
        archivedAt: null,
        isSignupTrial: false,
      },
      b,
    );
    PLANS.push(p);
    log(`Created plan ${p.name}`, "subscription");
    return ok(planRow(p), "Plan created.");
  }),
  http.patch(
    "*/api/admin/subscriptions/plans/:id",
    async ({ params, request }) => {
      const p = PLANS.find((x) => x.planId === params.id);
      if (!p) return nf();
      applyPlan(p, await body<PlanBody>(request));
      log(`Updated plan ${p.name}`, "subscription");
      return ok(planRow(p));
    },
  ),
  http.delete("*/api/admin/subscriptions/plans/:id", ({ params }) => {
    const i = PLANS.findIndex((x) => x.planId === params.id);
    if (i < 0) return nf();
    const p = PLANS[i],
      n = live(p.planId);
    // Plans anyone ever used are archived, never hard-deleted (subscriptions keep pointing at them).
    if (SUBS.some((s) => s.planId === p.planId)) {
      p.archivedAt = now();
      p.isActive = false;
    } else PLANS.splice(i, 1);
    log(`Removed plan ${p.name}`, "subscription");
    return ok({
      planId: p.planId,
      outcome: (p.archivedAt ? "archived" : "deleted") as
        "archived" | "deleted",
      liveSubscribers: n,
    });
  }),
  http.post("*/api/admin/subscriptions/plans/:id/restore", ({ params }) => {
    const p = PLANS.find((x) => x.planId === params.id);
    if (!p) return nf();
    p.archivedAt = null;
    return ok(planRow(p));
  }),

  // ------------------------------------------------ oversight, deadlines, audit, analytics, settings
  http.get("*/api/admin/oversight/cases", ({ request }) => {
    const tab = new URL(request.url).searchParams.get("tab") ?? "flagged";
    const rows = CASES.filter(
      (c) =>
        !RESOLVED.has(c.ref) &&
        (tab === "overdue"
          ? Date.parse(c.dueAt) < Date.now() && c.status !== "completed_delivered"
          : tab === "unassigned"
            ? !c.assignees.length
            : c.flags.includes("urgent") ||
              c.flags.includes("duplicate") ||
              Date.parse(c.dueAt) < Date.now()),
    );
    return ok({
      cases: rows.map((c) => ({
        code: c.ref,
        service: serviceOf(c.service).name,
        agent: lead(c) ? agentOf(lead(c)!.id).name : "Unassigned",
        client: clientOf(c.clientId).name,
        status: c.status,
        issue: c.flags.includes("duplicate")
          ? "Possible duplicate"
          : Date.parse(c.dueAt) < Date.now()
            ? "SLA breached"
            : c.flags.includes("urgent")
              ? "Urgent"
              : null,
      })),
    });
  }),
  http.patch(
    "*/api/admin/oversight/cases/:code/resolve",
    async ({ params, request }) => {
      if (!caseOf(params.code)) return nf();
      RESOLVED.add(String(params.code));
      log(
        `Resolved oversight flag on ${params.code}: ${(await body<{ resolution_note?: string }>(request)).resolution_note ?? ""}`,
        "oversight",
      );
      return ok({ resolved: true });
    },
  ),
  http.get("*/api/admin/deadlines", ({ request }) => {
    const u = new URL(request.url),
      today = new Date().toISOString().slice(0, 10);
    const start =
        u.searchParams.get("start") ??
        new Date(Date.now() - 7 * DAY).toISOString().slice(0, 10),
      end =
        u.searchParams.get("end") ??
        new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10),
      ag = u.searchParams.get("agent_id");
    const items = CASES.filter(
      (c) =>
        c.status !== "completed_delivered" &&
        c.dueAt.slice(0, 10) >= start &&
        c.dueAt.slice(0, 10) <= end &&
        (!ag || c.assignees.some((a) => a.id === ag)),
    ).map((c) => {
      const s = summary(c);
      return {
        kind: "case" as const,
        id: c.ref,
        code: c.ref,
        title: s.service_name,
        label: null,
        serviceName: s.service_name,
        clientId: c.clientId,
        clientName: s.client_name,
        agentId: s.assignee_id,
        agentName: s.assignee_name,
        dueDate: c.dueAt.slice(0, 10),
        dueAt: c.dueAt,
        state: s.deadline_state,
        status: c.status,
        isUrgent: s.is_urgent,
        dueSource: "sla",
        leadDays: serviceOf(c.service).slaDays,
        note: null,
      };
    });
    return ok({
      today,
      start,
      end,
      items,
      overdueCount: items.filter((i) => i.state === "overdue").length,
      dueSoonCount: items.filter((i) => i.state === "due_soon").length,
    });
  }),
  http.get("*/api/admin/audit-log", ({ request }) => {
    const u = new URL(request.url),
      kind = u.searchParams.get("kind"),
      offset = Number(u.searchParams.get("offset") ?? 0),
      limit = Number(u.searchParams.get("limit") ?? 50);
    const rows = AUDIT.filter((e) => !kind || e.kind === kind);
    return ok({
      entries: rows.slice(offset, offset + limit),
      total: rows.length,
      has_more: offset + limit < rows.length,
    });
  }),
  http.get("*/api/admin/analytics", () => {
    const by = <K extends string>(f: (c: OpsCase) => K) =>
      CASES.reduce(
        (m, c) => m.set(f(c), (m.get(f(c)) ?? 0) + 1),
        new Map<K, number>(),
      );
    const pct = (n: number) => Math.round((n / CASES.length) * 100),
      COLORS = [
        "#2563eb",
        "#16a34a",
        "#f59e0b",
        "#dc2626",
        "#7c3aed",
        "#0891b2",
        "#64748b",
      ];
    const revenue = CASES.filter((c) => c.payment === "paid").reduce(
      (s, c) => s + (c.amount ?? 0),
      0,
    );
    return ok({
      metrics: [
        {
          id: "cases",
          label: "Applications",
          value: CASES.length,
          delta: "+12%",
          deltaDir: "up",
          deltaColor: "green",
        },
        {
          id: "revenue",
          label: "Revenue (RWF)",
          value: revenue,
          delta: "+8%",
          deltaDir: "up",
          deltaColor: "green",
        },
        {
          id: "sla",
          label: "On-time SLA",
          value: "94%",
          delta: "-1pt",
          deltaDir: "down",
          deltaColor: "red",
        },
        {
          id: "subs",
          label: "Active subscriptions",
          value: SUBS.filter((s) => s.status === "active").length,
          delta: null,
          deltaDir: null,
          deltaColor: null,
        },
      ],
      weeklyBars: [7, 6, 5, 4, 3, 2, 1, 0].map((w) => ({
        week: `W-${w}`,
        count: 6 + ((w * 5) % 7),
        isCurrent: w === 0,
      })),
      serviceMix: [...by((c) => serviceOf(c.service).name)].map(
        ([service, n], i) => ({
          service,
          pct: pct(n),
          color: COLORS[i % COLORS.length],
        }),
      ),
      paymentMix: [
        { method: "MTN MoMo", pct: 62, color: COLORS[2] },
        { method: "Airtel Money", pct: 21, color: COLORS[3] },
        { method: "Card", pct: 17, color: COLORS[0] },
      ],
      statusBreakdown: [...by((c) => c.status)].map(([label, count], i) => ({
        label,
        count,
        pct: pct(count),
        color: COLORS[i % COLORS.length],
      })),
      alerts: CASES.some(
        (c) => Date.parse(c.dueAt) < Date.now() && c.status !== "completed_delivered",
      )
        ? [
            {
              id: "sla",
              message: "Some cases are past their SLA.",
              severity: "warning",
              cta: "Review",
              ctaHref: "/admin/oversight",
            },
          ]
        : [],
      agents: AGENTS.map((a) => {
        const x = a as typeof a & {
            load?: number;
            cap?: number;
            onTime?: number;
            rating?: number;
          },
          s = AGENT_STATE.get(a.id)!;
        return {
          id: a.id,
          fullName: a.name,
          initials: initials(a.name),
          email: s.email,
          skills: a.skillsLabel,
          load: x.load ?? openCases(a.id),
          capacity: x.cap ?? 6,
          twoFa: s.twofa,
          role: a.role,
          status: a.status,
          activeCases: openCases(a.id),
          completedTotal: leaderboard().find((l) => l.name === a.name)!.count,
          avgTurnaround: "2.4d",
          slaPercent: Math.round((x.onTime ?? 0.9) * 100),
          rating: x.rating ?? 4.5,
        };
      }),
    });
  }),
  http.get("*/api/admin/settings", () => ok(SETTINGS)),
  http.patch("*/api/admin/settings", async ({ request }) => {
    const b = await body<Partial<typeof SETTINGS>>(request);
    for (const [k, v] of Object.entries(b))
      if (v !== null && v !== undefined && k in SETTINGS)
        (SETTINGS as Record<string, unknown>)[k] = v;
    log("Updated platform settings", "settings");
    return ok(SETTINGS, "Settings saved.");
  }),
];

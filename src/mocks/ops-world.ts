// One coherent fixture world for every Stage 3 ops mock, so counts agree across pages
// (Intake 12 on Today = 12 rows in Intake). Times are relative to load time so SLA chips are live.
// shortcut: mock-only data shaped from spec/05-modules; replace per endpoint as /api/admin/* gains these fields.
import type { CaseStatus } from "@/shared/domain/case-status";
import type { Agent } from "@/shared/ops/ranking";
import type { ChecklistItem } from "@/shared/ops/completeness";

const H = 3600_000;
const NOW = Date.now();
const at = (hoursFromNow: number) =>
  new Date(NOW + hoursFromNow * H).toISOString();

export const MANAGER = {
  id: "sm-diane",
  name: "Diane Mukamana",
  category: "taxes-and-business-support",
  categoryName: "Tax & Accounting",
};

export const AGENTS: (Agent & {
  role: string;
  avatar?: string;
  skillsLabel: string[];
  status: "available" | "leave" | "parttime";
})[] = [
  {
    id: "ag-grace",
    name: "Grace Uwimana",
    role: "Senior agent",
    services: [
      "vat-declaration",
      "paye-monthly-filing",
      "company-registration",
      "tax-clearance-certificate",
      "business-plan",
    ],
    skills: {
      "vat-declaration": 0.95,
      "company-registration": 0.9,
      "paye-monthly-filing": 0.9,
      "tax-clearance-certificate": 0.85,
      "business-plan": 0.6,
    },
    load: 5,
    cap: 8,
    onTime: 0.96,
    rating: 4.8,
    languages: ["rw", "en"],
    skillsLabel: ["Tax filing", "RDB"],
    status: "available",
  },
  {
    id: "ag-eric",
    name: "Eric Habimana",
    role: "Agent",
    services: [
      "vat-declaration",
      "company-registration",
      "trademark-registration",
    ],
    skills: {
      "vat-declaration": 0.8,
      "company-registration": 0.85,
      "trademark-registration": 0.9,
    },
    load: 9,
    cap: 8,
    onTime: 0.92,
    rating: 4.6,
    languages: ["rw", "en", "fr"],
    skillsLabel: ["RRA", "VAT"],
    status: "available",
  },
  {
    id: "ag-jp",
    name: "Jean-Paul Nkurunziza",
    role: "Agent",
    services: [
      "paye-monthly-filing",
      "tax-clearance-certificate",
      "vat-declaration",
    ],
    skills: {
      "paye-monthly-filing": 0.85,
      "tax-clearance-certificate": 0.9,
      "vat-declaration": 0.7,
    },
    load: 4,
    cap: 8,
    onTime: 0.98,
    rating: 4.9,
    languages: ["rw", "fr"],
    skillsLabel: ["RDB", "Filing"],
    status: "available",
  },
  {
    id: "ag-claudine",
    name: "Claudine Ingabire",
    role: "Agent",
    services: [
      "business-plan",
      "company-registration",
      "investment-certificate",
    ],
    skills: {
      "business-plan": 0.9,
      "company-registration": 0.75,
      "investment-certificate": 0.8,
    },
    load: 4,
    cap: 8,
    onTime: 0.97,
    rating: 4.7,
    languages: ["rw", "en"],
    onLeaveUntil: null,
    skillsLabel: ["Compliance"],
    status: "available",
  },
  {
    id: "ag-david",
    name: "David Niyonkuru",
    role: "Agent",
    services: ["company-registration", "vat-declaration"],
    skills: { "company-registration": 0.8, "vat-declaration": 0.75 },
    load: 2,
    cap: 8,
    onTime: 0.9,
    rating: 4.4,
    languages: ["rw"],
    onLeaveUntil: "2026-12-31",
    skillsLabel: ["RDB"],
    status: "leave",
  },
  {
    id: "ag-patrick",
    name: "Patrick Mugisha",
    role: "External",
    external: true,
    location: "Musanze",
    services: [
      "company-registration",
      "vat-declaration",
      "trademark-registration",
    ],
    skills: {
      "company-registration": 0.8,
      "vat-declaration": 0.7,
      "trademark-registration": 0.6,
    },
    load: 2,
    cap: 5,
    onTime: 0.95,
    rating: 4.5,
    languages: ["rw", "en"],
    cost: 35000,
    skillsLabel: ["RDB", "Tax"],
    status: "parttime",
  },
];

export const CLIENTS = [
  {
    id: "cl-aline",
    name: "Aline Uwase",
    type: "individual" as const,
    phone: "+250 788 123 456",
    email: "aline.uwase@example.rw",
    language: "rw",
    since: "2024",
    past: 3,
    flags: ["subscriber"],
    dedicatedAgentId: "ag-grace",
  },
  {
    id: "cl-kff",
    name: "Kigali Fresh Foods Ltd",
    type: "company" as const,
    phone: "+250 788 555 210",
    email: "finance@kff.example.rw",
    language: "en",
    since: "2023",
    past: 11,
    flags: ["vip"],
    dedicatedAgentId: "ag-jp",
  },
  {
    id: "cl-nyt",
    name: "Nyamirambo Tailors Coop",
    type: "company" as const,
    phone: "+250 722 410 998",
    email: "coop@nyt.example.rw",
    language: "rw",
    since: "2025",
    past: 2,
    flags: [],
    dedicatedAgentId: null,
  },
  {
    id: "cl-rwl",
    name: "Rwandan Ltd",
    type: "company" as const,
    phone: "+250 733 200 145",
    email: "admin@rwl.example.rw",
    language: "fr",
    since: "2026",
    past: 0,
    flags: ["partner"],
    dedicatedAgentId: null,
  },
];

export const SERVICES = [
  {
    slug: "company-registration",
    name: "Company registration (RDB)",
    fee: 20000,
    pricing: "fixed" as const,
    slaDays: 3,
    institution: "RDB",
  },
  {
    slug: "vat-declaration",
    name: "VAT declaration",
    fee: 15000,
    pricing: "fixed" as const,
    slaDays: 2,
    institution: "RRA",
  },
  {
    slug: "paye-monthly-filing",
    name: "PAYE monthly filing",
    fee: 15000,
    pricing: "fixed" as const,
    slaDays: 2,
    institution: "RRA",
  },
  {
    slug: "tax-clearance-certificate",
    name: "Tax clearance certificate",
    fee: 30000,
    pricing: "fixed" as const,
    slaDays: 3,
    institution: "RRA",
  },
  {
    slug: "business-plan",
    name: "Business plan",
    fee: null,
    pricing: "quote" as const,
    slaDays: 5,
    institution: null,
  },
  {
    slug: "trademark-registration",
    name: "Trademark registration",
    fee: 50000,
    pricing: "fixed" as const,
    slaDays: 10,
    institution: "RDB",
  },
  {
    slug: "investment-certificate",
    name: "Investment certificate (RDB)",
    fee: 1200000,
    pricing: "range" as const,
    slaDays: 10,
    institution: "RDB",
  },
];

export type Flag =
  | "urgent"
  | "vip"
  | "subscriber"
  | "ai"
  | "partner"
  | "duplicate"
  | "dedicated";
export type OpsCase = {
  ref: string;
  service: string;
  clientId: string;
  status: CaseStatus;
  subStatus?: string | null;
  previous?: CaseStatus | null;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  firstResponseDueAt?: string;
  flags: Flag[];
  assignees: { id: string; role: "lead" | "helper" }[];
  amount: number | null;
  payment: "paid" | "unpaid" | "partial" | "covered";
  institution?: string | null;
  submissionRef?: string | null;
  expectedDecision?: string | null;
  checklist: ChecklistItem[];
  deliverables: number;
  claimedBy?: string | null;
  partnerName?: string;
};

const docs = (missing: string[] = [], check: string[] = []): ChecklistItem[] =>
  [
    ["form", "Application form"],
    ["id", "National ID (client)"],
    ["address", "Proof of business address"],
    ["sh1", "Shareholder ID (1)"],
    ["sh2", "Shareholder ID (2)"],
    ["plan", "Business plan"],
    ["bank", "Bank statement"],
    ["payment", "Payment proof"],
  ].map(
    ([key, label]) =>
      ({
        key,
        label,
        required: key !== "plan",
        state: missing.includes(key)
          ? "missing"
          : check.includes(key)
            ? "check"
            : "provided",
        docId: missing.includes(key) ? null : `doc-${key}`,
      }) as ChecklistItem,
  );

let n = 0;
const ref = () =>
  `HBZ-${["4K2M9Q", "7PX31A", "9QW5ZE", "2RT8LM", "5HN7KD", "8VB2XC", "3MJ6TR", "6LP4WS", "1ZQ9YU", "4GH8NB"][n % 10]}${n++ >= 10 ? String.fromCharCode(65 + (n % 26)) : ""}`;
const mk = (
  o: Partial<OpsCase> & Pick<OpsCase, "service" | "clientId" | "status">,
  createdH: number,
  dueH: number,
): OpsCase => ({
  ref: ref(),
  createdAt: at(createdH),
  updatedAt: at(Math.min(0, createdH + 1)),
  dueAt: at(dueH),
  flags: [],
  assignees: [],
  payment: "paid",
  amount: SERVICES.find((s) => s.slug === o.service)?.fee ?? null,
  checklist: docs(),
  deliverables: 0,
  ...o,
});

// 12 intake (received), then working cases across every status.
export const CASES: OpsCase[] = [
  mk(
    {
      service: "company-registration",
      clientId: "cl-aline",
      status: "received",
      flags: ["subscriber", "ai", "dedicated"],
      checklist: docs(["address", "sh2"], ["bank"]),
      firstResponseDueAt: at(3),
    },
    -2,
    70,
  ),
  mk(
    {
      service: "business-plan",
      clientId: "cl-kff",
      status: "received",
      flags: ["vip"],
      amount: null,
      payment: "unpaid",
      firstResponseDueAt: at(3.5),
    },
    -1.7,
    118,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-nyt",
      status: "received",
      flags: ["subscriber"],
      checklist: docs(["sh2"]),
      firstResponseDueAt: at(4),
    },
    -1.6,
    70,
  ),
  mk(
    {
      service: "tax-clearance-certificate",
      clientId: "cl-rwl",
      status: "received",
      flags: ["partner"],
      partnerName: "Bank of Kigali",
      payment: "unpaid",
      firstResponseDueAt: at(4.5),
    },
    -1,
    70,
  ),
  mk(
    {
      service: "paye-monthly-filing",
      clientId: "cl-aline",
      status: "received",
      flags: ["duplicate"],
      checklist: docs(["address", "sh1", "sh2", "bank", "payment"]),
      firstResponseDueAt: at(5),
    },
    -0.5,
    46,
  ),
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-kff",
      status: "received",
      flags: ["urgent", "vip"],
      firstResponseDueAt: at(1),
    },
    -3,
    20,
  ),
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-nyt",
      status: "received",
      flags: ["urgent"],
      payment: "unpaid",
      firstResponseDueAt: at(2),
    },
    -2.5,
    22,
  ),
  mk(
    {
      service: "trademark-registration",
      clientId: "cl-rwl",
      status: "received",
      flags: [],
      firstResponseDueAt: at(6),
    },
    -0.3,
    230,
  ),
  mk(
    {
      service: "investment-certificate",
      clientId: "cl-kff",
      status: "received",
      flags: ["vip", "ai"],
      amount: 1200000,
      payment: "unpaid",
      firstResponseDueAt: at(6),
    },
    -0.2,
    230,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-rwl",
      status: "received",
      flags: ["partner"],
      partnerName: "Bank of Kigali",
      firstResponseDueAt: at(7),
    },
    -0.1,
    70,
  ),
  mk(
    {
      service: "paye-monthly-filing",
      clientId: "cl-nyt",
      status: "received",
      flags: ["subscriber"],
      payment: "covered",
      firstResponseDueAt: at(7),
    },
    -0.1,
    46,
  ),
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-aline",
      status: "received",
      flags: [],
      firstResponseDueAt: at(8),
    },
    -0.05,
    46,
  ),
  // Working cases
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-aline",
      status: "in_progress",
      assignees: [{ id: "ag-grace", role: "lead" }],
    },
    -30,
    6,
  ),
  mk(
    {
      service: "business-plan",
      clientId: "cl-kff",
      status: "in_progress",
      assignees: [{ id: "ag-grace", role: "lead" }],
      amount: 405000,
    },
    -50,
    16,
  ),
  mk(
    {
      service: "tax-clearance-certificate",
      clientId: "cl-nyt",
      status: "in_progress",
      assignees: [{ id: "ag-jp", role: "lead" }],
    },
    -60,
    -26,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-rwl",
      status: "in_progress",
      assignees: [
        { id: "ag-eric", role: "lead" },
        { id: "ag-patrick", role: "helper" },
      ],
    },
    -80,
    -50,
  ),
  mk(
    {
      service: "paye-monthly-filing",
      clientId: "cl-kff",
      status: "in_progress",
      assignees: [{ id: "ag-claudine", role: "lead" }],
    },
    -10,
    40,
  ),
  mk(
    {
      service: "trademark-registration",
      clientId: "cl-aline",
      status: "in_progress",
      assignees: [{ id: "ag-eric", role: "lead" }],
    },
    -100,
    -75,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-kff",
      status: "awaiting_client_documents",
      previous: "under_review",
      subStatus: "2 items · due Mon",
      checklist: docs(["address", "sh2"]),
      assignees: [],
    },
    -20,
    60,
  ),
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-nyt",
      status: "awaiting_client_documents",
      previous: "in_progress",
      checklist: docs(["bank"]),
      assignees: [{ id: "ag-grace", role: "lead" }],
    },
    -40,
    40,
  ),
  mk(
    {
      service: "business-plan",
      clientId: "cl-rwl",
      status: "awaiting_quotation",
      amount: null,
      payment: "unpaid",
    },
    -8,
    100,
  ),
  mk(
    {
      service: "investment-certificate",
      clientId: "cl-aline",
      status: "awaiting_payment",
      amount: 1200000,
      payment: "unpaid",
    },
    -12,
    200,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-aline",
      status: "approved_assigned",
      assignees: [{ id: "ag-claudine", role: "lead" }],
    },
    -5,
    66,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-kff",
      status: "awaiting_internal_review",
      assignees: [{ id: "ag-grace", role: "lead" }],
      deliverables: 2,
    },
    -55,
    12,
  ),
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-aline",
      status: "awaiting_internal_review",
      assignees: [{ id: "ag-eric", role: "lead" }],
      deliverables: 1,
    },
    -30,
    5,
  ),
  mk(
    {
      service: "tax-clearance-certificate",
      clientId: "cl-rwl",
      status: "awaiting_internal_review",
      assignees: [{ id: "ag-jp", role: "lead" }],
      deliverables: 1,
      payment: "unpaid",
    },
    -40,
    30,
  ),
  mk(
    {
      service: "investment-certificate",
      clientId: "cl-kff",
      status: "awaiting_internal_review",
      assignees: [{ id: "ag-claudine", role: "lead" }],
      deliverables: 3,
      amount: 1200000,
    },
    -200,
    48,
  ),
  mk(
    {
      service: "paye-monthly-filing",
      clientId: "cl-nyt",
      status: "awaiting_internal_review",
      assignees: [{ id: "ag-jp", role: "lead" }],
      deliverables: 1,
      payment: "covered",
    },
    -26,
    20,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-nyt",
      status: "awaiting_external_institution",
      subStatus: "Awaiting name reservation",
      institution: "RDB",
      submissionRef: "RDB-55120",
      expectedDecision: at(24),
      assignees: [{ id: "ag-eric", role: "lead" }],
    },
    -70,
    30,
  ),
  mk(
    {
      service: "trademark-registration",
      clientId: "cl-kff",
      status: "awaiting_external_institution",
      institution: "RDB",
      submissionRef: "RDB-55188",
      expectedDecision: at(72),
      assignees: [{ id: "ag-eric", role: "lead" }],
    },
    -150,
    100,
  ),
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-rwl",
      status: "awaiting_external_institution",
      institution: "RRA",
      submissionRef: "RRA-88310",
      expectedDecision: at(-10),
      assignees: [{ id: "ag-grace", role: "lead" }],
    },
    -90,
    10,
  ),
  mk(
    {
      service: "tax-clearance-certificate",
      clientId: "cl-aline",
      status: "awaiting_external_institution",
      institution: "RRA",
      submissionRef: "RRA-88402",
      expectedDecision: at(48),
      assignees: [{ id: "ag-jp", role: "lead" }],
    },
    -60,
    60,
  ),
  mk(
    {
      service: "paye-monthly-filing",
      clientId: "cl-kff",
      status: "awaiting_external_institution",
      institution: "RSSB",
      submissionRef: "RSSB-1201",
      expectedDecision: at(96),
      assignees: [{ id: "ag-claudine", role: "lead" }],
    },
    -30,
    80,
  ),
  mk(
    {
      service: "business-plan",
      clientId: "cl-nyt",
      status: "on_hold",
      previous: "in_progress",
      subStatus: "Resumes Tue 19 Nov",
      assignees: [{ id: "ag-claudine", role: "lead" }],
    },
    -120,
    80,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-rwl",
      status: "on_hold",
      previous: "under_review",
      subStatus: "Waiting for client call",
    },
    -48,
    90,
  ),
  mk(
    {
      service: "vat-declaration",
      clientId: "cl-kff",
      status: "completed_delivered",
      assignees: [{ id: "ag-grace", role: "lead" }],
      deliverables: 1,
    },
    -200,
    -150,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-aline",
      status: "completed_delivered",
      assignees: [{ id: "ag-claudine", role: "lead" }],
      deliverables: 2,
    },
    -300,
    -250,
  ),
  mk(
    {
      service: "paye-monthly-filing",
      clientId: "cl-nyt",
      status: "completed_delivered",
      assignees: [{ id: "ag-jp", role: "lead" }],
      deliverables: 1,
    },
    -250,
    -220,
  ),
  mk(
    {
      service: "trademark-registration",
      clientId: "cl-rwl",
      status: "rejected",
      subStatus: "Out of scope",
    },
    -100,
    -50,
  ),
  mk(
    {
      service: "company-registration",
      clientId: "cl-kff",
      status: "refund_requested",
      previous: "completed_delivered",
      assignees: [{ id: "ag-eric", role: "lead" }],
    },
    -400,
    -380,
  ),
];

export const serviceOf = (slug: string) =>
  SERVICES.find((s) => s.slug === slug)!;
export const clientOf = (id: string) => CLIENTS.find((c) => c.id === id)!;
/** External (firm) agents assigned to ops cases; work-world registers them so ops views can name them. */
export const EXTERNAL_AGENT_NAMES = new Map<string, string>();
export const agentOf = (id: string): (typeof AGENTS)[number] =>
  AGENTS.find((a) => a.id === id) ??
  ({ id, name: EXTERNAL_AGENT_NAMES.get(id) ?? id, role: "External agent", services: [], skillsLabel: [], status: "available" } as unknown as (typeof AGENTS)[number]);

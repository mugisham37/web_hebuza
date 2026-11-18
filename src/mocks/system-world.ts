// Stage 6 System Administrator mock world (plan 06 §9.5). Built ON ops-world + agent-world + personas so every
// workspace agrees: users are the same people, ids match finance-world (`mock-<persona>`) and ops-world (`ag-*`, `cl-*`).
// Counts are derived, never hard-coded. Times are relative to load (like ops-world) so countdowns stay live.
// Fictional, anonymised data only (F-PRV-06). Lanes mutate these exported objects; never re-seed them.
// shortcut: ★ mock — every list here is replaced by its real /api/staff/* endpoint as the backend ships.
import type { Role } from "@/shared/auth/roles";
import { AGENTS, CLIENTS, CASES } from "./ops-world";
import { ME as AGENT_ME } from "./agent-world";
import { PERSONAS, currentPersona } from "./personas";
import { audit, auditAll, type AuditEvent } from "./audit";
import { propose, tick, type Approver } from "@/shared/system/approvals";
import { GENESIS, hashRow, verifyChain } from "@/shared/system/audit";
import { AUDIT_CATALOGUE, categoryOf, type AuditCode } from "@/shared/system/audit-catalogue";
import { SETTINGS as SETTING_DEFS } from "@/shared/system/settings-registry";
import { health } from "@/shared/system/integrations";
import { dsrDue, erasurePlan, RETENTION as RETENTION_POLICY } from "@/shared/system/privacy";
import { riskFlags, INVITE_TTL_MS } from "@/shared/system/governance";
import { postmortemDue } from "@/shared/system/incidents";
import type {
  AlertVM, AuditEntryVM, BackupVM, BreakGlassVM, BudgetVM, ChangeRequestVM, ComponentHealthVM, DeliveryVM, DependencyVM,
  DrillVM, DsrVM, EventRuleVM, IdentityRequestVM, ImpersonationVM, IncidentVM, IntegrationVM, PersonRef, PostureVM,
  ProcessorVM, RetentionRow, ReviewCampaignVM, ServiceAccountVM, SessionVM, SetupItem, SettingValueVM, SodWaiverVM,
  SystemSummary, SystemUserVM, TemplateVM, TrustedDeviceVM,
} from "@/shared/system/types";

const H = 3600_000, D = 24 * H;
export const NOW = Date.now(); // read once at load (never in render)
export const at = (hours: number) => new Date(NOW + hours * H).toISOString();
const YEAR = new Date(NOW).getUTCFullYear();

/** Deterministic PRNG so the seeded audit chain is the same every load (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- errors
export class SysError extends Error {
  constructor(public status: number, public code: string, public extra?: Record<string, unknown>) { super(code); }
}

// ---------------------------------------------------------------- people (§0.2)
const persona = (key: string) => PERSONAS.find((p) => p.key === key)!;
const pid = (key: string) => `mock-${key}`;
export const PEOPLE = {
  innocent: { id: pid("sysadmin"), name: persona("sysadmin").name },
  yvonne: { id: pid("sysadmin2"), name: persona("sysadmin2").name },
  alice: { id: pid("exec"), name: persona("exec").name },
  diane: { id: pid("sm"), name: persona("sm").name },
  patrick: { id: pid("finance"), name: persona("finance").name },
  system: { id: "system", name: "HEBUZA system" },
} satisfies Record<string, PersonRef>;
/** Done-when invitee (journey S1). Not a user until invited. Patrick is Stage 5's finance persona (D-17), so the
 * journey invites a second finance officer instead. */
export const JOURNEY_INVITEE = { name: "Olivier Nshimiyimana", email: "olivier.nshimiyimana@hebuza.example", role: "staff:finance" as Role };

/** The signed-in persona as an approver; Innocent when none (node). */
export function actor(): Approver {
  const p = currentPersona();
  return p ? { id: pid(p.key), name: p.name, roles: p.roles } : { ...PEOPLE.innocent, roles: ["staff:sysadmin"] };
}
export const isSysadmin = (a = actor()) => a.roles.includes("staff:sysadmin");
export const isExec = (a = actor()) => a.roles.includes("staff:executive");

const grant = (role: string, by = PEOPLE.innocent.name, daysAgo = 200) => ({ role, grantedBy: by, grantedAt: at(-daysAgo * 24), expiresAt: null });
const staffUser = (key: string, o: Partial<SystemUserVM> = {}): SystemUserVM => {
  const p = persona(key);
  return {
    id: pid(key), name: p.name, email: p.email, phone: null, kind: p.roles.includes("client") ? "client" : p.roles.includes("ext:agent") ? "agent" : "staff",
    roles: p.roles.map((r) => grant(r)), status: "active", mfa: { state: "enrolled", methods: ["totp"], backupCodesLeft: 8 },
    lastActiveAt: at(-2), termsVersion: "2026-03", locale: "rw", createdAt: at(-300 * 24), createdBy: "Bootstrap admin", version: 1, ...o,
  };
};

export const USERS: SystemUserVM[] = [
  staffUser("sysadmin", { mfa: { state: "enrolled", methods: ["webauthn", "totp"], backupCodesLeft: 9 }, lastActiveAt: at(-0.05) }),
  staffUser("sysadmin2", { lastActiveAt: at(-26) }),
  staffUser("exec", { mfa: { state: "enrolled", methods: ["webauthn", "totp"], backupCodesLeft: 10 }, lastActiveAt: at(-3) }),
  staffUser("sm", { lastActiveAt: at(-0.5), managerName: persona("exec").name }),
  staffUser("finance", { lastActiveAt: at(-5), managerName: persona("exec").name }),
  staffUser("finance2", { lastActiveAt: at(-30), managerName: persona("exec").name }),
  staffUser("marketing", { lastActiveAt: at(-75 * 24) }),
  staffUser("procurement", { lastActiveAt: null, mfa: { state: "pending", methods: [], backupCodesLeft: null } }),
  staffUser("partners", { lastActiveAt: at(-12) }),
  staffUser("ext", { kind: "agent", lastActiveAt: at(-40) }),
  ...AGENTS.map((a, i): SystemUserVM => ({
    id: a.id, name: a.name, email: `${a.name.toLowerCase().replace(/[^a-z]+/g, ".")}@hebuza.example`, phone: null, kind: "agent",
    roles: [grant(a.id === "ag-patrick" ? "ext:agent" : "staff:agent", PEOPLE.diane.name, 120 + i * 20)],
    status: a.id === "ag-claudine" ? "locked" : "active",
    mfa: { state: a.id === AGENT_ME.id ? "reset" : "enrolled", methods: a.id === AGENT_ME.id ? [] : ["totp"], backupCodesLeft: a.id === AGENT_ME.id ? null : 6 },
    lastActiveAt: at(-(i + 1) * 1.5), termsVersion: "2026-03", locale: "rw", createdAt: at(-(150 + i * 20) * 24), createdBy: PEOPLE.diane.name,
    managerName: PEOPLE.diane.name, version: 1,
  })),
  ...CLIENTS.map((c, i): SystemUserVM => ({
    id: c.id, name: c.name, email: c.email, phone: c.phone, kind: "client", roles: [grant("client", "self-signup", 400 - i * 40)],
    status: "active", mfa: { state: i === 1 ? "enrolled" : "pending", methods: i === 1 ? ["totp"] : [], backupCodesLeft: null },
    lastActiveAt: at(-(i + 1) * 20), customerNo: `HBZ-C-${String(101 + i).padStart(6, "0")}`, termsVersion: "2026-03",
    locale: c.language as SystemUserVM["locale"], createdAt: at(-(400 - i * 40) * 24), version: 1,
  })),
  {
    id: "u-bootstrap", name: "Bootstrap admin", email: "admin@hebuza.example", phone: null, kind: "service",
    roles: [{ role: "staff:admin", grantedBy: "seed", grantedAt: at(-320 * 24), expiresAt: null }], status: "active",
    mfa: { state: "enrolled", methods: ["totp"], backupCodesLeft: 10 }, lastActiveAt: at(-90 * 24), isBootstrap: true,
    createdAt: at(-320 * 24), createdBy: "seed", version: 1,
  },
];
export const userOf = (id: string) => USERS.find((u) => u.id === id);

export const SERVICE_ACCOUNTS: ServiceAccountVM[] = [
  { id: "svc-worker", name: "Background worker", scopes: ["jobs.run", "notifications.send"], last4: "7c1e", rotatedAt: at(-41 * 24), createdBy: PEOPLE.innocent.name },
  { id: "svc-webhooks", name: "Payment webhooks", scopes: ["payments.webhook"], last4: "3f9a", rotatedAt: at(-12 * 24), createdBy: PEOPLE.yvonne.name },
];

const CITIES = ["Kigali", "Kigali", "Musanze", "Huye", null] as const;
export const SESSIONS: SessionVM[] = USERS.filter((u) => u.status === "active" && u.kind !== "service").flatMap((u, i) =>
  Array.from({ length: (i % 3) + 1 }, (_, j): SessionVM => ({
    id: `ses-${u.id}-${j}`, userId: u.id, device: ["Chrome · Windows", "Safari · iPhone", "Firefox · Ubuntu"][j], ip: `41.186.${20 + i}.${10 + j * 7}`,
    city: CITIES[(i + j) % CITIES.length], createdAt: at(-(j + 1) * 6), lastSeenAt: at(-(j * 3 + 0.2)), current: u.id === PEOPLE.innocent.id && j === 0,
  })),
);
export const DEVICES: TrustedDeviceVM[] = USERS.filter((u) => u.kind === "agent" && u.status === "active").slice(0, 4).map((u, i) => ({
  id: `dev-${u.id}`, userId: u.id, label: ["Pixel 7", "Galaxy A54", "iPhone 13", "Tecno Camon"][i], addedAt: at(-(30 + i) * 24), lastUsedAt: at(-(i + 1) * 5),
}));

// ---------------------------------------------------------------- approvals (§2.1) — 3 seeds
let changeSeq = 40;
export const nextChangeId = () => `CR-${YEAR}-${String(++changeSeq).padStart(4, "0")}`;
export const CHANGES: ChangeRequestVM[] = [
  { ...propose({ id: nextChangeId(), kind: "setting_change", title: "IP allowlist for sysadmins", by: PEOPLE.yvonne, now: NOW - 5 * H, reason: "Lock admin sign-in to the office and VPN ranges after the October phishing attempt.", before: { "security.ip_allowlist.sysadmin": [] }, after: { "security.ip_allowlist.sysadmin": ["41.186.20.0/24", "10.8.0.0/16"] }, payload: { key: "security.ip_allowlist.sysadmin" } }) },
  { ...propose({ id: nextChangeId(), kind: "retention_change", title: "Analytics retention 14 → 12 months", by: PEOPLE.innocent, now: NOW - 26 * H, reason: "Align with the updated cookie notice; nothing needs analytics older than a year.", before: { category: "Analytics", keep: "14 months" }, after: { category: "Analytics", keep: "12 months" }, payload: { category: "Analytics" } }) },
  { ...propose({ id: nextChangeId(), kind: "credential_rotation", title: "Rotate WhatsApp Business token (production)", by: PEOPLE.yvonne, now: NOW - 2 * H, reason: "Quarterly rotation; new token tested in sandbox at 11:40.", before: { last4: "a17e" }, after: { last4: "c204" }, payload: { integration: "whatsapp", env: "production" } }) },
];
export const changeOf = (id: string) => CHANGES.find((c) => c.id === id);
/** Expire/apply in place (call at the top of every approvals read). */
export function sweepChanges(now = Date.now()) {
  CHANGES.forEach((c, i) => { const n = tick(c, now); if (n !== c) { CHANGES[i] = n; record(n.state === "expired" ? "config.change.expired" : "config.change.applied", "change", n.id, { state: c.state }, { state: n.state }, undefined, PEOPLE.system); } });
}

// ---------------------------------------------------------------- governance (U7–U11)
const reviewUsers = USERS.filter((u) => u.kind === "staff" || u.kind === "agent").filter((u) => !u.isBootstrap);
export const REVIEWS: ReviewCampaignVM[] = [
  {
    id: `AR-${YEAR}-Q4`, name: `Q4 ${YEAR} access review`, status: "open", openedAt: at(-12 * 24), dueAt: at(7 * 24), signOffs: [], version: 1,
    items: reviewUsers.flatMap((u) => u.roles.map((r) => ({ u, r }))).map(({ u, r }, i, all) => ({
      id: `ri-${i + 1}`, userId: u.id, userName: u.name, role: r.role, lastActiveAt: u.lastActiveAt, flags: riskFlags(u, NOW),
      decision: i < Math.round(all.length * 0.64) ? (i % 9 === 4 ? "role_removed" : "kept") : "pending",
      reviewer: u.id === PEOPLE.innocent.id ? PEOPLE.yvonne : PEOPLE.innocent, decidedAt: i < Math.round(all.length * 0.64) ? at(-(i % 10) * 20) : undefined,
    })),
  },
  {
    id: `AR-${YEAR}-Q3`, name: `Q3 ${YEAR} access review`, status: "completed", openedAt: at(-102 * 24), dueAt: at(-88 * 24), version: 3,
    signOffs: [{ role: "staff:sysadmin", by: PEOPLE.innocent, at: at(-89 * 24) }, { role: "staff:executive", by: PEOPLE.alice, at: at(-88.5 * 24) }],
    items: [],
  },
];
export const WAIVERS: SodWaiverVM[] = [
  { id: "WV-001", userId: pid("exec"), userName: PEOPLE.alice.name, pair: ["staff:executive", "staff:service_manager"], why: "Acting service manager while the second SM post is vacant.", expiresAt: at(120 * 24), approvedBy: PEOPLE.alice, approvedAt: at(-60 * 24) },
];
export const BREAK_GLASS: BreakGlassVM = { state: "sealed", lastUsedAt: null };
export const IDENTITY: IdentityRequestVM[] = [
  { id: "AXR-2041", kind: "two_factor", userId: AGENT_ME.id, userName: AGENT_ME.name, managerName: PEOPLE.diane.name, reason: "Phone replaced; authenticator app not restored.", at: at(-3), status: "pending" },
  { id: "AXR-2042", kind: "unlock", userId: "ag-claudine", userName: "Claudine Ingabire", managerName: PEOPLE.diane.name, reason: "Locked after 10 failed sign-ins this morning (caps lock).", at: at(-1.2), status: "pending" },
];
export const IMPERSONATION: { current: ImpersonationVM } = { current: null };

// ---------------------------------------------------------------- integrations (S4, §2.5) — 13 + 4 platform
type Seed = Omit<IntegrationVM, "health" | "version" | "envChangedAt" | "credentials" | "lastTest"> & { test?: [number, boolean, string] | null; rotated?: number };
const integ = (s: Seed): IntegrationVM => {
  const vm: IntegrationVM = {
    ...s, envChangedAt: null, version: 1, health: "untested",
    credentials: s.configured ? [{ name: "API key", last4: s.key.slice(0, 2) + "9a", rotatedAt: at(-(s.rotated ?? 40) * 24) }] : [],
    lastTest: s.test ? { at: at(s.test[0]), ok: s.test[1], message: s.test[2], env: s.env } : null,
  };
  return { ...vm, health: health(vm) };
};
export const INTEGRATIONS: IntegrationVM[] = [
  integ({ key: "mtn-momo", name: "MTN MoMo", group: "payments", env: "production", configured: true, test: [-0.5, true, "Collection request 200"], errorRate1h: 0.01, usage: { used: 1842, limit: 10_000, unit: "requests" }, webhook: { url: "/api/payments/webhooks/momo", signature: "valid", lastReceivedAt: at(-0.2) } }),
  integ({ key: "airtel-money", name: "Airtel Money", group: "payments", env: "production", configured: true, test: [-6, true, "Collection request 200"], errorRate1h: 0.02, webhook: { url: "/api/payments/webhooks/airtel", signature: "valid", lastReceivedAt: at(-3) } }),
  integ({ key: "flutterwave", name: "Flutterwave", group: "payments", env: "sandbox", configured: true, test: [-30, true, "Sandbox charge ok"], errorRate1h: 0, webhook: { url: "/api/payments/webhooks/flutterwave", signature: "valid", lastReceivedAt: at(-30) } }),
  integ({ key: "bank-transfer", name: "Bank transfer (BK)", group: "payments", env: "production", configured: true, test: [-48, true, "Statement import parsed"], errorRate1h: 0 }),
  integ({ key: "whatsapp", name: "WhatsApp Business Cloud API", group: "messaging", env: "production", configured: true, test: [-1, true, "Template send 200"], errorRate1h: 0.02, usage: { used: 6120, limit: 10_000, unit: "messages" }, webhook: { url: "/api/notifications/webhooks/whatsapp", signature: "valid", lastReceivedAt: at(-0.1) }, fallback: ["whatsapp", "sms", "email"] }),
  integ({ key: "sms", name: "SMS gateway", group: "messaging", env: "production", configured: true, test: [-2, true, "Test SMS delivered"], errorRate1h: 0.06, usage: { used: 3310, limit: 5000, unit: "messages" }, fallback: ["sms", "email"] }),
  integ({ key: "resend", name: "Resend email", group: "messaging", env: "production", configured: true, test: [-4, true, "Test email delivered"], errorRate1h: 0.004, usage: { used: 12_400, limit: 50_000, unit: "messages" } }),
  integ({ key: "anthropic", name: "Anthropic (AI assistant)", group: "ai", env: "production", configured: true, test: [-8, true, "Messages API 200"], errorRate1h: 0.01, usage: { used: 182_000, limit: 250_000, unit: "rwf" } }),
  integ({ key: "ga4", name: "Google Analytics 4", group: "ai", env: "production", configured: true, test: [-72, true, "Measurement ID valid"], errorRate1h: 0 }),
  integ({ key: "search-console", name: "Google Search Console", group: "ai", env: "production", configured: true, test: [-120, true, "Property verified"], errorRate1h: 0 }),
  integ({ key: "google-ads", name: "Google Ads", group: "ai", env: "sandbox", configured: false, test: null, errorRate1h: 0 }),
  integ({ key: "e-signature", name: "e-Signature", group: "identity", env: "sandbox", configured: true, test: [-200, true, "Envelope created"], errorRate1h: 0, rotated: 3 }),
  integ({ key: "id-verification", name: "ID verification", group: "identity", env: "sandbox", configured: true, test: null, errorRate1h: 0 }),
  integ({ key: "sentry", name: "Sentry", group: "platform", env: "production", configured: true, test: [-24, true, "Test event received"], errorRate1h: 0 }),
  integ({ key: "uptime", name: "Uptime monitor", group: "platform", env: "production", configured: true, test: [-1, true, "Heartbeat ok"], errorRate1h: 0 }),
  integ({ key: "r2", name: "R2 storage", group: "platform", env: "production", configured: true, test: [-12, true, "Put/Get round-trip ok"], errorRate1h: 0 }),
  integ({ key: "backup-bucket", name: "Off-site backup bucket", group: "platform", env: "production", configured: true, test: [-1, true, "Last upload verified"], errorRate1h: 0 }),
];
export const integrationOf = (key: string) => INTEGRATIONS.find((i) => i.key === key);
export const refreshHealth = (i: IntegrationVM) => { i.health = health(i); return i; };

// ---------------------------------------------------------------- notifications (U14) — 8 events
const tpl = (key: string, event: string, channel: TemplateVM["channel"], ownerKind: TemplateVM["ownerKind"], category: TemplateVM["category"], bodies: Partial<Record<"rw" | "en" | "fr", string>>, schema: TemplateVM["variablesSchema"], status: TemplateVM["versions"][number]["status"] = "active"): TemplateVM => ({
  key, event, channel, ownerKind, category, variablesSchema: schema,
  versions: [{ v: 1, status, editedBy: ownerKind === "security" ? PEOPLE.innocent.name : PEOPLE.diane.name, editedAt: at(-40 * 24), approvedBy: status === "active" ? PEOPLE.innocent.name : undefined, approvedAt: status === "active" ? at(-39 * 24) : undefined,
    languages: { rw: bodies.rw ? { body: bodies.rw } : null, en: bodies.en ? { body: bodies.en } : null, fr: bodies.fr ? { body: bodies.fr } : null } }],
});
export const TEMPLATES: TemplateVM[] = [
  tpl("auth.otp", "auth.otp", "sms", "security", "authentication", { rw: "HEBUZA: kode yawe ni {{code}}. Ntuyihe undi muntu.", en: "HEBUZA: your code is {{code}}. Never share it.", fr: "HEBUZA : votre code est {{code}}. Ne le partagez jamais." }, { code: "code" }),
  tpl("security.new_device_login", "auth.unusual_login", "whatsapp", "security", "utility", {}, { "1": "string", "2": "date" }, "draft"),
  tpl("security.new_device_login.email", "auth.unusual_login", "email", "security", "utility", { rw: "Twabonye kwinjira gushya kuri {{1}} saa {{2}}.", en: "We saw a new sign-in on {{1}} at {{2}}.", fr: "Nouvelle connexion sur {{1}} à {{2}}." }, { "1": "string", "2": "date" }),
  tpl("access.role_granted", "access.role.granted", "email", "security", "utility", { rw: "Wahawe uruhare {{role}}.", en: "You were granted the {{role}} role.", fr: "Le rôle {{role}} vous a été attribué." }, { role: "string" }),
  tpl("auth.mfa_reset", "auth.mfa.reset", "email", "security", "utility", { rw: "Kwemeza kwawe kwasubijwe. Injira ushyireho igikoresho gishya.", en: "Your sign-in verification was reset. Sign in to set up a new device.", fr: "Votre vérification a été réinitialisée. Connectez-vous pour configurer un nouvel appareil." }, {}),
  tpl("case.payment_confirmed", "fin.payment.confirmed", "whatsapp", "operational", "utility", { rw: "Twakiriye ubwishyu bwa {{1}} kuri {{2}}.", en: "We received {{1}} for {{2}}.", fr: "Nous avons reçu {{1}} pour {{2}}." }, { "1": "money", "2": "ref" }),
  tpl("case.documents_requested", "case.documents_requested", "sms", "operational", "utility", { rw: "HEBUZA: dukeneye inyandiko kuri {{ref}}. Fungura: {{secure_link}}", en: "HEBUZA: we need documents for {{ref}}. Open: {{secure_link}}" }, { ref: "ref", secure_link: "secure_link" }),
  tpl("mkt.monthly_tips", "mkt.newsletter", "email", "marketing", "marketing", { rw: "Inama z'uku kwezi.", en: "This month's tax tips.", fr: "Conseils fiscaux du mois." }, {}),
];
export const templateOf = (key: string) => TEMPLATES.find((t) => t.key === key);
const rule = (event: string, o: Partial<EventRuleVM>): EventRuleVM => ({ event, critical: false, security: false, priority: "normal", channels: { inapp: true, email: true, whatsapp: false, sms: false }, chain: ["email"], quietHours: "defer", ...o });
export const EVENT_RULES: EventRuleVM[] = [
  rule("auth.otp", { critical: true, security: true, priority: "critical", channels: { inapp: false, email: false, whatsapp: false, sms: true }, chain: ["sms", "email"], quietHours: "send" }),
  rule("auth.unusual_login", { critical: true, security: true, priority: "high", quietHours: "send" }),
  rule("auth.mfa.reset", { critical: true, security: true, priority: "high", quietHours: "send" }),
  rule("access.role.granted", { security: true, priority: "high" }),
  rule("case.documents_requested", { channels: { inapp: true, email: true, whatsapp: true, sms: true }, chain: ["whatsapp", "sms", "email"] }),
  rule("fin.payment.confirmed", { channels: { inapp: true, email: true, whatsapp: true, sms: false }, chain: ["whatsapp", "email"] }),
  rule("case.reminder", { channels: { inapp: true, email: true, whatsapp: true, sms: true }, chain: ["whatsapp", "sms", "email"], priority: "low" }),
  rule("mkt.newsletter", { priority: "low", channels: { inapp: false, email: true, whatsapp: false, sms: false } }),
];
const r = rng(7);
export const DELIVERIES: DeliveryVM[] = Array.from({ length: 60 }, (_, i): DeliveryVM => {
  const t = TEMPLATES[Math.floor(r() * TEMPLATES.length)];
  const roll = r();
  const status: DeliveryVM["status"] = roll < 0.06 ? "failed" : roll < 0.1 ? "deferred" : roll < 0.12 && t.category === "marketing" ? "capped" : roll < 0.5 ? "read" : "delivered";
  return {
    id: `DLV-${String(9000 + i)}`, at: at(-i * 0.7), event: t.event, channel: t.channel, to: t.channel === "email" ? "a•••@example.rw" : "+250 7•• ••• 1•5",
    status, fallbackTo: status === "failed" && t.channel === "whatsapp" ? "sms" : undefined, costRwf: t.channel === "whatsapp" ? 45 : t.channel === "sms" ? 15 : 0, templateKey: t.key, lang: (["rw", "en", "fr"] as const)[i % 3],
  };
});
/** PLACEHOLDER(channel-budgets) RWF / month. */
export const BUDGETS: BudgetVM[] = [
  { channel: "whatsapp", budget: 400_000, spent: 275_400, marketingSpent: 0 },
  { channel: "sms", budget: 150_000, spent: 124_650, marketingSpent: 0 },
  { channel: "ai", budget: 250_000, spent: 182_000, marketingSpent: 0 },
  { channel: "email", budget: 60_000, spent: 9_300, marketingSpent: 2_100 },
];

// ---------------------------------------------------------------- privacy (U15)
export const PROCESSORS: ProcessorVM[] = [
  { id: "prc-railway", name: "Railway", purpose: "Application & database hosting", data: ["Account", "Case data", "Documents metadata"], location: "EU (PLACEHOLDER)", dpaSignedAt: at(-200 * 24), reviewDue: at(165 * 24), placeholder: true },
  { id: "prc-r2", name: "Cloudflare R2", purpose: "Document storage, backups", data: ["Documents", "Backups"], location: "EU (PLACEHOLDER)", dpaSignedAt: at(-200 * 24), reviewDue: at(165 * 24), placeholder: true },
  { id: "prc-flutterwave", name: "Flutterwave", purpose: "Card payments", data: ["Name", "Phone", "Amount"], location: "NG (PLACEHOLDER)", dpaSignedAt: null, reviewDue: at(20 * 24), placeholder: true },
  { id: "prc-mtn", name: "MTN Rwanda (MoMo)", purpose: "Mobile money collections", data: ["Phone", "Amount"], location: "RW (PLACEHOLDER)", dpaSignedAt: at(-90 * 24), reviewDue: at(275 * 24), placeholder: true },
  { id: "prc-meta", name: "Meta (WhatsApp Business)", purpose: "Notifications & chat", data: ["Phone", "Message content"], location: "US/EU (PLACEHOLDER)", dpaSignedAt: at(-150 * 24), reviewDue: at(215 * 24), placeholder: true },
  { id: "prc-anthropic", name: "Anthropic", purpose: "AI assistant", data: ["Conversation text (no documents)"], location: "US (PLACEHOLDER)", dpaSignedAt: at(-60 * 24), reviewDue: at(305 * 24), placeholder: true },
];
export const RETENTION: RetentionRow[] = RETENTION_POLICY.map((p, i) => ({ ...p, lastRunAt: at(-(i % 4) * 24 - 2), due: [12, 3, 0, 0, 41, 7, 19, 230, 1450, 0, 2][i] ?? 0 }));
const aline = CLIENTS[0];
export const DSRS: DsrVM[] = [
  { id: "DSR-2026-014", type: "erasure", subjectNo: "HBZ-C-000101", receivedAt: at(-9 * 24), dueAt: dsrDue(at(-9 * 24)), status: "in_progress", legalHold: CASES.some((c) => c.clientId === aline.id && c.status === "refund_requested"), verification: "Signed in + OTP to number on file", plan: erasurePlan("erasure", at(-9 * 24)) },
  { id: "DSR-2026-015", type: "export", subjectNo: "HBZ-C-000103", receivedAt: at(-2 * 24), dueAt: dsrDue(at(-2 * 24)), status: "verifying", legalHold: false, plan: [] },
];

// ---------------------------------------------------------------- operations (U16)
export const COMPONENTS: ComponentHealthVM[] = [
  { key: "api", name: "API", health: "operational", detail: "p95 142 ms", checkedAt: at(-0.02) },
  { key: "worker", name: "Worker heartbeat", health: "operational", detail: "Last beat 20 s ago", checkedAt: at(-0.01) },
  { key: "db", name: "Database", health: "operational", detail: "Connections 18 / 100", checkedAt: at(-0.02) },
  { key: "redis", name: "Redis", health: "operational", detail: "Memory 31%", checkedAt: at(-0.02) },
  { key: "storage", name: "Storage (R2)", health: "operational", detail: "Put/Get ok", checkedAt: at(-0.2) },
  { key: "queues", name: "Queues", health: "degraded", detail: "sms queue backlog 42", checkedAt: at(-0.05) },
];
export const P95_MS = Array.from({ length: 48 }, (_, i) => Math.round(120 + 40 * Math.sin(i / 5) + (i % 7 === 3 ? 90 : 0)));
export const UPTIME_90 = Array.from({ length: 90 }, (_, i) => ({ date: at(-(89 - i) * 24).slice(0, 10), up: i === 61 ? 0.982 : i === 30 ? 0.996 : 1 }));
export const BACKUPS: BackupVM[] = Array.from({ length: 48 }, (_, i): BackupVM => ({
  id: `bk-${i}`, tier: i % 24 === 0 ? "daily" : "hourly", at: at(-i - 0.25), sizeMb: 1840 + i * 3, ok: i !== 17, encrypted: true, location: "Off-site bucket (age)",
}));
export const DRILLS: DrillVM[] = [{ id: "DR-2026-01", at: at(-21 * 24), type: "staging", rtoMinutes: 96, ok: true, reportBy: PEOPLE.innocent.name }];
export const INCIDENTS: IncidentVM[] = [{
  id: `INC-${YEAR}-007`, title: "SMS delivery delays", sev: 3, status: "resolved", components: ["queues", "sms"], startedAt: at(-6 * 24 - 5), resolvedAt: at(-6 * 24 - 2), impact: "OTP SMS delayed up to 9 minutes for ~120 users; email fallback worked.",
  timeline: [
    { at: at(-6 * 24 - 5), by: PEOPLE.innocent.name, text: "Opened from integration.degraded alert." },
    { at: at(-6 * 24 - 4.5), by: PEOPLE.innocent.name, text: "Gateway confirmed carrier congestion; fallback to email verified." },
    { at: at(-6 * 24 - 2), by: PEOPLE.yvonne.name, text: "Delivery normal for 30 min. Resolved." },
  ],
  postmortem: { dueAt: postmortemDue(at(-6 * 24 - 2)), actions: [{ text: "Alert at 5% error rate instead of 10%", owner: PEOPLE.innocent.name, done: false }] },
  version: 3,
}];
export const DEPENDENCIES: DependencyVM[] = [
  ["next", "16.0.1", "16.0.3", "security", ["CVE-2026-1182"]], ["react", "19.2.0", "19.2.1", "minor", []], ["msw", "2.11.0", "2.11.4", "minor", []],
  ["@tanstack/react-query", "5.90.1", "5.90.5", "minor", []], ["openapi-fetch", "0.14.0", "0.15.0", "minor", []], ["tailwindcss", "4.1.11", "4.1.14", "minor", []],
  ["undici", "6.21.0", "6.21.3", "security", ["CVE-2026-0742"]], ["vitest", "3.2.4", "3.2.6", "minor", []], ["@playwright/test", "1.55.0", "1.56.1", "minor", []],
  ["typescript", "5.9.2", "5.9.3", "minor", []],
].map(([pkg, from, to, type, cves], i) => ({ id: `dep-${i}`, pkg: pkg as string, from: from as string, to: to as string, type: type as DependencyVM["type"], mergedAt: at(-(i * 4 + 1) * 24), cves: cves as string[] }));
// shortcut: posture "encryption" rows are declared from security §8, not measured; measure when backend exposes /health/security.
export const POSTURE: PostureVM[] = [
  { id: "hsts", label: "HSTS", status: "pass", detail: "max-age=63072000; includeSubDomains; preload", source: "next.config.ts" },
  { id: "csp", label: "Content-Security-Policy", status: "warn", detail: "Report-only (enforce at Stage 15)", source: "next.config.ts" },
  { id: "coop", label: "COOP / CORP", status: "fail", detail: "Not sent yet (plan §10.4)", source: "next.config.ts" },
  { id: "permissions", label: "Permissions-Policy", status: "pass", detail: "camera=(self), geolocation=(self), microphone=(self)", source: "next.config.ts" },
  { id: "tls", label: "TLS 1.2+", status: "pass", detail: "Declared", source: "security §8" },
  { id: "enc-rest", label: "Encryption at rest", status: "pass", detail: "Declared (provider-managed)", source: "security §8" },
  { id: "malware", label: "Upload malware scanning", status: "warn", detail: "Not live until backend scanner ships", source: "security §2 V12" },
  { id: "mfa", label: "Staff MFA coverage", status: "pass", detail: "", source: "IAM F-IAM-05" },
  { id: "webauthn", label: "Admins with a security key", status: "warn", detail: "", source: "IAM F-IAM-06" },
  { id: "cves", label: "Open critical CVEs", status: "pass", detail: "0 open", source: "Dependency log" },
  { id: "gitleaks", label: "Secret scanning in CI", status: "pass", detail: "gitleaks on every PR", source: ".github/workflows" },
];

// ---------------------------------------------------------------- settings values (U12)
export const SETTING_VALUES: Record<string, SettingValueVM> = Object.fromEntries(
  SETTING_DEFS.map((d) => [d.key, { key: d.key, value: d.default, changedBy: d.type === "readonly" ? null : PEOPLE.innocent.name, changedAt: d.type === "readonly" ? null : at(-30 * 24) }]),
);
export let SETTINGS_VERSION = 1;
export const bumpSettings = () => ++SETTINGS_VERSION;

// ---------------------------------------------------------------- scenarios (dev "Simulate")
export type Scenario = "normal" | "fresh" | "outage" | "tampered";
export const WORLD = { scenario: "normal" as Scenario, env: "production" as SystemSummary["env"] };

// ---------------------------------------------------------------- audit (§2.9): one chain over seed + every shared audit() event
type Meta = Pick<AuditEntryVM, "actorId" | "actorRole" | "impersonatorId" | "category" | "breakGlass" | "approvalRef" | "batchId"> & { userAgent?: string };
const META = new Map<string, Meta>();
/** Write one catalogue event (also visible to every other workspace through the shared store). Call only after guards pass. */
export function record(code: AuditCode, kind: string, id: string, before?: unknown, after?: unknown, reason?: string, by: PersonRef & { roles?: Role[] } = actor(), extra: Partial<Meta> = {}) {
  const ev = audit({ actor: by.name, action: code, entity: { kind, id }, before, after, reason });
  META.set(ev.id, {
    actorId: by.id, actorRole: by.roles?.[0] ?? (by.id === "system" ? "system" : "staff:sysadmin"), impersonatorId: IMPERSONATION.current ? IMPERSONATION.current.by.id : null,
    category: AUDIT_CATALOGUE[code], breakGlass: BREAK_GLASS.state === "active" || undefined, ...extra,
  });
  return ev;
}

const SEED_CODES: AuditCode[] = ["access.role.granted", "config.setting.changed", "auth.session.revoked", "access.user.invited", "config.template.changed", "data_export.report.exported", "document_access.document.downloaded", "config.integration.tested", "auth.mfa.backup_codes_regenerated", "access.review.item_decided", "system.backup.completed", "config.flag.changed"];
const SEED_ACTORS = [PEOPLE.innocent, PEOPLE.yvonne, PEOPLE.diane, PEOPLE.alice, PEOPLE.patrick];
const seedRows: Omit<AuditEntryVM, "hash" | "prevHash">[] = (() => {
  const g = rng(42);
  return Array.from({ length: 300 }, (_, i) => {
    const code = SEED_CODES[Math.floor(g() * SEED_CODES.length)];
    const who = code === "system.backup.completed" ? PEOPLE.system : SEED_ACTORS[Math.floor(g() * SEED_ACTORS.length)];
    const target = USERS[Math.floor(g() * USERS.length)];
    const resource: [string, string] = code.startsWith("config.setting") ? ["setting", SETTING_DEFS[Math.floor(g() * 10)].key]
      : code.startsWith("config.template") ? ["template", TEMPLATES[Math.floor(g() * TEMPLATES.length)].key]
      : code.startsWith("config.integration") ? ["integration", INTEGRATIONS[Math.floor(g() * INTEGRATIONS.length)].key]
      : code.startsWith("document_access") ? ["case", CASES[Math.floor(g() * CASES.length)].ref]
      : code.startsWith("system") ? ["backup", `bk-${i}`] : ["user", target.id];
    return {
      id: `AUD-S${String(i + 1).padStart(5, "0")}`, at: new Date(NOW - (30 * D) + (i * 30 * D) / 300).toISOString(),
      actorId: who.id, actorLabel: who.name, actorRole: who.id === "system" ? "system" : who === PEOPLE.diane ? "staff:service_manager" : who === PEOPLE.alice ? "staff:executive" : who === PEOPLE.patrick ? "staff:finance" : "staff:sysadmin",
      impersonatorId: null, category: AUDIT_CATALOGUE[code], action: code, resourceType: resource[0], resourceId: resource[1],
      details: code === "config.setting.changed" ? { before: { value: 30 }, after: { value: 20 } } : code === "access.role.granted" ? { after: { role: "staff:agent" } } : {},
      ip: `41.186.${20 + (i % 9)}.${(i * 37) % 250}`, userAgent: "Chrome 141 · Windows", requestId: `req_${(i * 7919).toString(36)}`, sessionId: `ses_${(i % 23).toString(36)}`,
    };
  });
})();
const fromShared = (e: AuditEvent): Omit<AuditEntryVM, "hash" | "prevHash"> => {
  const m = META.get(e.id);
  return {
    id: e.id, at: e.at, actorId: m?.actorId ?? null, actorLabel: e.actor, actorRole: m?.actorRole ?? "staff", impersonatorId: m?.impersonatorId ?? null,
    category: m?.category ?? categoryOf(e.action), action: e.action, resourceType: e.entity.kind, resourceId: e.entity.id,
    details: { before: e.before, after: e.after, reason: e.reason }, ip: e.ip, userAgent: m?.userAgent ?? "Mock browser", requestId: `req_${e.id}`, sessionId: "ses_current",
    breakGlass: m?.breakGlass, approvalRef: m?.approvalRef, batchId: m?.batchId,
  };
};
const CHAIN: AuditEntryVM[] = [];
let chaining: Promise<void> | null = null;
/** Oldest → newest, hashed incrementally (append-only). Lazy: first audit read pays the WebCrypto cost. */
export async function auditChain(): Promise<AuditEntryVM[]> {
  await (chaining ??= (async () => {
    const shared = [...auditAll()].reverse(); // oldest first
    const all = [...seedRows, ...shared.map(fromShared)];
    for (let i = CHAIN.length; i < all.length; i++) {
      const prevHash = CHAIN.at(-1)?.hash ?? GENESIS;
      const row = { ...all[i], prevHash };
      CHAIN.push({ ...row, hash: await hashRow(row) });
    }
  })().finally(() => (chaining = null)));
  if (WORLD.scenario === "tampered") return CHAIN.map((r, i) => (i === 120 ? { ...r, details: { ...r.details, after: { value: 45 } } } : r));
  return CHAIN;
}
export const LAST_VERIFY = { report: null as Awaited<ReturnType<typeof verifyChain>> | null };
export async function verifyNow() {
  LAST_VERIFY.report = await verifyChain(await auditChain(), new Date().toISOString());
  return LAST_VERIFY.report;
}

// ---------------------------------------------------------------- shell: alerts, setup, summary
export const ALERTS: AlertVM[] = [
  { id: "al-1", kind: "integrations", code: "integration.degraded", title: "SMS gateway degraded", detail: "Error rate 6%", at: at(-0.3), href: "/system/integrations/sms", read: false, tone: "warning" },
  { id: "al-2", kind: "ops", code: "backup.completed", title: "Backup succeeded", at: at(-0.25), href: "/system/ops?tab=backups", read: false, tone: "success" },
  { id: "al-3", kind: "security", code: "auth.unusual_login", title: "Unusual login", detail: `${persona("finance").name} · new device · Musanze`, at: at(-12.5), href: `/system/users/${pid("finance")}?tab=sessions`, read: false, tone: "info" },
  { id: "al-4", kind: "security", code: "access.role.granted", title: "Privileged role granted", detail: AGENT_ME.name, at: at(-26), href: "/system/audit?category=access_control", read: false, tone: "info" },
  { id: "al-5", kind: "security", code: "iam.access_review.due", title: "Access review due in 7 days", detail: `${REVIEWS[0].items.length} roles`, at: at(-30), href: `/system/access-reviews/${REVIEWS[0].id}`, read: false, tone: "warning" },
  { id: "al-6", kind: "ops", code: "ntf.budget_alert", title: "SMS budget at 83%", at: at(-40), href: "/system/notifications?tab=costs", read: true, tone: "warning" },
];

export function setupItems(): SetupItem[] {
  const fresh = WORLD.scenario === "fresh";
  const sysadmins = USERS.filter((u) => u.status === "active" && !u.isBootstrap && u.roles.some((g) => g.role === "staff:sysadmin")).length;
  const bootstrap = USERS.find((u) => u.isBootstrap);
  const drill = DRILLS.some((d) => d.ok);
  return [
    { key: "two_sysadmins", done: !fresh && sysadmins >= 2, href: "/system/users?dialog=invite" },
    { key: "bootstrap_disabled", done: !fresh && bootstrap?.status === "deactivated", href: "/system/users?tab=service" },
    { key: "legacy_split", done: !fresh && !USERS.some((u) => u.status === "active" && u.roles.some((g) => g.role === "staff:admin")), href: "/system/users?tab=service" },
    { key: "mfa_enforced", done: true, href: "/system/settings/security" },
    { key: "email_tested", done: !fresh && !!integrationOf("resend")?.lastTest?.ok, href: "/system/integrations/resend" },
    { key: "payments_sandbox", done: !fresh && !!integrationOf("mtn-momo")?.lastTest?.ok, href: "/system/integrations/mtn-momo" },
    { key: "domain_tls", done: !fresh, href: "/system/ops?tab=security" },
    { key: "backups_drill", done: !fresh && drill, href: "/system/ops?tab=backups" },
  ];
}

export function summary(): SystemSummary {
  sweepChanges();
  const me = actor();
  return {
    approvals: CHANGES.filter((c) => c.state === "proposed" && c.proposedBy.id !== me.id).length,
    identity: IDENTITY.filter((i) => i.status === "pending" || i.status === "in_review").length,
    reviewsDue: REVIEWS.filter((c) => c.status === "open" || c.status === "overdue").length,
    degraded: INTEGRATIONS.filter((i) => i.health === "degraded" || i.health === "down").length,
    untested: INTEGRATIONS.filter((i) => i.health === "untested").length,
    alertsUnread: ALERTS.filter((a) => !a.read).length,
    setupIncomplete: setupItems().filter((s) => !s.done).length,
    breakGlass: BREAK_GLASS.state, breakGlassUntil: BREAK_GLASS.activeUntil ?? null,
    impersonation: IMPERSONATION.current,
    maintenance: { on: SETTING_VALUES["maintenance.on"].value === true, message: SETTING_VALUES["maintenance.message"].value as SystemSummary["maintenance"]["message"], until: (SETTING_VALUES["maintenance.window"].value as { end: string } | null)?.end ?? null },
    env: WORLD.env, me: { id: me.id, name: me.name, roles: me.roles },
  };
}

/** Invitation bookkeeping shared by lane B + approvals apply (72 h, single-use). */
export const inviteExpiry = (from = Date.now()) => new Date(from + INVITE_TTL_MS).toISOString();

// Mirror of server/src/domain/auth/permissions.ts — UI display only; the server enforces.
// Permission matrix — spec/02-stakeholders-and-roles.md §3, encoded as data.
// UI hint only (hide/disable); the API is the authority (spec/02 §4.1 deny-by-default).
import type { Role } from "@/shared/auth/roles";

/** all = every record · own = owned/assigned · org = orgs I represent · scoped = fields/records shared with my assignment. */
export type Scope = "all" | "own" | "org" | "scoped";
type K = "VIS" | "CLI" | "AGT" | "EXT" | "SM" | "FIN" | "MKT" | "PRC" | "PM" | "EXE" | "SYS";
type Row = Partial<Record<K, Scope>>;

const KEY: Record<Role, K> = {
  visitor: "VIS", client: "CLI", "staff:agent": "AGT", "ext:agent": "EXT",
  "staff:service_manager": "SM", "staff:finance": "FIN", "staff:marketing": "MKT",
  "staff:procurement": "PRC", "staff:partner_manager": "PM", "staff:executive": "EXE", "staff:sysadmin": "SYS",
};
const STAFF_ALL: Row = { AGT: "all", EXT: "all", SM: "all", FIN: "all", MKT: "all", PRC: "all", PM: "all", EXE: "all", SYS: "all" };
const EVERYONE: Row = { VIS: "all", CLI: "all", ...STAFF_ALL };
const OWN_ALL: Row = { CLI: "own", AGT: "own", EXT: "own", SM: "own", FIN: "own", MKT: "own", PRC: "own", PM: "own", EXE: "own", SYS: "own" };

export const MATRIX = {
  // §3.1 Catalogue, requests, deliverables, assignment
  "cat.published.read": EVERYONE,
  "cat.draft.edit": { SM: "all", MKT: "all" /* copy/SEO only */ },
  "cat.draft.publish": { SM: "all" },
  "cat.draft.read": { FIN: "all", EXE: "all", SYS: "all" },
  "cat.price.read": { VIS: "all", CLI: "all", AGT: "all", EXT: "own", SM: "all", FIN: "all", EXE: "all" },
  "cat.price.edit": { SM: "all", FIN: "all" },
  "cat.price.approve": { FIN: "all" },
  "req.submit": { VIS: "own", CLI: "own", SM: "all" },
  "req.case.read": { VIS: "own", CLI: "org", AGT: "own", EXT: "scoped", SM: "all", FIN: "all", EXE: "all" },
  /** Stage 6 split (plan 06 §13): sysadmin sees case metadata only (ref, status, timestamps), never content (spec/02 §4.1). */
  "req.case.meta": { SM: "all", EXE: "all", SYS: "all" },
  "req.status.update": { CLI: "own" /* cancel pre-work */, AGT: "own", EXT: "scoped", SM: "all" },
  "req.status.reject": { SM: "all" },
  "req.intake.review": { SM: "all" },
  "req.substatus.configure": { SM: "all", SYS: "all" },
  "req.outcome.read": { CLI: "own", EXE: "all" },
  "req.outcome.update": { AGT: "own", EXT: "scoped", SM: "all" },
  "dlv.upload": { AGT: "own", EXT: "scoped", SM: "all" },
  "dlv.review": { AGT: "own" /* designated reviewer, not own work */, SM: "all" },
  "dlv.download": { CLI: "own", AGT: "own", EXT: "scoped", SM: "all" },
  "asn.assign": { SM: "all" },
  "asn.offer.respond": { AGT: "own", EXT: "own" },
  "asn.workload.read": { AGT: "own", EXT: "own", SM: "all", EXE: "all" },

  // §3.2 Client data, documents, communications
  "clp.profile.own": OWN_ALL,
  "clp.profiles.read": { AGT: "scoped", EXT: "scoped", SM: "all", FIN: "scoped", MKT: "scoped", SYS: "scoped" },
  "clp.profiles.update": { SM: "all" },
  "org.manage": { CLI: "org", SM: "all" },
  "org.read": { CLI: "org", AGT: "scoped", EXT: "scoped", SM: "all", FIN: "scoped" },
  "doc.library": { CLI: "org" },
  "doc.library.read": { SM: "scoped" },
  "doc.case.upload": { VIS: "own", CLI: "own", AGT: "own", EXT: "scoped", SM: "all" },
  "doc.case.qc": { AGT: "own", EXT: "scoped", SM: "all" },
  "doc.case.delete": { CLI: "own", SM: "all" },
  "msg.client.lane": { CLI: "own", AGT: "own", EXT: "scoped", SM: "all" },
  "msg.team.lane": { AGT: "own", EXT: "scoped", SM: "all" },
  "msg.internal.lane": { AGT: "own", SM: "all" },
  "msg.console": { SM: "all" },
  "msg.transcript.export": { SM: "all" },
  "msg.templates.manage": { SM: "all" },
  "msg.templates.personal": { AGT: "own" },
  "ntf.own": OWN_ALL,
  "ntf.templates.service": { SM: "all" },
  "ntf.templates.marketing": { MKT: "all" },
  "ntf.rules.configure": { SYS: "all" },
  "bkg.book": { VIS: "own", CLI: "own", SM: "all" },
  "bkg.read": { MKT: "all" },
  "bkg.calendar": { AGT: "own", EXT: "own", SM: "all" },
  "fbk.ticket.create": { VIS: "own", CLI: "own", SM: "all" },
  "fbk.ticket.read": { CLI: "own", AGT: "own", EXT: "own", SM: "all", FIN: "scoped", MKT: "all", EXE: "all" },
  "fbk.ticket.resolve": { SM: "all" },
  "fbk.rating.create": { CLI: "own" },
  "fbk.rating.read": { AGT: "own", EXT: "own", SM: "all", MKT: "all", EXE: "all" },
  "fbk.rating.moderate": { SM: "all" },
  "fbk.testimonial.publish": { MKT: "all" },
  "aia.assistant.use": { VIS: "all", CLI: "all", AGT: "all", EXT: "all", SM: "all" },
  "aia.kb.edit": { SM: "all", MKT: "all" },
  "aia.kb.approve": { SM: "all" },
  "aia.logs.read": { CLI: "own", SM: "scoped", MKT: "scoped" },

  // §3.3 Workforce, money, procurement, partners
  "wrk.profile.own": { AGT: "own", EXT: "own", SM: "own" },
  "wrk.profiles.manage": { SM: "all", SYS: "all" },
  "wrk.profiles.verify": { SM: "all" },
  "wrk.profiles.read": { FIN: "scoped", EXE: "all" },
  "wrk.profiles.deactivate": { SYS: "all" },
  "wrk.contracts.read": { AGT: "own", EXT: "own", SM: "all", FIN: "all", PRC: "all", EXE: "all" },
  "wrk.contracts.sign": { AGT: "own", EXT: "own" },
  "wrk.contracts.manage": { SM: "all" },
  "wrk.field.visits": { AGT: "own", EXT: "own", SM: "all" },
  "wrk.expense.claim": { AGT: "own", EXT: "own" },
  "wrk.expense.approve1": { SM: "all" },
  "wrk.expense.approve2": { FIN: "all" },
  "fin.quote.read": { CLI: "org", EXE: "all" },
  "fin.quote.respond": { CLI: "org" },
  "fin.quote.draft": { AGT: "own", EXT: "own", SM: "all", FIN: "all" },
  "fin.quote.send": { SM: "all", FIN: "all" },
  "fin.invoice.read": { CLI: "org", AGT: "own", SM: "all", FIN: "all", EXE: "all" },
  "fin.invoice.manage": { FIN: "all" },
  "fin.payment.initiate": { VIS: "own", CLI: "org" },
  "fin.payment.manual.make": { FIN: "all" },
  "fin.payment.manual.check": { FIN: "all", EXE: "all" },
  "fin.reconcile": { FIN: "all" },
  "fin.reconcile.read": { EXE: "all" },
  "rfd.request": { CLI: "own", SM: "all" },
  "rfd.approve1": { SM: "all" },
  "rfd.approve2": { FIN: "all" },
  "rfd.approve.exec": { EXE: "all" },
  "rfd.execute": { FIN: "all" },
  "rev.allocations.read": { AGT: "own", EXT: "own", SM: "all", FIN: "all", EXE: "all" },
  "rev.allocations.review": { SM: "all" },
  "rev.allocations.adjust": { FIN: "all" },
  "rev.rules.read": { AGT: "own", EXT: "own", SM: "all" },
  "rev.rules.propose": { FIN: "all" },
  "rev.rules.approve": { EXE: "all" },
  "rev.payouts.read": { AGT: "own", EXT: "own" },
  "rev.payouts.manage": { FIN: "all" },
  "rev.payouts.approve": { FIN: "all", EXE: "all" },
  "sub.plans.read": { VIS: "all", CLI: "all", SM: "all", EXE: "all" },
  "sub.plans.manage": { FIN: "all" },
  "sub.plans.copy": { MKT: "all" },
  "sub.client.own": { CLI: "own" },
  "sub.client.read": { AGT: "own", MKT: "all", EXE: "all" },
  "sub.client.manage": { SM: "all", FIN: "all" },
  "cal.obligations.read": { CLI: "own", EXE: "all" },
  "cal.obligations.update": { CLI: "own", AGT: "own", EXT: "scoped", SM: "all" },
  "sup.manage": { PRC: "all" },
  "sup.read": { FIN: "all", EXE: "all" },
  "sup.pay": { FIN: "all" },
  "sup.bank.request": { PRC: "all" },
  "sup.bank.verify": { FIN: "all" },
  "sup.purchase.request": { AGT: "own", SM: "own", MKT: "own", PM: "own", PRC: "all" },
  "sup.purchase.approve": { FIN: "all", EXE: "all" },
  "prt.manage": { PM: "all" },
  "prt.read": { SM: "all", FIN: "scoped", MKT: "all", EXE: "all" },
  "prt.actions.read": { AGT: "own", SM: "all", MKT: "all", EXE: "all" },

  // §3.4 Marketing, reporting, platform
  "cms.read": EVERYONE,
  "cms.manage": { MKT: "all" },
  "cms.draft": { SM: "scoped", PM: "scoped" },
  "cms.publish": { MKT: "all" },
  "cms.legal.edit": { MKT: "all" },
  "cms.legal.approve": { EXE: "all", SYS: "all" },
  "crm.leads.create": { VIS: "own" },
  "crm.leads.read": { AGT: "own", SM: "all", MKT: "all", PM: "all", EXE: "all" },
  "crm.leads.manage": { SM: "all", MKT: "all" },
  "crm.campaigns.manage": { MKT: "all" },
  "crm.campaigns.approve": { MKT: "all", EXE: "all" },
  "rpt.own": { CLI: "own", ...STAFF_ALL },
  "rpt.financial": { AGT: "own", EXT: "own", SM: "scoped", FIN: "all", PRC: "scoped", PM: "scoped", EXE: "all" },
  "rpt.operations": { AGT: "own", EXT: "own", SM: "all", EXE: "all" },
  "rpt.marketing": { MKT: "all", EXE: "all" },
  "aud.read": { SM: "scoped", FIN: "scoped", EXE: "all", SYS: "all" },
  "aud.export": { SYS: "all" },
  "set.operational": { SM: "all" },
  "set.tax": { FIN: "all" },
  "set.approve": { EXE: "all" },
  "set.configure": { SYS: "all" },
  "set.integrations": { SYS: "all" },
  "set.analytics": { MKT: "all" },
  "iam.users.manage": { SYS: "all" },
  "iam.users.invite": { SM: "scoped", SYS: "all" },
  "iam.roles.grant.approve": { EXE: "all" },
  "iam.impersonate": { SM: "scoped", SYS: "all" },
  "ops.backups": { SYS: "all" },
} satisfies Record<string, Row>;

export type Permission = keyof typeof MATRIX;

/** Case content, documents, chat bodies and money: never granted to the System Administrator (spec/02 §4.1). */
export const CONTENT_PERMS: readonly Permission[] = (Object.keys(MATRIX) as Permission[]).filter(
  (p) => p === "req.case.read" || /^(dlv|doc|msg|fin|rev|rfd)\./.test(p),
);

/** Step-up MFA (re-prompt within 5 min) — spec/02 §4.2. */
export const STEP_UP: ReadonlySet<Permission> = new Set<Permission>([
  "rev.payouts.approve", "fin.payment.manual.make", "fin.payment.manual.check",
  "rfd.approve1", "rfd.approve2", "rfd.approve.exec", "rfd.execute",
  "sup.bank.verify", "iam.roles.grant.approve", "iam.impersonate", "aud.export",
]);

const RANK: Record<Scope, number> = { scoped: 1, own: 2, org: 3, all: 4 };

/** Widest scope any of the user's roles grants (permissions are the union — spec/02 §2). */
export function scopeFor(roles: Role[], perm: Permission): Scope | null {
  const row: Row = MATRIX[perm];
  let best: Scope | null = null;
  for (const r of roles) {
    const s = row[KEY[r]];
    if (s && (!best || RANK[s] > RANK[best])) best = s;
  }
  return best;
}

export type ResourceContext = {
  ownerId?: string | null;
  assigneeIds?: readonly string[];
  orgId?: string | null;
  sharedWithMe?: boolean;
};

export function can(
  user: { id: string; roles: Role[]; orgIds?: readonly string[] } | null,
  perm: Permission,
  ctx?: ResourceContext,
): boolean {
  const roles: Role[] = user?.roles.length ? user.roles : ["visitor"];
  const scope = scopeFor(roles, perm);
  if (!scope) return false;
  if (scope === "all" || !ctx) return true; // no resource = "may I see this area at all"
  const uid = user?.id;
  const owns = !!uid && (ctx.ownerId === uid || !!ctx.assigneeIds?.includes(uid));
  if (scope === "own") return owns;
  if (scope === "org") return owns || (!!ctx.orgId && !!user?.orgIds?.includes(ctx.orgId));
  return owns || !!ctx.sharedWithMe; // scoped
}

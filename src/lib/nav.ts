// Workspace navigation — routes from Project/BUILD-PLAN.md (stage per workspace for placeholders).
import { ROLE_META, type Role, type Workspace } from "@/shared/auth/roles";
import type { MessageKey } from "@/lib/i18n/translate";

/** `grant`: roles outside the workspace that may still see this item (X-6, mirrored in roles.ts GRANTS). */
export type NavItem = { href: string; label: MessageKey; grant?: Role[] };

export const WORKSPACE_NAV: Record<Workspace, { stage: number; items: NavItem[] }> = {
  client: { stage: 2, items: [
    { href: "/dashboard", label: "wsnav.overview" },
    { href: "/requests", label: "wsnav.requests" },
    { href: "/messages", label: "wsnav.messages" },
    { href: "/documents", label: "wsnav.documents" },
    { href: "/billing", label: "wsnav.billing" },
    { href: "/history", label: "wsnav.history" },
    { href: "/bookings", label: "wsnav.bookings" },
    { href: "/orgs", label: "wsnav.organisations" },
    { href: "/notifications", label: "wsnav.notifications" },
    { href: "/help", label: "wsnav.help" },
    { href: "/settings", label: "wsnav.settings" },
  ] },
  agent: { stage: 4, items: [
    { href: "/agent", label: "wsnav.today" },
    { href: "/agent/offers", label: "wsnav.offers" },
    { href: "/agent/cases", label: "wsnav.cases" },
    { href: "/agent/inbox", label: "wsnav.inbox" },
    { href: "/agent/calendar", label: "wsnav.calendar" },
    { href: "/agent/clients", label: "wsnav.clients" },
    { href: "/agent/earnings", label: "wsnav.earnings" },
    { href: "/agent/performance", label: "wsnav.performance" },
    { href: "/agent/profile", label: "wsnav.profile" },
    { href: "/agent/field", label: "wsnav.field" }, // Stage 9: page denies non-field agents
  ] },
  work: { stage: 8, items: [
    // Stage 8 §7.1. Onboarding is reached through WorkGate, not the nav; Team is hidden for firm members.
    { href: "/work", label: "wsnav.home" },
    { href: "/work/offers", label: "wsnav.offers" },
    { href: "/work/jobs", label: "wsnav.jobs" },
    { href: "/work/inbox", label: "wsnav.messages" },
    { href: "/work/earnings", label: "wsnav.earnings" },
    { href: "/work/contract", label: "wsnav.contract" },
    { href: "/work/profile", label: "wsnav.profile" },
    { href: "/work/team", label: "wsnav.team" },
    { href: "/work/field", label: "wsnav.field" }, // Stage 9 field tab; FieldShell gates non-field agents
  ] },
  ops: { stage: 3, items: [
    { href: "/ops", label: "wsnav.today" },
    { href: "/ops/intake", label: "wsnav.intake" },
    { href: "/ops/cases", label: "wsnav.cases" },
    { href: "/ops/workload", label: "wsnav.workload" },
    { href: "/ops/sla", label: "wsnav.sla" },
    { href: "/ops/reviews", label: "wsnav.reviews" },
    { href: "/ops/tickets", label: "wsnav.tickets" },
    { href: "/ops/companies", label: "wsnav.companies" },
    { href: "/ops/conversations", label: "wsnav.conversations" },
    { href: "/ops/bookings", label: "wsnav.bookings" },
    { href: "/ops/catalogue", label: "wsnav.catalogue" },
    { href: "/ops/workforce", label: "wsnav.workforce" },
    { href: "/ops/knowledge", label: "wsnav.knowledge" },
    { href: "/ops/assistant", label: "wsnav.assistant" }, // Stage 11 AI console
    { href: "/ops/settings/statuses", label: "wsnav.statuses" },
    { href: "/ops/compliance-rules", label: "wsnav.complianceRules" }, // F-CAL-01
    { href: "/ops/field", label: "wsnav.field" }, // Stage 9 field review queue
  ] },
  finance: { stage: 5, items: [
    { href: "/finance", label: "wsnav.overview" },
    { href: "/finance/approvals", label: "wsnav.approvals", grant: ["staff:executive"] },
    { href: "/finance/quotes", label: "wsnav.quotes" },
    { href: "/finance/invoices", label: "wsnav.invoices" },
    { href: "/finance/payments", label: "wsnav.payments" },
    { href: "/finance/reconciliation", label: "wsnav.reconciliation" },
    { href: "/finance/receivables", label: "wsnav.receivables" },
    { href: "/finance/refunds", label: "wsnav.refunds" },
    { href: "/finance/field", label: "wsnav.field" }, // Stage 9 L2 expenses + cash custody
    { href: "/finance/revenue", label: "wsnav.revenue" },
    { href: "/finance/payouts", label: "wsnav.payouts" },
    { href: "/finance/subscriptions", label: "wsnav.finSubscriptions" }, // F-SUB-09 pause
    { href: "/finance/payables", label: "wsnav.payables" }, // Stage 12 supplier bills
    { href: "/finance/reports", label: "wsnav.reports" },
    { href: "/finance/settings", label: "wsnav.settings" },
  ] },
  marketing: { stage: 10, items: [
    // Stage 10 §U2 grouped nav: Content ▸ (Pages…Media), Campaigns ▸ (Campaigns…Templates). SM/exec get granted items only.
    { href: "/marketing", label: "wsnav.overview" },
    { href: "/marketing/content", label: "wsnav.content", grant: ["staff:service_manager"] },
    { href: "/marketing/landing", label: "wsnav.landing" },
    { href: "/marketing/knowledge", label: "wsnav.knowledge", grant: ["staff:service_manager"] },
    { href: "/marketing/updates", label: "wsnav.updates", grant: ["staff:service_manager"] },
    { href: "/marketing/faqs", label: "wsnav.faqs", grant: ["staff:service_manager"] },
    { href: "/marketing/media", label: "wsnav.media" },
    { href: "/marketing/leads", label: "wsnav.leads" },
    { href: "/marketing/inbox", label: "wsnav.inbox" },
    { href: "/marketing/customers", label: "wsnav.customers" },
    { href: "/marketing/campaigns", label: "wsnav.campaigns", grant: ["staff:executive"] },
    { href: "/marketing/segments", label: "wsnav.segments" },
    { href: "/marketing/sequences", label: "wsnav.sequences" },
    { href: "/marketing/templates", label: "wsnav.templates" },
    { href: "/marketing/referrals", label: "wsnav.referrals" },
    { href: "/marketing/testimonials", label: "wsnav.testimonials" },
    { href: "/marketing/feedback", label: "wsnav.feedback" },
    { href: "/marketing/reports", label: "wsnav.reports", grant: ["staff:executive"] },
    { href: "/marketing/seo", label: "wsnav.seo" },
  ] },
  procurement: { stage: 12, items: [
    { href: "/procurement", label: "wsnav.overview" },
    { href: "/procurement/suppliers", label: "wsnav.suppliers" },
    { href: "/procurement/contracts", label: "wsnav.contracts" },
    { href: "/procurement/requests", label: "wsnav.purchaseRequests" },
    { href: "/procurement/orders", label: "wsnav.purchaseOrders" },
    { href: "/procurement/receipts", label: "wsnav.receipts" },
    { href: "/procurement/bills", label: "wsnav.bills" },
    { href: "/procurement/payments", label: "wsnav.payments" },
    { href: "/procurement/deposits", label: "wsnav.deposits" },
    { href: "/procurement/reports", label: "wsnav.reports" },
    { href: "/procurement/settings", label: "wsnav.settings" },
  ] },
  partners: { stage: 13, items: [
    { href: "/partners", label: "wsnav.overview" },
    { href: "/partners/commissions", label: "wsnav.commissions" },
  ] },
  exec: { stage: 14, items: [
    { href: "/exec", label: "wsnav.overview" },
    { href: "/exec/reports", label: "wsnav.reports" },
    { href: "/exec/approvals", label: "wsnav.approvals" },
    { href: "/exec/targets", label: "wsnav.targets" },
  ] },
  system: { stage: 6, items: [
    { href: "/system", label: "wsnav.overview" },
    { href: "/system/approvals", label: "wsnav.approvals" },
    { href: "/system/users", label: "wsnav.users" },
    { href: "/system/roles", label: "wsnav.roles" },
    { href: "/system/access-reviews", label: "wsnav.accessReviews" },
    { href: "/system/sod", label: "wsnav.sod" },
    { href: "/system/identity", label: "wsnav.identityChecks" },
    { href: "/system/break-glass", label: "wsnav.breakGlass" },
    { href: "/system/settings", label: "wsnav.settings" },
    { href: "/system/integrations", label: "wsnav.integrations" },
    { href: "/system/notifications", label: "wsnav.notifications" },
    { href: "/system/audit", label: "wsnav.audit" },
    { href: "/system/privacy", label: "wsnav.privacy" },
    { href: "/system/ops", label: "wsnav.operations" },
  ] },
};

/** Nav items this user may open: all for workspace members, else only granted items (executive → finance approvals). */
export function navFor(ws: Workspace, roles: readonly Role[]): NavItem[] {
  const items = WORKSPACE_NAV[ws].items;
  const member = roles.some((r) => r !== "visitor" && ROLE_META[r as Exclude<Role, "visitor">].workspace === ws);
  return member || !roles.length ? items : items.filter((i) => i.grant?.some((g) => roles.includes(g)));
}

/** ⌘K quick actions per workspace (plan 11 §8.4); filtered by navFor-style role checks in the palette. */
export const QUICK_ACTIONS: Partial<Record<Workspace, NavItem[]>> = {
  client: [
    { href: "/book", label: "palette.bookConsultation" },
    { href: "/assistant", label: "palette.askAssistant" },
    { href: "/bookings", label: "palette.myBookings" },
    { href: "/services", label: "palette.startRequest" },
  ],
  ops: [
    { href: "/ops/bookings", label: "palette.bookingsBoard" },
    { href: "/ops/assistant", label: "palette.assistantConsole" },
    { href: "/ops/knowledge", label: "palette.knowledgeBase" },
    { href: "/ops/conversations", label: "palette.conversations" },
    { href: "/ops/compliance-rules", label: "palette.complianceRules" },
  ],
  agent: [
    { href: "/agent/profile/availability", label: "palette.myAvailability" },
    { href: "/agent/calendar", label: "palette.todaySessions" },
  ],
  marketing: [{ href: "/marketing/knowledge", label: "palette.knowledgeBase", grant: ["staff:service_manager"] }],
};

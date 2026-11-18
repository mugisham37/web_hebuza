// Stage 4 core agent mocks: GET /api/agent/cases (real AgentCaseSummaryResponse + x_agent), and the x_agent
// summary/duty endpoints. Lane handlers live in handlers-agent-{a..f}.ts.
// shortcut: ★ mock — drop each as the real /api/agent/* endpoint ships.
import { http, HttpResponse, delay } from "msw";
import { CASES, clientOf, serviceOf, type OpsCase } from "./ops-world";
import { ME, OFFERS, STATE, extraOf, myCases } from "./agent-world";
import { groupOf } from "@/shared/agent/core";
import { bookingNotes } from "./booking-notes";
import { currentPersona } from "./personas";

export const ok = <T>(data: T, message = "OK") =>
  HttpResponse.json({ success: true, message, errorType: null, data });
export const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );

/** P0-AGT-2: not-cleared agents can't accept or upload (403); away agents get 409. */
export const gate = () =>
  STATE.clearance !== "cleared"
    ? fail(403, "not_cleared", "Your account isn't cleared yet")
    : STATE.duty === "away"
      ? fail(409, "away", "You're set as away")
      : null;

export function agentCase(c: OpsCase) {
  const s = serviceOf(c.service),
    cl = clientOf(c.clientId),
    x = extraOf(c.ref);
  const left = Date.parse(c.dueAt) - Date.now();
  return {
    code: c.ref,
    service_name: s.name,
    client_name: cl.name,
    status: c.status,
    tier: "standard",
    submitted_at: c.createdAt,
    sla_state: left < 0 ? "breached" : left < 24 * 3600_000 ? "at_risk" : "ok",
    sla_deadline: c.dueAt,
    unread_messages: x.unread,
    subscriptionStatus: cl.flags.includes("subscriber") ? "active" : "none",
    retainer: false,
    due_at: c.dueAt,
    due_source: "sla",
    deadline_state: left < 0 ? "overdue" : "ok",
    is_urgent: c.flags.includes("urgent"),
    client_preferred_date: null,
    x_agent: {
      serviceSlug: s.slug,
      clientId: cl.id,
      docsToCheck: x.docsToCheck,
      checklist: {
        done: x.checklist.filter((i) => i.done).length,
        total: x.checklist.length,
      },
      institution: c.institution ?? null,
      submissionRef: c.submissionRef ?? null,
      dispute: !!x.dispute,
    },
  };
}

const onLeaveNow = () => {
  const l = STATE.leave;
  if (!l || l.status !== "approved") return false;
  const n = Date.now();
  return Date.parse(l.from) <= n && n <= Date.parse(l.to) + 86_400_000;
};

export function summary() {
  const now = Date.now();
  const mine = myCases().filter(
    (c) =>
      !["completed_delivered", "cancelled", "rejected", "refunded"].includes(
        c.status,
      ),
  );
  if (STATE.awayUntil && Date.parse(STATE.awayUntil) < now) {
    STATE.duty = "on";
    STATE.awayUntil = null;
  }
  return {
    offers: OFFERS.filter(
      (o) => o.status === "pending" && Date.parse(o.expiresAt) > now,
    ).length,
    cases: mine.length,
    overdue: mine.filter((c) => groupOf(c, now) === "overdue").length,
    dueToday: mine.filter((c) => groupOf(c, now) === "today").length,
    unread: mine.reduce((s, c) => s + extraOf(c.ref).unread, 0),
    outbox: STATE.outbox,
    duty: STATE.duty,
    awayUntil: STATE.awayUntil,
    leave: STATE.leave,
    onLeaveNow: onLeaveNow(),
    clearance: STATE.clearance,
    me: {
      id: ME.id,
      name: ME.name,
      title: ME.title,
      sharePct: ME.sharePct,
      manager: ME.manager.name,
    },
  };
}

export const handlers = [
  http.get("/api/agent/x/summary", async () => {
    await delay(120);
    return ok(summary());
  }),
  http.put("/api/agent/x/duty", async ({ request }) => {
    await delay(250);
    const b = (await request.json()) as {
      state: "on" | "away";
      until?: string | null;
    };
    if (onLeaveNow()) return fail(409, "on_leave", "You're on approved leave.");
    STATE.duty = b.state;
    STATE.awayUntil = b.state === "away" ? (b.until ?? null) : null;
    return ok(summary());
  }),
  http.get("/api/agent/x/notifications", async () => {
    await delay(150);
    const t = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
    const pending = OFFERS.filter((o) => o.status === "pending" && Date.parse(o.expiresAt) > Date.now());
    const items = [
      ...pending.slice(0, 2).map((o, i) => ({ id: `n-of-${o.id}`, kind: "offer", text: `New offer — ${serviceOf(o.service).name}`, ref: o.ref, href: "/agent/offers", at: t(0.05 + i * 0.3), read: false })),
      { id: "n-up", kind: "client", text: "Kigali Fresh Foods Ltd uploaded 2 documents", ref: "HBZ-8VB2XCQ", href: "/agent/cases/HBZ-8VB2XCQ?tab=documents", at: t(0.2), read: false },
      { id: "n-due", kind: "deadline", text: "Deadline passed — trademark filing", ref: "HBZ-6LP4WSS", href: "/agent/cases/HBZ-6LP4WSS", at: t(2), read: false },
      { id: "n-rev", kind: "review", text: `Deliverable submitted — ${ME.manager.name} usually reviews within 4 business hours`, ref: "HBZ-5HN7KDZ", href: "/agent/cases/HBZ-5HN7KDZ?tab=deliverables", at: t(3), read: true },
      { id: "n-pay", kind: "money", text: "Allocation approved — RWF 4,500", href: "/agent/earnings", at: t(26), read: true },
      { id: "n-con", kind: "contract", text: "Contract expires in 52 days", href: "/agent/profile/contract", at: t(50), read: true },
      ...bookingNotes("agent", currentPersona()?.key ?? "agent").map((b) => ({ ...b, kind: "booking" })),
    ];
    return ok({ items });
  }),
  http.get("/api/agent/cases", async () => {
    await delay(200);
    return ok({ cases: myCases().map(agentCase) });
  }),
];

/** Test/mock helper so the "case exists" check works for refs that were just accepted. */
export const findCase = (ref: string) => CASES.find((c) => c.ref === ref);

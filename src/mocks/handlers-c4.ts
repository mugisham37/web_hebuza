// C4 mocks (history, notifications, settings/privacy, help/refunds, bookings, orgs).
// Real contract: /api/notifications*, /api/me/notification-preferences, /api/me/profile, /api/auth/change-password,
// /api/auth/account. Everything else is a proposed contract (not on the server yet).
// Demo rules: password "wrong" → 400 (change password, delete account); deletion is blocked by active HBZ-4K2M9Q.
// All data is placeholder (F-PRV-06).
import { http, HttpResponse, delay } from "msw";
import { POLICY } from "@/shared/policy";
import { audit } from "./audit";
import { setPersona } from "./personas";
import { bookingNotes } from "./booking-notes";

const ok = <T>(data: T) =>
  HttpResponse.json({ success: true, message: "OK", errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
const ahead = (d: number, hour = 10) => {
  const x = new Date(Date.now() + d * 864e5);
  x.setUTCHours(hour - 2, 0, 0, 0);
  return x.toISOString();
};
const y = new Date().getFullYear();

let bookingSeeded = false;
let notifications: { id: string; channel: string; kind: string; type?: string; vars?: Record<string, string>; title: string; body: string; href: string; read_at: string | null; created_at: string }[] = [
  {
    id: "n1",
    channel: "email", // proposed field: delivery channel for the preview
    kind: "document",
    title: "Your document is ready",
    body: "Your certificate is available to download.",
    href: "/documents",
    read_at: null as string | null,
    created_at: ago(1),
  },
  {
    id: "n2",
    channel: "sms", // proposed field: delivery channel for the preview
    kind: "action",
    title: "Action needed: upload a missing document",
    body: "Upload your ID to continue request HBZ-4K2M9Q.",
    href: "/requests",
    read_at: null as string | null,
    created_at: ago(2),
  },
  {
    id: "n3",
    channel: "whatsapp", // proposed field: delivery channel for the preview
    kind: "payment",
    title: "Payment received",
    body: "RWF 50,000 for Business registration.",
    href: "/billing",
    read_at: ago(20),
    created_at: ago(26),
  },
  {
    id: "n4",
    channel: "email", // proposed field: delivery channel for the preview
    kind: "message",
    title: "New message from your adviser",
    body: "Your request has been approved.",
    href: "/requests",
    read_at: ago(40),
    created_at: ago(48),
  },
];
let prefs: Record<string, unknown> = {
  email_enabled: true,
  digest_enabled: false,
};
const sessions = [
  {
    id: "s1",
    device: "Chrome on Android",
    place: "Kigali",
    lastActive: ago(0),
    current: true,
  },
  {
    id: "s2",
    device: "Safari on Mac",
    place: "Kigali",
    lastActive: ago(30),
    current: false,
  },
];
let consents = {
  processing: true,
  marketing: false,
  analytics: true,
  processingLocked: true,
};
let exportState: {
  status: "none" | "pending" | "ready";
  requestedAt: string | null;
  url: string | null;
} = { status: "none", requestedAt: null, url: null };
type TMsg = { id: string; from: "me" | "support"; body: string; at: string };
type Ticket = {
  ref: string;
  subject: string;
  status: "open" | "waiting" | "resolved";
  createdAt: string;
  messages: TMsg[];
  rating: { score: number; comment: string } | null;
};
const msg = (id: string, from: TMsg["from"], body: string, h: number): TMsg => ({ id, from, body, at: ago(h) });
let avatar: string | null = null;
const tickets: Ticket[] = [
  {
    ref: "TKT-2026-00142",
    subject: "Refund not received",
    status: "open",
    createdAt: ago(5),
    messages: [msg("m1", "me", "I asked for a refund last week and have not received it.", 5)],
    rating: null,
  },
  {
    ref: "TKT-2026-00141",
    subject: "Document not accepted",
    status: "waiting",
    createdAt: ago(30),
    messages: [
      msg("m2", "me", "The office did not accept my document.", 30),
      msg("m3", "support", "Sorry about that. Please upload a clearer scan of page 2.", 20),
    ],
    rating: null,
  },
  {
    ref: "TKT-2026-00137",
    subject: "General inquiry",
    status: "resolved",
    createdAt: ago(80),
    messages: [
      msg("m4", "me", "Which documents do I need for a tax clearance?", 80),
      msg("m5", "support", "Your ID and your TIN certificate. We have added the checklist to your request.", 70),
    ],
    rating: null,
  },
];
const payments = [
  {
    caseRef: "HBZ-4K2M9Q",
    service: "Tax clearance",
    paid: POLICY.consultationPrice,
    method: "momo",
    eligible: true,
    reason: null,
  },
  {
    caseRef: "HBZ-3J7D2L",
    service: "Business registration",
    paid: 50000,
    method: "momo",
    eligible: true,
    reason: null,
  },
  {
    caseRef: "HBZ-9F1T6R",
    service: "Tax appeal",
    paid: 30000,
    method: "card",
    eligible: false,
    reason: "Completed more than 30 days ago.",
  },
];
const refunds = [
  {
    ref: "RFD-2026-00018",
    caseRef: "HBZ-3J7D2L",
    amount: 50000,
    refunded: null as number | null,
    status: "reviewed",
    createdAt: ago(20),
    note: null as string | null,
  },
  {
    ref: "RFD-2026-00011",
    caseRef: "HBZ-9F1T6R",
    amount: 30000,
    refunded: null as number | null,
    status: "declined",
    createdAt: ago(400),
    note: "Duplicate payment not found.",
  },
];
let bookings = [
  {
    id: "b1",
    topic: "Company registration — intro call",
    at: ahead(2),
    mode: "phone",
    status: "confirmed",
  },
  {
    id: "b2",
    topic: "Tax clearance consultation",
    at: ahead(6, 14),
    mode: "video",
    status: "confirmed",
  },
  {
    id: "b3",
    topic: "Trademark questions",
    at: ago(24 * 9),
    mode: "office",
    status: "done",
  },
];
let activeOrgId: string | null = null;
const orgs = [
  {
    id: "o1",
    name: "Example Trading Ltd",
    myRole: "owner",
    members: [
      {
        id: "m1",
        name: "Demo Client",
        contact: "client@example.test",
        role: "owner",
      },
      {
        id: "m2",
        name: "Demo Colleague",
        contact: "+250 788 000 001",
        role: "member",
      },
    ] as {
      id: string;
      name: string;
      contact: string;
      role: string;
      pending?: boolean;
    }[],
  },
];

const activity = [
  {
    id: "a1",
    at: `${y}-11-14T08:00:00Z`,
    kind: "request",
    title: "Tax clearance completed",
    slug: "application-for-tax-clearance-certificate", // proposed: lets the client offer "Request again"
    ref: "HBZ-4K2M9Q",
    amount: null,
  },
  {
    id: "a2",
    at: `${y}-11-10T09:00:00Z`,
    kind: "payment",
    title: "Payment for Tax clearance",
    ref: "HBZ-4K2M9Q",
    amount: POLICY.consultationPrice,
  },
  {
    id: "a3",
    at: `${y}-10-28T09:00:00Z`,
    kind: "request",
    title: "Business registration completed",
    slug: "company-registration",
    ref: "HBZ-3J7D2L",
    amount: null,
  },
  {
    id: "a4",
    at: `${y}-10-20T09:00:00Z`,
    kind: "document",
    title: "Certificate of incorporation delivered",
    ref: "HBZ-3J7D2L",
    amount: null,
  },
  {
    id: "a5",
    at: `${y}-10-10T09:00:00Z`,
    kind: "payment",
    title: "Payment for Tax appeal",
    ref: "HBZ-9F1T6R",
    amount: 30000,
  },
  {
    id: "a6",
    at: `${y}-09-02T09:00:00Z`,
    kind: "account",
    title: "Password changed",
    ref: null,
    amount: null,
  },
];

const BLOCKING = ["HBZ-4K2M9Q"]; // active cases that block account deletion
const body = async (r: Request) =>
  (await r.json().catch(() => ({}))) as Record<string, unknown>;
let seq = 143;

export const handlers = [
  http.get("*/api/me/activity", async ({ request }) => {
    await delay(300);
    const yr = new URL(request.url).searchParams.get("year");
    return ok({ items: activity.filter((a) => !yr || a.at.startsWith(yr)) });
  }),

  http.get("*/api/notifications", async () => {
    await delay(250);
    if (!bookingSeeded) {
      bookingSeeded = true; // once, so mark-read sticks; booking-world is seeded by now
      notifications = [
        ...notifications,
        ...bookingNotes("client").map((b) => ({ id: b.id, channel: "whatsapp", kind: "booking", type: b.type, vars: b.vars, title: b.text, body: "", href: b.href, read_at: b.read ? b.at : null, created_at: b.at })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return ok({
      notifications,
      unread_count: notifications.filter((n) => !n.read_at).length,
    });
  }),
  http.post("*/api/notifications/read", async ({ request }) => {
    const ids = (await body(request)).ids as string[] | null | undefined;
    let updated = 0;
    notifications = notifications.map((n) =>
      !n.read_at && (!ids || ids.includes(n.id))
        ? (updated++, { ...n, read_at: new Date().toISOString() })
        : n,
    );
    return ok({
      updated,
      unread_count: notifications.filter((n) => !n.read_at).length,
    });
  }),
  http.get("*/api/me/notification-preferences", async () => {
    await delay(200);
    return ok(prefs);
  }),
  http.put("*/api/me/notification-preferences", async ({ request }) => {
    prefs = { ...prefs, ...(await body(request)) };
    await delay(300);
    return ok(prefs);
  }),

  http.patch("*/api/me/profile", async () => {
    await delay(400);
    return ok({ session: null });
  }),
  http.patch("*/api/auth/change-password", async ({ request }) => {
    await delay(400);
    return (await body(request)).currentPassword === "wrong"
      ? fail(400, "invalid_password", "Current password is incorrect.")
      : ok({ changed: true });
  }),
  http.get("*/api/me/sessions", async () => {
    await delay(200);
    return ok({ sessions });
  }),
  http.delete("*/api/me/sessions/:id", ({ params }) => {
    for (let i = sessions.length - 1; i >= 0; i--)
      if (
        !sessions[i].current &&
        (params.id === "others" || sessions[i].id === params.id)
      )
        sessions.splice(i, 1);
    return ok({ revoked: true });
  }),

  http.get("*/api/me/consents", () => ok(consents)),
  http.put("*/api/me/consents", async ({ request }) => {
    const b = await body(request);
    if (consents.processingLocked && b.processing === false)
      return fail(409, "consent_locked", "Required while requests are open.");
    consents = { ...consents, ...b };
    return ok(consents);
  }),
  http.get("*/api/me/data-export", () => ok(exportState)),
  http.post("*/api/me/data-export", async () => {
    await delay(400);
    exportState = {
      status: "pending",
      requestedAt: new Date().toISOString(),
      url: null,
    };
    return ok(exportState);
  }),
  http.get("*/api/me/deletion-check", () =>
    ok({ blocked: BLOCKING.length > 0, refs: BLOCKING }),
  ),
  http.delete("*/api/auth/account", async ({ request }) => {
    await delay(400);
    if ((await body(request)).password === "wrong")
      return fail(400, "invalid_password", "Password is incorrect.");
    // B2/B9: active cases block deletion server-side too, not just in the UI.
    if (BLOCKING.length) return fail(409, "deletion_blocked", "Active requests block deletion.");
    audit({ actor: "mock-client", action: "account.delete", entity: { kind: "user", id: "mock-client" } });
    setPersona(null);
    return ok({ deleted: true });
  }),

  http.get("*/api/support/tickets", async () => {
    await delay(250);
    return ok({ tickets });
  }),
  http.post("*/api/support/tickets", async ({ request }) => {
    const b = await body(request);
    const ref = `TKT-${y}-00${seq++}`;
    tickets.unshift({
      ref,
      subject: String(b.subject ?? ""),
      status: "open",
      createdAt: new Date().toISOString(),
      messages: [msg(`m${seq}`, "me", String(b.message ?? ""), 0)],
      rating: null,
    });
    await delay(400);
    return ok({ ref });
  }),
  http.get("*/api/support/tickets/:ref", async ({ params }) => {
    await delay(250);
    const t = tickets.find((x) => x.ref === params.ref);
    return t ? ok(t) : fail(404, "not_found", "Ticket not found.");
  }),
  http.post("*/api/support/tickets/:ref/messages", async ({ params, request }) => {
    const t = tickets.find((x) => x.ref === params.ref);
    if (!t) return fail(404, "not_found", "Ticket not found.");
    if (t.status === "resolved") return fail(409, "ticket_closed", "Ticket is resolved.");
    const text = String((await body(request)).body ?? "").trim();
    if (!text) return fail(400, "validation_error", "Message is empty.");
    t.messages.push(msg(`m${seq++}`, "me", text, 0));
    t.status = "open";
    await delay(300);
    return ok(t);
  }),
  http.post("*/api/support/tickets/:ref/rating", async ({ params, request }) => {
    const t = tickets.find((x) => x.ref === params.ref);
    if (!t) return fail(404, "not_found", "Ticket not found.");
    const b = await body(request);
    const score = Number(b.score);
    if (t.status !== "resolved" || !Number.isInteger(score) || score < 1 || score > 5)
      return fail(400, "validation_error", "Invalid rating.");
    t.rating = { score, comment: String(b.comment ?? "").slice(0, 1000) };
    await delay(300);
    return ok(t);
  }),
  http.get("*/api/me/avatar", () => ok({ url: avatar })),
  http.post("*/api/me/avatar", async ({ request }) => {
    const f = (await request.formData()).get("file");
    if (!(f instanceof File) || !/^image\/(jpeg|png|webp)$/.test(f.type))
      return fail(400, "validation_error", "Invalid image.");
    if (f.size > 5 * 1024 * 1024) return fail(413, "too_large", "Image too large.");
    const bytes = new Uint8Array(await f.arrayBuffer());
    let bin = "";
    for (const x of bytes) bin += String.fromCharCode(x);
    avatar = `data:${f.type};base64,${btoa(bin)}`;
    await delay(600);
    return ok({ url: avatar });
  }),
  http.delete("*/api/me/avatar", () => {
    avatar = null;
    return ok({ url: null });
  }),
  http.get("*/api/me/refunds/eligibility", async () => {
    await delay(250);
    return ok({ payments });
  }),
  http.get("*/api/me/refunds", async () => {
    await delay(250);
    return ok({ refunds });
  }),
  http.post("*/api/me/refunds", async ({ request }) => {
    const b = await body(request);
    const p = payments.find((x) => x.caseRef === b.caseRef);
    if (!p?.eligible)
      return fail(409, "not_eligible", "This payment can't be refunded.");
    if (refunds.some((r) => r.caseRef === p.caseRef && !/^(paid|declined)$/.test(r.status)))
      return fail(409, "refund_open", "A refund for this payment is already open."); // F-RFD-01 duplicate guard
    const ref = `RFD-${y}-000${refunds.length + 19}`;
    refunds.unshift({
      ref,
      caseRef: p.caseRef,
      amount: p.paid,
      refunded: null,
      status: "requested",
      createdAt: new Date().toISOString(),
      note: null,
    });
    audit({ actor: "mock-client", action: "refund.request", entity: { kind: "refund", id: ref }, after: { caseRef: p.caseRef, amount: p.paid } });
    await delay(400);
    return ok({ ref });
  }),

  http.get("*/api/me/bookings", async () => {
    await delay(250);
    return ok({ bookings });
  }),
  http.patch("*/api/me/bookings/:id", async ({ params, request }) => {
    const at = String((await body(request)).at ?? "");
    if (!at || new Date(at).getTime() < Date.now())
      return fail(422, "invalid_slot", "Pick a future time.");
    bookings = bookings.map((b) => (b.id === params.id ? { ...b, at } : b));
    return ok({ updated: true });
  }),
  http.delete("*/api/me/bookings/:id", ({ params }) => {
    bookings = bookings.map((b) =>
      b.id === params.id ? { ...b, status: "cancelled" } : b,
    );
    return ok({ cancelled: true });
  }),

  http.get("*/api/me/orgs", async () => {
    await delay(250);
    return ok({ activeOrgId, orgs });
  }),
  http.put("*/api/me/orgs/active", async ({ request }) => {
    activeOrgId = ((await body(request)).orgId as string | null) ?? null;
    return ok({ activeOrgId });
  }),
  http.post("*/api/me/orgs/:id/invites", async ({ params, request }) => {
    const b = await body(request);
    const org = orgs.find((o) => o.id === params.id);
    if (!org) return fail(404, "not_found", "Organisation not found.");
    org.members.push({
      id: `m${Date.now()}`,
      name: String(b.contact),
      contact: String(b.contact),
      role: String(b.role ?? "member"),
      pending: true,
    });
    return ok({ invited: true });
  }),
  http.delete("*/api/me/orgs/:id/members/:mid", ({ params }) => {
    const org = orgs.find((o) => o.id === params.id);
    if (org)
      org.members = org.members.filter(
        (m) => m.id !== params.mid || m.role === "owner",
      );
    return ok({ removed: true });
  }),
];

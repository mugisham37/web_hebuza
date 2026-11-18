// C06–C08 mocks: dashboard, requests (+ mock-only detail extensions), request conversations. Placeholder data only.
import { http, HttpResponse, delay } from "msw";
import { POLICY } from "@/shared/policy";

const ok = <T>(data: T) =>
  HttpResponse.json({ success: true, message: "OK", errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );

const ME = "mock-client";
const ADV = "mock-adviser";
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

type Row = {
  code: string;
  service_name: string;
  service_slug: string;
  status: string;
  payment_status: string;
  submitted_at: string;
  amount: number;
};
const ROWS: Row[] = [
  {
    code: "HBZ-4K2M9Q",
    service_name: "Company registration",
    service_slug: "company-registration",
    status: "awaiting_client_documents",
    payment_status: "paid",
    submitted_at: day(-6),
    amount: POLICY.consultationPrice,
  },
  {
    code: "HBZ-7PX31A",
    service_name: "VAT registration",
    service_slug: "vat-registration",
    status: "awaiting_payment",
    payment_status: "unpaid",
    submitted_at: day(-2),
    amount: 3000,
  },
  {
    code: "HBZ-2RT8LM",
    service_name: "Tax clearance certificate",
    service_slug: "tax-clearance",
    status: "completed_delivered",
    payment_status: "paid",
    submitted_at: day(-30),
    amount: 10000,
  },
  {
    code: "HBZ-9QW5ZE",
    service_name: "Trademark search",
    service_slug: "trademark-search",
    status: "in_progress",
    payment_status: "paid",
    submitted_at: day(-12),
    amount: 15000,
  },
];
const done = new Set<string>();

const summary = (r: Row) => ({
  application_id: r.code,
  code: r.code,
  service_name: r.service_name,
  service_slug: r.service_slug,
  status: r.status,
  tier: "standard",
  submitted_at: r.submitted_at,
  payment_status: r.payment_status,
  handler: "hebuza",
  ending: "delivered",
  retainer: false,
  assigned_agent_name: "Demo Adviser",
});
const needsFor = (r: Row) => [
  ...(r.status === "awaiting_client_documents"
    ? [
        {
          id: `${r.code}-doc`,
          kind: "document",
          code: r.code,
          service: r.service_name,
          label: "Proof of business address",
          dueAt: day(1),
          done: done.has(`${r.code}-doc`),
        },
      ]
    : []),
  ...(r.status === "awaiting_payment"
    ? [
        {
          id: `${r.code}-pay`,
          kind: "payment",
          code: r.code,
          service: r.service_name,
          label: "Service fee",
          amount: r.amount,
          dueAt: day(3),
        },
      ]
    : []),
];
const paymentsFor = (r: Row) => [
  {
    id: `${r.code}-p1`,
    label: "Service fee",
    amount: r.amount,
    code: r.code,
    service: r.service_name,
    status: r.payment_status === "paid" ? "paid" : "due",
    paidAt: r.payment_status === "paid" ? r.submitted_at : null,
    dueAt: r.payment_status === "paid" ? null : day(3),
  },
];
const STEPS = [
  "Request received",
  "Under review",
  "Documents checked",
  "Submitted to institution",
  "Delivered",
];
const timelineFor = (r: Row) => {
  const at =
    r.status === "completed_delivered"
      ? 5
      : r.status === "in_progress"
        ? 3
        : r.status === "awaiting_client_documents"
          ? 2
          : 1;
  return STEPS.map((title, i) => ({
    id: `${r.code}-s${i}`,
    title,
    state: i < at ? "done" : i === at ? "current" : "upcoming",
    at: i <= at ? day(-6 + i) : null,
  }));
};

type Msg = {
  message_id: string;
  conversation_id: string;
  seq: number;
  client_msg_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sender_role: string | null;
  content: string;
  lane: string;
  kind: string;
  is_system: boolean;
  attachments: unknown[];
  created_at: string;
};
const threads = new Map<string, Msg[]>();
const thread = (code: string) => {
  if (!threads.has(code)) {
    const base = {
      conversation_id: `conv-${code}`,
      client_msg_id: null,
      lane: "client",
      kind: "text",
      attachments: [],
    };
    threads.set(code, [
      {
        ...base,
        message_id: `${code}-m1`,
        seq: 1,
        sender_id: null,
        sender_name: null,
        sender_role: null,
        is_system: true,
        content: `Request received · ${code}`,
        created_at: day(-6),
      },
      {
        ...base,
        message_id: `${code}-m2`,
        seq: 2,
        sender_id: ADV,
        sender_name: "Demo Adviser",
        sender_role: "staff",
        is_system: false,
        content:
          "Hello! I've reviewed your application. One document is missing.",
        created_at: day(-1),
      },
    ]);
  }
  return threads.get(code)!;
};
const codeOf = (id: string) => id.replace(/^conv-/, "");
const conversation = (r: Row) => {
  const ms = thread(r.code);
  const last = ms.at(-1)!;
  return {
    conversation_id: `conv-${r.code}`,
    kind: "application",
    application_id: r.code,
    code: r.code,
    title: r.service_name,
    service_name: r.service_name,
    status: r.status,
    role: "client",
    is_participant: true,
    partner_client_lane_open: false,
    last_seq: last.seq,
    last_message_at: last.created_at,
    last_message_preview: last.content,
    last_sender_name: last.sender_name,
    unread: last.sender_id === ADV ? 1 : 0,
    mention_count: 0,
    has_dispute: false,
    // Adviser reads everything except the newest client message → shows Delivered then Read on next poll.
    participants: [
      {
        user_id: ADV,
        name: "Demo Adviser",
        role: "staff",
        last_read_seq: Math.max(0, last.seq - (last.sender_id === ME ? 1 : 0)),
        last_delivered_seq: last.seq,
        joined_at: day(-6),
      },
      {
        user_id: ME,
        name: "You",
        role: "client",
        last_read_seq: last.seq,
        last_delivered_seq: last.seq,
        joined_at: day(-6),
      },
    ],
  };
};
const find = (code: string) => ROWS.find((r) => r.code === code);
/** Seeded invoice for handlers-flow, so /pay charges what the request page shows. */
export const seededInvoice = (code: string) => {
  const r = find(code);
  return r && { service: r.service_name, slug: r.service_slug, total: r.amount, paid: r.payment_status === "paid" ? r.amount : 0 };
};

export const handlers = [
  http.get("/api/me/dashboard", async () => {
    await delay(250);
    return ok({
      needs: ROWS.flatMap(needsFor),
      requests: ROWS.map(summary),
      paymentsDue: ROWS.flatMap(paymentsFor).filter((p) => p.status === "due"),
      unread: ROWS.filter((r) => conversation(r).unread).length,
    });
  }),
  http.get("/api/applications", async () => {
    await delay(250);
    return ok({ applications: ROWS.map(summary) });
  }),
  http.get("/api/applications/:code", async ({ params }) => {
    await delay(250);
    const r = find(String(params.code));
    if (!r) return; // not a seeded request: handlers-flow owns new refs and the 404 (P0-FLOW-1)
    return ok({
      ...summary(r),
      personal_info: {},
      service_data: {},
      payment_amount: r.amount,
      status_display: r.status,
      assignee_name: "Demo Adviser",
      outcome:
        r.status === "in_progress"
          ? "pending"
          : r.status === "completed_delivered"
            ? "approved"
            : "none",
      needs: needsFor(r),
      payments: paymentsFor(r),
      timeline: timelineFor(r),
      deliverables:
        r.status === "completed_delivered"
          ? [
              {
                id: `${r.code}-d1`,
                name: "certificate.pdf",
                size: 220_000,
                released: true,
                at: day(-1),
              },
            ]
          : [],
    });
  }),
  http.post(
    "/api/applications/:code/documents",
    async ({ params, request }) => {
      await delay(600);
      const fd = await request.formData();
      if (!(fd.get("file") instanceof File))
        return fail(422, "validation", "file is required");
      if ((fd.get("file") as File).size > 10 * 1024 * 1024)
        return fail(413, "too_large", "File too large."); // PLACEHOLDER(upload-max-mb)
      done.add(String(fd.get("need_id")));
      return ok({ code: params.code, uploaded: true });
    },
  ),
  http.get("/api/chat/conversations", async () => {
    await delay(200);
    const conversations = ROWS.map(conversation);
    return ok({
      conversations,
      unread_total: conversations.reduce((s, c) => s + c.unread, 0),
      next_cursor: null,
    });
  }),
  http.get(
    "/api/chat/conversations/by-application/:code",
    async ({ params }) => {
      const r = find(String(params.code));
      return r
        ? ok(conversation(r))
        : fail(404, "not_found", "Conversation not found");
    },
  ),
  http.get("/api/chat/conversations/:id/messages", async ({ params }) => {
    await delay(150);
    return ok(thread(codeOf(String(params.id))));
  }),
  http.post(
    "/api/chat/conversations/:id/messages",
    async ({ params, request }) => {
      await delay(400);
      const b = (await request.json()) as {
        client_msg_id: string;
        content: string;
        attachment_ids?: string[];
      };
      if (/fail/i.test(b.content))
        return fail(503, "unavailable", "Simulated send failure"); // lets QA see failed/retry
      const ms = thread(codeOf(String(params.id)));
      const dup = ms.find((m) => m.client_msg_id === b.client_msg_id);
      if (dup) return ok(dup);
      const m: Msg = {
        message_id: crypto.randomUUID(),
        conversation_id: String(params.id),
        seq: ms.length + 1,
        client_msg_id: b.client_msg_id,
        sender_id: ME,
        sender_name: "You",
        sender_role: "client",
        content: b.content,
        lane: "client",
        kind: "text",
        is_system: false,
        created_at: new Date().toISOString(),
        attachments: (b.attachment_ids ?? []).map((id) => ({
          id,
          filename: id.split(":")[1] ?? "file",
          mime: "application/octet-stream",
          size: 0,
          lane: "client",
          has_thumbnail: false,
          created_at: new Date().toISOString(),
        })),
      };
      ms.push(m);
      return ok(m);
    },
  ),
  http.post("/api/chat/conversations/:id/read", () => ok({ updated: 1 })),
  http.post("/api/chat/conversations/:id/attachments", async ({ request }) => {
    await delay(500);
    const f = (await request.formData()).get("file");
    if (!(f instanceof File))
      return fail(422, "validation", "file is required");
    return ok({
      id: `att-${crypto.randomUUID()}:${f.name}`,
      filename: f.name,
      mime: f.type,
      size: f.size,
      lane: "client",
      has_thumbnail: false,
      created_at: new Date().toISOString(),
    });
  }),
];

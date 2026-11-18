// Chat + admin chat mocks (contract: contract/openapi.json). Conversation list/messages/read/attachments live in handlers-c2.
// Module-level state so edits, pins, reactions, claims, templates and disputes persist for the session.
import { http, HttpResponse, delay } from "msw";
import { currentPersona } from "./personas";

const ok = <T>(data: T, message = "OK") =>
  HttpResponse.json({ success: true, message, errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
const me = () => {
  const p = currentPersona();
  return { id: p ? `mock-${p.key}` : "mock-client", name: p?.name ?? "You" };
};
const body = async (r: Request) =>
  ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

const STAFF = [
  { user_id: "mock-agent", name: "Eric Habimana" },
  { user_id: "mock-sm", name: "Diane Mukamana" },
  { user_id: "mock-finance", name: "Patrick Niyonzima" },
  { user_id: "mock-field", name: "Emmanuel Mugabo" },
];

type Conv = {
  conversation_id: string;
  kind: string;
  code: string | null;
  title: string | null;
  client_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  waiting_since: string | null;
  unread_for_admin: number;
  has_dispute: boolean;
  has_internal_notes: boolean;
  claimed_by: string | null;
  claimed_by_name: string | null;
  handoff: boolean;
  muted: boolean;
  application_code: string | null;
};
const conv = (
  id: string,
  code: string,
  client: string,
  preview: string,
  h: number,
  extra: Partial<Conv> = {},
): Conv => ({
  conversation_id: id,
  kind: "application",
  code,
  title: code,
  client_name: client,
  last_message_preview: preview,
  last_message_at: ago(h),
  waiting_since: ago(h),
  unread_for_admin: 1,
  has_dispute: false,
  has_internal_notes: false,
  claimed_by: null,
  claimed_by_name: null,
  handoff: false,
  muted: false,
  application_code: code,
  ...extra,
});
const CONVS: Conv[] = [
  conv(
    "conv-HBZ-24-0012",
    "HBZ-24-0012",
    "Demo Client",
    "Muraho, dosiye yanjye igeze he?",
    2,
  ),
  conv(
    "conv-HBZ-24-0031",
    "HBZ-24-0031",
    "Demo Client B",
    "I uploaded the land title, please confirm.",
    5,
    {
      claimed_by: "mock-agent",
      claimed_by_name: "Eric Habimana",
      has_internal_notes: true,
    },
  ),
  conv(
    "conv-HBZ-24-0044",
    "HBZ-24-0044",
    "Demo Client",
    "Bonjour, je conteste les frais facturés.",
    26,
    { has_dispute: true, handoff: true },
  ),
  conv(
    "conv-HBZ-24-0058",
    "HBZ-24-0058",
    "Demo New Client",
    "Murakoze cyane!",
    50,
    { waiting_since: null, unread_for_admin: 0 },
  ),
];
const findConv = (id: string) => CONVS.find((c) => c.conversation_id === id);

type Msg = {
  message_id: string;
  conversation_id: string;
  content: string;
  pinned: boolean;
  edited_at: string | null;
  deleted: boolean;
  reactions: { emoji: string; user_ids: string[] }[];
  history: { content: string; edited_at: string }[];
};
const MSGS = new Map<string, Msg>(); // only messages we've touched; others are created lazily by id
const msg = (id: string): Msg => {
  let m = MSGS.get(id);
  if (!m)
    MSGS.set(
      id,
      (m = {
        message_id: id,
        conversation_id: "conv-HBZ-24-0012",
        content: "",
        pinned: false,
        edited_at: null,
        deleted: false,
        reactions: [],
        history: [],
      }),
    );
  return m;
};

type Template = {
  template_id: string;
  title: string;
  body_rw: string;
  body_en: string;
  body_fr: string;
};
const TEMPLATES: Template[] = [
  {
    template_id: "tpl-1",
    title: "Docs received",
    body_rw: "Muraho {client}, twakiriye inyandiko zawe. Turazisuzuma.",
    body_en:
      "Hello {client}, we received your documents and are reviewing them.",
    body_fr: "Bonjour {client}, nous avons bien reçu vos documents.",
  },
  {
    template_id: "tpl-2",
    title: "Payment reminder",
    body_rw: "{client}, turakwibutsa kwishyura dosiye {code}.",
    body_en: "{client}, a reminder to complete payment for {code}.",
    body_fr: "{client}, rappel de paiement pour {code}.",
  },
];

type Dispute = {
  dispute_id: string;
  conversation_id: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
};
const DISPUTES: Dispute[] = [
  {
    dispute_id: "dsp-1",
    conversation_id: "conv-HBZ-24-0044",
    reason: "Fees charged twice",
    status: "open",
    resolution: null,
    created_at: ago(26),
  },
];

export const handlers = [
  // --- admin console
  http.get("*/api/admin/chat/conversations", ({ request }) => {
    const q = new URL(request.url).searchParams;
    const s = (q.get("q") ?? "").toLowerCase();
    let rows = CONVS.filter(
      (c) =>
        !s ||
        `${c.code} ${c.client_name} ${c.last_message_preview}`
          .toLowerCase()
          .includes(s),
    );
    if (q.get("unassigned") === "true")
      rows = rows.filter((c) => !c.claimed_by);
    if (q.get("agent_id") === "me")
      rows = rows.filter((c) => c.claimed_by === me().id);
    if (q.get("handoff") === "true") rows = rows.filter((c) => c.handoff);
    if (q.get("waiting_hours")) rows = rows.filter((c) => c.waiting_since);
    if (q.get("waiting_on") === "client")
      rows = rows.filter((c) => !c.waiting_since);
    return ok({ conversations: rows, total: rows.length });
  }),
  // not in contract but the ops console polls it; must precede :id
  http.get("*/api/admin/chat/conversations/counts", () =>
    ok({
      unassigned: CONVS.filter((c) => !c.claimed_by).length,
      mine: CONVS.filter((c) => c.claimed_by === me().id).length,
      waiting_us: CONVS.filter((c) => c.waiting_since).length,
      handoff: CONVS.filter((c) => c.handoff).length,
      waiting_client: CONVS.filter((c) => !c.waiting_since).length,
      dms: 0,
    }),
  ),
  http.get("*/api/admin/chat/conversations/:id", ({ params }) => {
    const c = findConv(String(params.id));
    return c ? ok(c) : fail(404, "not_found", "Conversation not found");
  }),
  http.get(
    "*/api/admin/chat/conversations/:id/transcript.pdf",
    ({ params, request }) => {
      if (
        new URL(request.url).searchParams.get("include_internal") === "true" &&
        !request.headers.get("X-Step-Up-Token")
      )
        return fail(
          401,
          "step_up_required",
          "Step-up required for internal notes.",
        );
      const csv = new URL(request.url).searchParams.get("format") === "csv";
      return new HttpResponse(`Transcript ${params.id} (mock)\n`, {
        headers: { "Content-Type": csv ? "text/csv" : "application/pdf" },
      });
    },
  ),
  http.get("*/api/admin/chat/metrics", () =>
    ok({
      waiting_for_reply: CONVS.filter((c) => c.waiting_since).length,
      open_disputes: DISPUTES.filter((d) => d.status === "open").length,
      breached_disputes: 0,
      median_first_response_minutes: 14,
    }),
  ),
  http.post("*/api/admin/chat/conversations/:id/claim", ({ params }) => {
    const c = findConv(String(params.id));
    if (!c) return fail(404, "not_found", "Conversation not found");
    if (c.claimed_by && c.claimed_by !== me().id)
      return fail(409, "conflict", `Already claimed by ${c.claimed_by_name}.`);
    Object.assign(c, { claimed_by: me().id, claimed_by_name: me().name });
    return ok(c);
  }),
  http.post(
    "*/api/admin/chat/conversations/:id/link",
    async ({ params, request }) => {
      const c = findConv(String(params.id));
      if (!c) return fail(404, "not_found", "Conversation not found");
      const code = (await body(request)).application_code;
      c.application_code = typeof code === "string" ? code : c.application_code;
      return ok(c);
    },
  ),

  // --- conversations
  http.post("*/api/chat/conversations", async ({ request }) => {
    const b = await body(request);
    const c = conv(
      `conv-${crypto.randomUUID().slice(0, 8)}`,
      "",
      String(b.title ?? "New conversation"),
      null as unknown as string,
      0,
      {
        kind: String(b.kind ?? "staff_dm"),
        code: null,
        application_code: null,
        waiting_since: null,
        unread_for_admin: 0,
        last_message_preview: null,
      },
    );
    CONVS.push(c);
    return ok(c);
  }),
  http.get("*/api/chat/conversations/:id", ({ params }) => {
    const c = findConv(String(params.id));
    return ok(
      c ??
        conv(
          String(params.id),
          String(params.id).replace(/^conv-/, ""),
          "Demo Client",
          "",
          1,
        ),
    );
  }),
  http.get("*/api/chat/conversations/:id/dispute", ({ params }) =>
    ok(
      DISPUTES.find(
        (d) => d.conversation_id === params.id && d.status === "open",
      ) ?? null,
    ),
  ),
  http.post(
    "*/api/chat/conversations/:id/disputes",
    async ({ params, request }) => {
      const d: Dispute = {
        dispute_id: `dsp-${DISPUTES.length + 1}`,
        conversation_id: String(params.id),
        reason: String((await body(request)).reason ?? ""),
        status: "open",
        resolution: null,
        created_at: new Date().toISOString(),
      };
      DISPUTES.push(d);
      const c = findConv(d.conversation_id);
      if (c) c.has_dispute = true;
      return ok(d);
    },
  ),
  http.post("*/api/chat/disputes/:id/resolve", async ({ params, request }) => {
    const d = DISPUTES.find((x) => x.dispute_id === params.id);
    if (!d) return fail(404, "not_found", "Dispute not found");
    Object.assign(d, {
      status: "resolved",
      resolution: String((await body(request)).resolution ?? "resolved"),
    });
    const c = findConv(d.conversation_id);
    if (c) c.has_dispute = false;
    return ok(d);
  }),
  http.get("*/api/chat/conversations/:id/pinned", ({ params }) =>
    ok(
      [...MSGS.values()].filter(
        (m) => m.pinned && m.conversation_id === params.id,
      ),
    ),
  ),
  http.get("*/api/chat/conversations/:id/search", ({ params, request }) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
    return ok({
      results: [...MSGS.values()].filter(
        (m) =>
          m.conversation_id === params.id &&
          q &&
          m.content.toLowerCase().includes(q),
      ),
    });
  }),
  http.post("*/api/chat/conversations/:id/cards", async ({ params, request }) =>
    ok({
      message_id: crypto.randomUUID(),
      conversation_id: params.id,
      kind: "card",
      card: await body(request),
      created_at: new Date().toISOString(),
    }),
  ),
  http.post("*/api/chat/conversations/:id/delivered", () => ok({ updated: 1 })),
  http.post("*/api/chat/conversations/:id/typing", () => ok({ ok: true })),
  http.post("*/api/chat/conversations/:id/join", ({ params }) =>
    ok({ conversation_id: params.id, joined: true }),
  ),
  http.post("*/api/chat/conversations/:id/leave", ({ params }) =>
    ok({ conversation_id: params.id, joined: false }),
  ),
  http.post(
    "*/api/chat/conversations/:id/mute",
    async ({ params, request }) => {
      const muted = (await body(request)).muted !== false;
      const c = findConv(String(params.id));
      if (c) c.muted = muted;
      return ok({ conversation_id: params.id, muted });
    },
  ),
  http.post("*/api/chat/conversations/:id/partner-lane", ({ params }) =>
    ok({ conversation_id: params.id, partner_lane: true }),
  ),
  http.get("*/api/chat/mention-candidates/:id", () => ok(STAFF)),
  http.get("*/api/chat/reference-candidates/:id", () =>
    ok(
      CONVS.filter((c) => c.code).map((c) => ({
        type: "application",
        ref: c.code,
        label: `${c.code} — ${c.client_name}`,
      })),
    ),
  ),
  http.get("*/api/chat/attachments/:id", ({ params }) =>
    ok({
      id: params.id,
      href: `/mock-files/${encodeURIComponent(String(params.id))}`,
      filename: String(params.id).split(":")[1] ?? "file",
      mime: "application/octet-stream",
    }),
  ),

  // --- messages
  http.patch("*/api/chat/messages/:id", async ({ params, request }) => {
    const m = msg(String(params.id));
    const content = String((await body(request)).content ?? "");
    if (!content.trim()) return fail(422, "validation", "content is required");
    m.history.push({
      content: m.content,
      edited_at: m.edited_at ?? new Date().toISOString(),
    });
    Object.assign(m, { content, edited_at: new Date().toISOString() });
    return ok(m);
  }),
  http.delete("*/api/chat/messages/:id", ({ params }) => {
    Object.assign(msg(String(params.id)), { deleted: true, content: "" });
    return ok({ message_id: params.id, deleted: true });
  }),
  http.get("*/api/chat/messages/:id/history", ({ params }) =>
    ok(msg(String(params.id)).history),
  ),
  http.post("*/api/chat/messages/:id/pin", ({ params }) =>
    ok(Object.assign(msg(String(params.id)), { pinned: true })),
  ),
  http.delete("*/api/chat/messages/:id/pin", ({ params }) =>
    ok(Object.assign(msg(String(params.id)), { pinned: false })),
  ),
  http.post(
    "*/api/chat/messages/:id/reactions",
    async ({ params, request }) => {
      const m = msg(String(params.id));
      const emoji = String((await body(request)).emoji ?? "👍");
      const uid = me().id;
      let r = m.reactions.find((x) => x.emoji === emoji);
      if (!r) m.reactions.push((r = { emoji, user_ids: [] }));
      r.user_ids = r.user_ids.includes(uid)
        ? r.user_ids.filter((u) => u !== uid)
        : [...r.user_ids, uid]; // toggle
      m.reactions = m.reactions.filter((x) => x.user_ids.length);
      return ok(m.reactions);
    },
  ),
  http.get(
    "*/api/chat/messages/:id/event.ics",
    ({ params }) =>
      new HttpResponse(
        `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${params.id}\nSUMMARY:Hebuza appointment\nDTSTART:20261120T090000Z\nEND:VEVENT\nEND:VCALENDAR\n`,
        { headers: { "Content-Type": "text/calendar" } },
      ),
  ),

  // --- templates
  http.get("*/api/chat/templates", () => ok(TEMPLATES)),
  http.post("*/api/chat/templates", async ({ request }) => {
    const b = await body(request);
    const t: Template = {
      template_id: `tpl-${crypto.randomUUID().slice(0, 8)}`,
      title: String(b.title ?? ""),
      body_rw: String(b.body_rw ?? ""),
      body_en: String(b.body_en ?? ""),
      body_fr: String(b.body_fr ?? ""),
    };
    if (!t.title) return fail(422, "validation", "title is required");
    TEMPLATES.push(t);
    return ok(t);
  }),
  http.patch("*/api/chat/templates/:id", async ({ params, request }) => {
    const t = TEMPLATES.find((x) => x.template_id === params.id);
    if (!t) return fail(404, "not_found", "Template not found");
    const b = await body(request);
    for (const k of ["title", "body_rw", "body_en", "body_fr"] as const)
      if (typeof b[k] === "string") t[k] = b[k] as string;
    return ok(t);
  }),
  http.delete("*/api/chat/templates/:id", ({ params }) => {
    const i = TEMPLATES.findIndex((x) => x.template_id === params.id);
    if (i < 0) return fail(404, "not_found", "Template not found");
    TEMPLATES.splice(i, 1);
    return ok({ template_id: params.id, deleted: true });
  }),
  http.post("*/api/chat/templates/:id/render", async ({ params, request }) => {
    await delay(100);
    const t = TEMPLATES.find((x) => x.template_id === params.id);
    if (!t) return fail(404, "not_found", "Template not found");
    const locale = new URL(request.url).searchParams.get("locale") ?? "rw";
    const c = findConv(String((await body(request)).conversation_id ?? ""));
    const raw =
      locale === "en" ? t.body_en : locale === "fr" ? t.body_fr : t.body_rw;
    return ok({
      body: raw
        .replace("{client}", c?.client_name ?? "mukiriya")
        .replace("{code}", c?.code ?? ""),
    });
  }),
];

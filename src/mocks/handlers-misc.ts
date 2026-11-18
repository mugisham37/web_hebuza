// Leftover MSW handlers: real /api/agent/* (non-x), staff auth odds and ends, notification prefs, partner cases, realtime.
// Shapes mirror src/server/modules/{agent,auth,notifications,realtime}.* (copied, never imported).
import { http, HttpResponse, delay } from "msw";
import {
  CASES,
  SERVICES,
  clientOf,
  serviceOf,
  agentOf,
  type OpsCase,
} from "./ops-world";
import { ME, STATE, extraOf, myCases } from "./agent-world";
import { agentCase, ok, fail, gate } from "./handlers-agent";
import { PERSONAS, setPersona } from "./personas";
import { DEMO_PASSWORD } from "./handlers-auth";
import { movesFor } from "@/shared/ops/transitions";
import type { CaseStatus } from "@/shared/domain/case-status";

const iso = (ms = Date.now()) => new Date(ms).toISOString();
const find = (code: string) => myCases().find((c) => c.ref === code);
const nf = () => fail(404, "not_found", "Case not found.");
const notes = new Map<
  string,
  {
    id: string;
    kind: "status" | "note" | "document";
    text: string;
    actor: string;
    at: string;
  }[]
>();
const log = (ref: string, kind: "status" | "note" | "document", text: string) =>
  (notes.get(ref) ?? notes.set(ref, []).get(ref)!).unshift({
    id: `ev-${Date.now()}`,
    kind,
    text,
    actor: ME.name,
    at: iso(),
  });

const factsOf = (c: OpsCase) => ({
  status: c.status,
  previous: c.previous ?? null,
  missingItems: c.checklist.filter((i) => i.state !== "provided").length,
  paid: c.payment !== "unpaid",
  complete: true,
  assigneeChosen: true,
  deliverablesUploaded: extraOf(c.ref).slots.filter((s) => s.versions.length)
    .length,
  workStarted: c.status !== "received",
});

function detail(c: OpsCase) {
  const s = serviceOf(c.service),
    cl = clientOf(c.clientId),
    x = extraOf(c.ref);
  const eligible = c.amount ?? 0;
  const mask = (v: string, m: string) => ({
    value: "",
    masked: v ? m : null,
    shared: !!v,
  });
  return {
    ...agentCase(c),
    application_id: `app-${c.ref}`,
    service_slug: s.slug,
    personal_info: { full_name: cl.name, phone: cl.phone, email: cl.email },
    payment_status: c.payment,
    payment_amount: c.amount,
    client_id: cl.id,
    x_agent: {
      ...agentCase(c).x_agent,
      readOnly: null,
      previous: c.previous ?? null,
      dueAt: c.dueAt,
      slaPaused: [
        "awaiting_client_documents",
        "awaiting_external_institution",
        "on_hold",
      ].includes(c.status),
      expectedDecision: c.expectedDecision ?? null,
      outcome:
        c.status === "awaiting_external_institution"
          ? { state: "pending", note: "", at: c.updatedAt, evidence: null }
          : null,
      instructions: x.instructions,
      manager: ME.manager.name,
      instructionsAt: c.createdAt,
      checklist: x.checklist,
      slots: x.slots.map((sl) => ({
        key: sl.key,
        label: sl.label,
        required: sl.required,
        uploaded: sl.versions.length > 0,
      })),
      review: x.review?.state ?? null,
      dispute: x.dispute,
      timesheet: x.timesheet,
      moves: movesFor(factsOf(c), "assignee"),
      answers: [
        {
          key: "full_name",
          label: "fullName",
          value: cl.name,
          masked: null,
          shared: true,
        },
        {
          key: "phone",
          label: "phone",
          ...mask(cl.phone, `•••• ${cl.phone.slice(-4)}`),
        },
        {
          key: "email",
          label: "email",
          ...mask(cl.email, `••••@${cl.email.split("@")[1] ?? ""}`),
        },
        {
          key: "address",
          label: "address",
          value: "",
          masked: null,
          shared: false,
        },
        {
          key: "bank",
          label: "bankAccount",
          value: "",
          masked: null,
          shared: false,
        },
      ],
      notShared: [],
      share: {
        eligible,
        pct: ME.sharePct,
        amount: Math.round(eligible * ME.sharePct),
        state: c.status === "completed_delivered" ? "approved" : "pending",
      },
      events: [
        ...(notes.get(c.ref) ?? []),
        {
          id: `ev-${c.ref}-0`,
          kind: "status",
          text: "Case assigned to you",
          actor: ME.manager.name,
          at: c.createdAt,
        },
      ],
    },
  };
}

const QC = new Map<
  string,
  {
    status: "pending" | "accepted" | "rejected";
    reason?: string;
    note?: string;
  }
>();
const docsOf = (c: OpsCase) =>
  c.checklist
    .filter((i) => i.state !== "missing")
    .map((i, n) => {
      const id = `doc-${c.ref}-${i.key}`,
        q = QC.get(id);
      return {
        document_id: id,
        requirement_key: i.key,
        original_filename: `${i.key}.pdf`,
        file_size_bytes: 180_000 + n * 23_000,
        version: 1,
        is_active: true,
        qc_status:
          q?.status ?? (i.state === "provided" ? "accepted" : "pending"),
        qc_notes: q ? { reason: q.reason, note: q.note } : null,
        created_at: c.createdAt,
        x_agent: {
          label: i.label,
          pages: 2,
          legibility: 0.92,
          expiry: null,
          nameOnDoc: clientOf(c.clientId).name,
        },
      };
    });

// Obligations (client compliance reminders) — module state so done/skip/link stick.
const day = (d: number) => iso(Date.now() + d * 86_400_000).slice(0, 10);
const OBLIGATIONS = myCases()
  .slice(0, 3)
  .map((c, i) => ({
    id: `ob-${i + 1}`,
    clientId: c.clientId,
    label: {
      type: "obligation",
      en: ["Monthly VAT return", "PAYE declaration", "Annual RDB filing"][i],
    },
    dueDate: day([3, 9, 20][i]),
    status: "pending",
    leadDays: 5,
    code: null as string | null,
    note: null as string | null,
  }));

const SETTINGS = {
  accepting_cases: true,
  daily_case_cap: 4 as number | null,
  notification_new_case: true,
  notification_client_reply: true,
  notification_sla_alert: true,
  notification_daily_summary: false,
  is_on_duty: true,
  monthly_percent: null as number | null,
  one_off_percent: ME.sharePct * 100,
  default_monthly_percent: 30,
  default_one_off_percent: 30,
};
const PAPERS = [
  {
    documentId: "pp-id",
    kind: "national_id",
    status: "approved",
    originalFilename: "national_id.pdf",
    uploadedAt: iso(Date.now() - 90 * 86_400_000),
    reviewNote: null as string | null,
  },
  {
    documentId: "pp-cv",
    kind: "cv",
    status: "approved",
    originalFilename: "cv_eric.pdf",
    uploadedAt: iso(Date.now() - 90 * 86_400_000),
    reviewNote: null as string | null,
  },
];
let PREFS = { email_enabled: true, digest_enabled: false };
const staffSession = (p: (typeof PERSONAS)[number]) => ({
  userId: `mock-${p.key}`,
  name: p.name,
  email: p.email,
  phone: null,
  role: p.roles.includes("staff:agent") ? "agent" : "admin",
  roles: p.roles,
  isEmailVerified: true,
  language: "en",
  createdAt: iso(),
  expiresAt: null,
});

const obligation = (action: "done" | "link" | "skip") =>
  async ({ params, request }: { params: Record<string, unknown>; request: Request }) => {
      const b = ((await request.json().catch(() => ({}))) ?? {}) as {
        code?: string;
        reason?: string;
      };
      if (action === "skip" && !b.reason?.trim())
        return fail(422, "reason", "A reason is required.");
      if (action === "link" && !b.code)
        return fail(422, "code", "Choose a case.");
      const o = OBLIGATIONS.find((x) => x.id === params.id);
      if (!o) return fail(404, "not_found", "Obligation not found.");
      if (action === "link") o.code = b.code!;
      else {
        o.status = action === "done" ? "done" : "skipped";
        o.note = b.reason ?? o.note;
      }
      return ok({ id: o.id, state: o.status, code: o.code ?? undefined });
    };

export const handlers = [
  // ---------------------------------------------------------------- agent: case workbench
  http.get("*/api/agent/cases/:code", async ({ params }) => {
    await delay(150);
    const c = find(String(params.code));
    return c ? ok(detail(c)) : nf();
  }),
  http.patch("*/api/agent/cases/:code/status", async ({ params, request }) => {
    const c = find(String(params.code));
    if (!c) return nf();
    const b = (await request.json()) as {
      status: CaseStatus;
      note?: string;
      x_agent?: {
        institution?: string;
        submissionRef?: string;
        submittedOn?: string;
        expectedDecision?: string;
      };
    };
    const m = movesFor(factsOf(c), "assignee").find((x) => x.to === b.status);
    if (!m) return fail(403, "not_allowed", "You can't make this move.");
    if (m.blocked) return fail(409, m.blocked, `Blocked: ${m.blocked}`);
    if (b.status === "on_hold" && !b.note?.trim())
      return fail(422, "reason_required", "Give a reason.");
    if (b.status === "awaiting_external_institution") {
      const i = b.x_agent ?? {};
      if (!i.institution || !i.submissionRef || !i.submittedOn)
        return fail(
          422,
          "institution_required",
          "Institution, submission ref and date are required.",
        );
      Object.assign(c, {
        institution: i.institution,
        submissionRef: i.submissionRef,
        expectedDecision: i.expectedDecision ?? null,
      });
    }
    Object.assign(c, {
      previous: c.status,
      status: b.status,
      updatedAt: iso(),
    });
    log(c.ref, "status", `Status → ${b.status}${b.note ? ` · ${b.note}` : ""}`);
    return ok(detail(c), "Status updated.");
  }),
  http.post("*/api/agent/cases/:code/flag", async ({ params, request }) => {
    const b = (await request.json()) as {
      kind: "attention" | "reassign";
      note: string;
    };
    if (!b.note?.trim()) return fail(422, "note_required", "Pick a reason.");
    const c = find(String(params.code));
    if (!c) return nf();
    log(c.ref, "note", `Flagged to ${ME.manager.name} (${b.kind}): ${b.note}`);
    return ok({ code: c.ref, escalated: true, kind: b.kind });
  }),
  http.post(
    "*/api/agent/cases/:code/propose-due",
    async ({ params, request }) => {
      const b = (await request.json()) as { due_date: string; note: string };
      if (!b.due_date || Date.parse(b.due_date) < Date.now() - 86_400_000)
        return fail(422, "bad_date", "Pick a future date.");
      const c = find(String(params.code));
      if (!c) return nf();
      log(
        c.ref,
        "note",
        `Proposed new due date ${b.due_date}${b.note ? ` · ${b.note}` : ""} — waiting for approval`,
      );
      return ok({ id: `msg-${Date.now()}`, body: b.note, created_at: iso() });
    },
  ),
  http.get("*/api/agent/cases/:code/documents", ({ params }) => {
    const c = find(String(params.code));
    return c ? ok({ documents: docsOf(c) }) : nf();
  }),
  http.post(
    "*/api/agent/cases/:code/documents",
    async ({ params, request }) => {
      const g = gate();
      if (g) return g;
      const c = find(String(params.code));
      if (!c) return nf();
      const f = (await request.formData()).get("file");
      const name = f instanceof File ? f.name : "upload.pdf";
      log(c.ref, "document", `Uploaded ${name}`);
      return ok(
        {
          document_id: `doc-${Date.now()}`,
          original_filename: name,
          file_size_bytes: f instanceof File ? f.size : 0,
          version: 1,
          qc_status: "accepted",
          created_at: iso(),
        },
        "Document uploaded.",
      );
    },
  ),
  http.patch(
    "*/api/agent/cases/:code/documents/:id/qc",
    async ({ params, request }) => {
      const c = find(String(params.code));
      if (!c) return nf();
      const b = (await request.json()) as {
        qc_status: "pending" | "accepted" | "rejected";
        qc_notes?: { reason?: string; note?: string } | null;
      };
      const d = docsOf(c).find((x) => x.document_id === params.id);
      if (!d) return fail(404, "not_found", "Document not found.");
      if (b.qc_status === "rejected" && !b.qc_notes?.reason)
        return fail(422, "reason_required", "A reason is required.");
      QC.set(d.document_id, {
        status: b.qc_status,
        reason: b.qc_notes?.reason,
        note: b.qc_notes?.note,
      });
      const item = c.checklist.find((i) => i.key === d.requirement_key);
      if (item)
        item.state =
          b.qc_status === "accepted"
            ? "provided"
            : b.qc_status === "rejected"
              ? "rejected"
              : "check";
      log(c.ref, "document", `${d.x_agent.label}: ${b.qc_status}`);
      return ok(docsOf(c).find((x) => x.document_id === d.document_id));
    },
  ),

  // ---------------------------------------------------------------- agent: calendar + obligations
  http.get("*/api/agent/calendar", ({ request }) => {
    const q = new URL(request.url).searchParams,
      start = q.get("start"),
      end = q.get("end");
    const now = Date.now(),
      today = day(0);
    const open = myCases().filter(
      (c) =>
        !["completed_delivered", "cancelled", "rejected", "refunded"].includes(
          c.status,
        ),
    );
    const items = [
      ...open.map((c) => ({
        kind: "case",
        id: `dl-${c.ref}`,
        code: c.ref,
        title: serviceOf(c.service).name,
        label: { type: "deadline" },
        serviceName: serviceOf(c.service).name,
        clientId: c.clientId,
        clientName: clientOf(c.clientId).name,
        agentId: ME.id,
        agentName: ME.name,
        dueDate: c.dueAt.slice(0, 10),
        dueAt: c.dueAt,
        state: Date.parse(c.dueAt) < now ? "overdue" : "upcoming",
        status: c.status,
        isUrgent: c.flags.includes("urgent"),
        dueSource: "sla",
        leadDays: 0,
        note: null as string | null,
      })),
      ...OBLIGATIONS.map((o) => ({
        kind: "obligation",
        id: o.id,
        code: o.code,
        title: o.label.en,
        label: o.label,
        serviceName: o.label.en,
        clientId: o.clientId,
        clientName: clientOf(o.clientId).name,
        agentId: ME.id,
        agentName: ME.name,
        dueDate: o.dueDate,
        dueAt: `${o.dueDate}T15:00:00.000Z`,
        state:
          o.status === "pending" && o.dueDate < today ? "overdue" : o.status,
        status: o.status,
        isUrgent: false,
        dueSource: "obligation",
        leadDays: o.leadDays,
        note: o.note,
      })),
    ]
      .filter(
        (i) => (!start || i.dueDate >= start) && (!end || i.dueDate <= end),
      )
      .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
    return ok({
      today,
      start: start ?? items[0]?.dueDate ?? today,
      end: end ?? items.at(-1)?.dueDate ?? today,
      items,
    });
  }),
  http.post("*/api/agent/obligations/:id/done", obligation("done")),
  http.post("*/api/agent/obligations/:id/link", obligation("link")),
  http.post("*/api/agent/obligations/:id/skip", obligation("skip")),
  // ---------------------------------------------------------------- agent: clients, metrics, profile, skills, settings, papers
  http.get("*/api/agent/clients", () => {
    const mine = myCases();
    const ids = [...new Set(mine.map((c) => c.clientId))];
    return ok({
      clients: ids.map((id) => {
        const cl = clientOf(id),
          cs = mine.filter((c) => c.clientId === id);
        const open = cs.filter(
          (c) =>
            ![
              "completed_delivered",
              "cancelled",
              "rejected",
              "refunded",
            ].includes(c.status),
        );
        return {
          clientId: id,
          name: cl.name,
          phone: null,
          planName: cl.flags.includes("subscriber")
            ? "Business monthly"
            : "Pay as you go",
          status: open.length ? "active" : "inactive",
          lastCaseCode: cs.at(-1)?.ref ?? null,
          openCaseCount: open.length,
          focusServices: [...new Set(cs.map((c) => serviceOf(c.service).name))],
          x_agent: {
            type: cl.type,
            dedicated: cl.dedicatedAgentId === ME.id,
            nextObligation: (() => {
              const o = OBLIGATIONS.find(
                (x) => x.clientId === id && x.status === "pending",
              );
              return o
                ? {
                    label: o.label.en,
                    dueAt: `${o.dueDate}T15:00:00.000Z`,
                    ref: o.id,
                  }
                : null;
            })(),
            lastContactAt: cs[0]?.updatedAt ?? null,
          },
        };
      }),
    });
  }),
  http.get("*/api/agent/metrics", () => {
    const done =
      myCases().filter((c) => c.status === "completed_delivered").length + 14;
    return ok({
      completedCount: done,
      completedDelta: "+3",
      avgTurnaround: "2.4 d",
      avgTurnaroundDelta: "-0.3 d",
      onTimeSLAPercent: 94,
      clientRating: 4.7,
      ratingsCount: 18,
      weeklyBars: [3, 5, 2, 4, 6, 4].map((count, i, a) => ({
        week: `W${40 + i}`,
        count,
        isCurrent: i === a.length - 1,
      })),
      leaderboard: [
        { initials: "GU", name: "Grace Uwimana", count: 21, isMe: false },
        { initials: "EH", name: ME.name, count: done, isMe: true },
      ],
      retainerCompleted: 0,
      oneOffCompleted: done,
    });
  }),
  http.patch("*/api/agent/profile", async ({ request }) => {
    const b = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
    };
    Object.assign(
      ME,
      Object.fromEntries(Object.entries(b).filter(([, v]) => v != null)),
    );
    return ok(
      { name: ME.name, email: ME.email, phone: ME.phone },
      "Profile saved.",
    );
  }),
  http.get("*/api/agent/skills", () => {
    const a = agentOf(ME.id) as { skills?: Record<string, number> } | undefined;
    const sk = a?.skills ?? {
      "vat-declaration": 0.8,
      "company-registration": 0.6,
    };
    return ok({
      agent_id: ME.id,
      skills: Object.entries(sk).map(([slug, lvl]) => ({
        service_category: SERVICES.find((s) => s.slug === slug)?.name ?? slug,
        proficiency_level: Math.max(1, Math.round(lvl * 5)),
      })),
      x_agent: { pending: null },
    });
  }),
  http.get("*/api/agent/settings", () =>
    ok({ ...SETTINGS, is_on_duty: STATE.duty === "on" }),
  ),
  http.put("*/api/agent/settings", async ({ request }) => {
    Object.assign(SETTINGS, (await request.json()) as object);
    STATE.duty = SETTINGS.is_on_duty ? "on" : "away";
    return ok(SETTINGS, "Settings saved.");
  }),
  http.get("*/api/agent/papers", () =>
    ok({
      agentId: ME.id,
      name: ME.name,
      cleared: STATE.clearance === "cleared",
      papersStatus: STATE.clearance === "cleared" ? "approved" : "pending",
      papersRequired: true,
      papers: PAPERS,
    }),
  ),
  http.post("*/api/agent/papers", async ({ request }) => {
    const fd = await request.formData(),
      f = fd.get("file");
    const p = {
      documentId: `pp-${Date.now()}`,
      kind: String(fd.get("kind") ?? "other"),
      status: "pending",
      originalFilename: f instanceof File ? f.name : "paper.pdf",
      uploadedAt: iso(),
      reviewNote: null,
    };
    PAPERS.push(p);
    return ok(p, "Paper uploaded.");
  }),
  http.get("*/api/agent/papers/:id/file", ({ params }) =>
    PAPERS.some((p) => p.documentId === params.id)
      ? new HttpResponse(
          new Blob(["%PDF-1.4\n% mock\n"], { type: "application/pdf" }),
          { headers: { "content-type": "application/pdf" } },
        )
      : fail(404, "not_found", "Paper not found."),
  ),

  // ---------------------------------------------------------------- auth leftovers
  http.post("*/api/auth/staff/login", async ({ request }) => {
    await delay(400);
    const b = (await request.json()) as { email: string; password: string };
    const p = PERSONAS.find(
      (x) =>
        x.email === b.email?.trim().toLowerCase() &&
        x.roles.some((r) => r.startsWith("staff:") || r.startsWith("ext:")),
    );
    if (!p || b.password !== DEMO_PASSWORD)
      return fail(
        401,
        "invalid_credentials",
        "Email or password is incorrect.",
      );
    setPersona(p.key);
    return ok(
      { session: staffSession(p), mfaRequired: false },
      "Staff session established.",
    );
  }),
  http.post("*/api/auth/sign-out", () => {
    setPersona(null);
    return ok({ signedOut: true }, "Signed out.");
  }),
  http.get("*/api/auth/invite/:token", ({ params }) =>
    params.token === "bad"
      ? fail(400, "invalid_token", "This link is invalid or has expired.")
      : ok(
          {
            name: "Grace Uwimana",
            email: "grace.uwimana@hebuza.example",
            role: "agent",
            issuedBy: ME.manager.name,
            issuedAt: iso(Date.now() - 3600_000),
            expiresAt: iso(Date.now() + 47 * 3600_000),
          },
          "Link retrieved.",
        ),
  ),
  http.post("*/api/auth/team/access-request", async ({ request }) => {
    const b = (await request.json()) as { email: string };
    return ok(
      {
        reference: `TAR-${String(Date.now()).slice(-6)}`,
        maskedEmail: b.email.replace(/^(.{2}).*(@.*)$/, "$1•••$2"),
      },
      "Request recorded.",
    );
  }),

  // ---------------------------------------------------------------- notifications, partner, realtime
  http.get("*/api/notifications/preferences", () => ok(PREFS)),
  http.patch("*/api/notifications/preferences", async ({ request }) => {
    PREFS = { ...PREFS, ...((await request.json()) as Partial<typeof PREFS>) };
    return ok(PREFS, "Preferences saved.");
  }),
  http.get("*/api/partner/cases", () =>
    ok({
      applications: CASES.filter((c) => c.partnerName).map((c) => ({
        application_id: `app-${c.ref}`,
        code: c.ref,
        service_name: serviceOf(c.service).name,
        service_slug: c.service,
        status: c.status,
        tier: "standard",
        submitted_at: c.createdAt,
        payment_status: c.payment,
        handler: "hebuza",
        ending: "delivered",
        retainer: false,
        assigned_agent_name: c.assignees[0]
          ? agentOf(c.assignees[0].id).name
          : null,
      })),
    }),
  ),
  http.post("*/api/realtime/ticket", () =>
    ok(
      { ticket: `mock-${Date.now()}`, expires_in: 60 },
      "Realtime ticket issued.",
    ),
  ),
  http.post("*/api/realtime/focus", () => ok({ ok: true })),
  http.get("*/api/realtime/stream", ({ request }) => {
    const enc = new TextEncoder();
    let beat: ReturnType<typeof setInterval>;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(": connected\n\n")); // same hello + heartbeat as realtime.service.ts
        beat = setInterval(() => c.enqueue(enc.encode(": ping\n\n")), 25_000);
        request.signal.addEventListener("abort", () => {
          clearInterval(beat);
          try {
            c.close();
          } catch {}
        });
      },
      cancel: () => clearInterval(beat),
    });
    return new HttpResponse(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
      },
    });
  }),
];

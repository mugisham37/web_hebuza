// L-C mocks: /api/track/{code} (real contract), /api/track/{code}/verify and /api/status (not on the server yet).
import { http, HttpResponse, delay } from "msw";
import { sampleStatus, type TrackDetail } from "@/content/pages/lc";

const ok = <T>(data: T) =>
  HttpResponse.json({ success: true, message: "OK", errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );

// HBZ-WMVX19 = nothing needed, HBZ-ACTN01 = action needed. Contact "0788000000" or "anne@example.rw" verifies.
const CASES: Record<
  string,
  { service: string; step: number; detail: TrackDetail }
> = {
  "HBZ-WMVX19": {
    service: "Company registration",
    step: 4,
    detail: {
      timeline: [
        {
          title: "Request received",
          at: "2026-11-09T09:12:00Z",
          state: "done",
        },
        { title: "Under review", at: "2026-11-09T10:40:00Z", state: "done" },
        {
          title: "Documents received",
          at: "2026-11-10T08:30:00Z",
          state: "done",
        },
        { title: "In progress", at: "2026-11-10T09:15:00Z", state: "current" },
        { title: "Done", at: "", state: "todo" },
      ],
      needed: [],
      payment: {
        paid: 20000,
        due: 0,
        method: "MoMo",
        receipt: "RCPT-2026-00381",
      },
      institution: { name: "RDB", decision: "Pending" },
      documents: [
        { name: "ID", verified: true },
        { name: "Company names", verified: false },
        { name: "Shareholding", verified: false },
      ],
    },
  },
  "HBZ-ACTN01": {
    service: "Business licence",
    step: 3,
    detail: {
      timeline: [
        {
          title: "Request received",
          at: "2026-11-08T09:00:00Z",
          state: "done",
        },
        { title: "Under review", at: "2026-11-08T11:00:00Z", state: "done" },
        {
          title: "Awaiting your documents",
          at: "2026-11-09T11:05:00Z",
          note: "1 document missing",
          state: "current",
        },
        { title: "In progress", at: "", state: "todo" },
        { title: "Done", at: "", state: "todo" },
      ],
      needed: [
        { kind: "upload", label: "Proof of business address" },
        { kind: "pay", label: "Balance", amount: 5000 },
      ],
      payment: { paid: 15000, due: 5000, method: "MoMo" },
      institution: { name: "RDB", decision: "Not submitted yet" },
      documents: [{ name: "ID", verified: true }],
    },
  },
};
const VERIFIERS = new Set(["0788000000", "+250788000000", "anne@example.rw"]);

export const handlers = [
  http.get("/api/track/:code", async ({ params }) => {
    await delay(400);
    const code = String(params.code).toUpperCase();
    const c = CASES[code];
    // Same copy for unknown and malformed codes (no existence oracle).
    if (!c) return fail(404, "not_found", "Not found.");
    return ok({
      code,
      service_name: c.service,
      status: c.detail.needed.length ? "action_needed" : "in_progress",
      current_step_number: c.step,
      current_step_title:
        c.detail.timeline.find((t) => t.state === "current")?.title ?? null,
      estimated_completion: "2026-11-14",
      submitted_at: c.detail.timeline[0].at,
      updated_at: "2026-11-10T10:42:00Z",
    });
  }),
  http.post("/api/track/:code/verify", async ({ params, request }) => {
    await delay(400);
    const c = CASES[String(params.code).toUpperCase()];
    const { contact } = (await request.json()) as { contact?: string };
    if (
      !c ||
      !VERIFIERS.has(
        String(contact ?? "")
          .replace(/\s/g, "")
          .toLowerCase(),
      )
    )
      return fail(403, "forbidden", "Does not match.");
    return ok({
      token: crypto.randomUUID(),
      expires_in: 600,
      detail: c.detail,
    });
  }),
  http.get("/api/status", async ({ request }) => {
    await delay(200);
    return ok(
      sampleStatus(
        new URL(request.url).searchParams.get("scenario") === "degraded"
          ? "degraded"
          : "operational",
      ),
    );
  }),
];

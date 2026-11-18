// Stage 6 System Administrator core mocks (plan 06 §9.3 [core]): summary, alerts, setup checklist, the two-person
// approvals engine (list / decide / withdraw) and dev scenarios. Lane endpoints live in handlers-system-{a..f}.ts
// (registered before this file). Lanes import the helpers below; never re-implement them.
// shortcut: ★ mock — drop each handler as the real /api/staff/* endpoint ships.
import { http, HttpResponse, delay, passthrough } from "msw";
import { ok, fail } from "./handlers-agent";
import {
  ALERTS, CHANGES, INTEGRATIONS, SysError, TEMPLATES, USERS, WORLD, actor, changeOf, isExec, isSysadmin, record, setupItems, summary, sweepChanges, type Scenario,
} from "./system-world";
import { readOnlyGuard } from "./system-guards";
import { SETTINGS } from "@/shared/system/settings-registry";
import { decide, withdraw } from "@/shared/system/approvals";
import type { ChangeKind, ChangeRequestVM } from "@/shared/system/types";

export { ok, fail };
export const accepted = <T,>(data: T) => HttpResponse.json({ success: true, message: "Pending approval", errorType: null, data }, { status: 202 });

/** 403 unless the caller is a sysadmin (or an executive when `exec`). Returns null when allowed. */
export function guard(exec = false) {
  if (isSysadmin() || (exec && isExec())) return null;
  return fail(403, "forbidden_role", "Not available to your role.");
}
/** For paths other stages also mock (e.g. GET /api/staff/audit): answer sysadmins, let everyone else fall through. */
export const sysOrPass = () => (isSysadmin() ? null : passthrough());
/** Read-only while impersonating (F-IAM-15). Call first in every non-GET system handler. */
export { readOnlyGuard };

/** Step-up token from useStepUp() (`su_…`, issued by POST /api/auth/mfa/step-up in handlers-ops-c). X-7: 5-minute window. */
export const stepUpOk = (r: Request) => !!r.headers.get("x-step-up-token")?.startsWith("su_");
export const needStepUp = () => fail(401, "step_up_required", "Confirm it's you first.");
/** Optimistic concurrency: `If-Match: <version>` must equal the resource version (409 stale). */
export const stale = (r: Request, version: number) => {
  const m = r.headers.get("if-match");
  return m !== null && Number(m) !== version ? fail(409, "stale", "Changed since you loaded it.") : null;
};
/** SysError → envelope; anything else rethrows. */
export function failFrom(e: unknown) {
  if (e instanceof SysError) return HttpResponse.json({ success: false, message: e.code, errorType: e.code, data: e.extra ?? null }, { status: e.status });
  throw e;
}
const seen = new Map<string, Response>();
/** Idempotency-Key replay: the first successful response for a key is returned again. */
export async function idempotent(r: Request, run: () => Promise<Response> | Response) {
  const key = r.headers.get("idempotency-key");
  if (key && seen.has(key)) return seen.get(key)!.clone();
  const res = await run();
  if (key && res.ok) seen.set(key, res.clone());
  return res;
}

// ---------------------------------------------------------------- change appliers (lanes register; core calls on `applied`)
const APPLIERS = new Map<ChangeKind, (cr: ChangeRequestVM) => void>();
/** Lane hook: what happens when a change of this kind is applied (grant the role, write the setting, …). */
export const onApply = (kind: ChangeKind, fn: (cr: ChangeRequestVM) => void) => void APPLIERS.set(kind, fn);
function applied(cr: ChangeRequestVM) {
  APPLIERS.get(cr.kind)?.(cr);
  record("config.change.applied", "change", cr.id, undefined, cr.after, undefined, undefined, { approvalRef: cr.id });
}
/** Lane helper: store a proposal (already built with `propose()`), audit it, return 202. */
export function submitChange(cr: ChangeRequestVM) {
  CHANGES.unshift(cr);
  record("config.change.proposed", "change", cr.id, cr.before, cr.after, cr.reason, undefined, { approvalRef: cr.id });
  return accepted(cr);
}

export const handlers = [
  http.get("/api/staff/x/summary", async () => {
    await delay(150);
    return guard() ?? ok(summary());
  }),
  http.get("/api/staff/x/alerts", async () => {
    await delay(200);
    return guard() ?? ok({ items: ALERTS });
  }),
  http.post("/api/staff/x/alerts/read", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const { ids } = (await request.json()) as { ids: string[] | "all" };
    ALERTS.forEach((a) => { if (ids === "all" || ids.includes(a.id)) a.read = true; });
    return ok({ items: ALERTS });
  }),
  http.get("/api/staff/x/setup", async () => {
    await delay(150);
    return guard() ?? ok({ items: setupItems() });
  }),
  /** ⌘K sources (§8.3): users, settings keys, integrations, templates. Never case refs. Emails masked. */
  http.get("/api/staff/x/search", async ({ request }) => {
    await delay(120);
    const g = guard();
    if (g) return g;
    const n = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
    if (!n) return ok({ users: [], settings: [], integrations: [], templates: [] });
    const has = (...xs: string[]) => xs.some((x) => x.toLowerCase().includes(n));
    return ok({
      users: USERS.filter((u) => has(u.name, u.email)).slice(0, 6).map((u) => ({ id: u.id, name: u.name, email: u.email.replace(/^(.{1,5}).*@/, "$1…@"), kind: u.kind })),
      settings: SETTINGS.filter((d) => has(d.key)).slice(0, 5).map((d) => ({ key: d.key, group: d.group })),
      integrations: INTEGRATIONS.filter((i) => has(i.name, i.key)).slice(0, 4).map((i) => ({ key: i.key, name: i.name })),
      templates: TEMPLATES.filter((t) => has(t.key)).slice(0, 4).map((t) => ({ key: t.key, channel: t.channel })),
    });
  }),
  http.get("/api/staff/x/changes", async ({ request }) => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    sweepChanges();
    const q = new URL(request.url).searchParams;
    const area = q.get("area"), state = q.get("state");
    const exec = !isSysadmin();
    const items = CHANGES.filter((c) =>
      (!area || area === "all" || c.area === area) &&
      (!state || (state === "pending" ? c.state === "proposed" : c.state !== "proposed")) &&
      (!exec || c.approvers.some((a) => a.role === "staff:executive" || a.anyOf?.includes("staff:executive"))));
    return ok({ items });
  }),
  http.get("/api/staff/x/changes/:id", async ({ params }) => {
    await delay(150);
    const g = guard(true);
    if (g) return g;
    sweepChanges();
    const cr = changeOf(String(params.id));
    return cr ? ok(cr) : fail(404, "not_found", "Not found.");
  }),
  http.post("/api/staff/x/changes/:id/decision", async ({ request, params }) => {
    const g = guard(true) ?? readOnlyGuard();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = (await request.json()) as { decision: "approve" | "reject"; reason?: string };
    return idempotent(request, () => {
      sweepChanges();
      const i = CHANGES.findIndex((c) => c.id === params.id);
      if (i < 0) return fail(404, "not_found", "Not found.");
      const cur = CHANGES[i];
      const conflict = stale(request, cur.version);
      if (conflict && cur.state === "proposed") return conflict;
      const res = decide(cur, actor(), b.decision, Date.now(), b.reason);
      if (!res.ok) {
        const status = res.error === "expired" ? 410 : res.error === "already_decided" ? 409 : res.error === "reason_required" ? 422 : 403;
        return HttpResponse.json({ success: false, message: res.error, errorType: res.error, data: cur }, { status });
      }
      CHANGES[i] = res.next;
      record(b.decision === "approve" ? "config.change.approved" : "config.change.rejected", "change", cur.id, { state: cur.state }, { state: res.next.state }, b.reason, undefined, { approvalRef: cur.id });
      if (res.next.state === "applied") applied(res.next);
      return ok(res.next);
    });
  }),
  http.post("/api/staff/x/changes/:id/withdraw", async ({ request, params }) => {
    const g = guard(true) ?? readOnlyGuard();
    if (g) return g;
    return idempotent(request, () => {
      const i = CHANGES.findIndex((c) => c.id === params.id);
      if (i < 0) return fail(404, "not_found", "Not found.");
      const res = withdraw(CHANGES[i], actor().id);
      if (!res.ok) return fail(res.error === "already_decided" ? 409 : 403, res.error, res.error);
      CHANGES[i] = res.next;
      record("config.change.withdrawn", "change", res.next.id, undefined, undefined, undefined, undefined, { approvalRef: res.next.id });
      return ok(res.next);
    });
  }),
  /** Dev only: `normal | fresh | outage | tampered` (plan §9.5). Rendered behind NEXT_PUBLIC_API_MOCKING. */
  http.post("/api/staff/x/simulate", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const { scenario } = (await request.json()) as { scenario: Scenario };
    WORLD.scenario = scenario;
    return ok({ scenario });
  }),
];

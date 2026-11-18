// Stage 5 finance core mocks (plan 05 §9.2–9.3): summary, approvals inbox, notifications, settings + changes, audit,
// payables stub, simulate. Lane endpoints live in handlers-finance-{a..f}.ts (registered before this file).
// shortcut: ★ mock — drop each handler as the real /api/finance/* endpoint ships.
import { http, HttpResponse, delay } from "msw";
import { ok, fail } from "./handlers-agent";
import { auditAll, auditFor } from "./audit";
import {
  FinError, SETTINGS, SETTING_CHANGES, actor, approvalsFor, decideSetting, isFinanceUser, notesFor, proposeSetting, summary, sweep,
} from "./finance-world";
import type { FinanceSettingKey } from "@/shared/finance/types";

// ---- helpers lanes import (never re-implement)
/** Step-up token from useStepUp() (ops AU7 mock issues `su_…`). */
export const stepUpOk = (r: Request) => !!r.headers.get("x-step-up-token")?.startsWith("su_");
export const needStepUp = () => fail(401, "step_up_required", "Confirm it's you first.");
/** Finance users, plus executives where `exec` is true (X-6 / D12). */
export function guard(exec = false) {
  const a = actor();
  if (isFinanceUser(a) || (exec && a.roles.includes("staff:executive"))) return null;
  return fail(403, "forbidden", "Finance only.");
}
/** FinError → envelope; anything else rethrows. */
export function failFrom(e: unknown) {
  if (e instanceof FinError) return fail(e.status, e.code, e.code);
  throw e;
}
const seen = new Map<string, Response>();
/** Idempotency-Key replay: the first response for a key is returned again (plan §7 global what-ifs). */
export async function idempotent(r: Request, run: () => Promise<Response> | Response) {
  const key = r.headers.get("idempotency-key");
  if (key && seen.has(key)) return seen.get(key)!.clone();
  const res = await run();
  if (key && res.ok) seen.set(key, res.clone());
  return res;
}
const accepted = <T,>(data: T) => HttpResponse.json({ success: true, message: "Pending approval", errorType: null, data }, { status: 202 });

export const handlers = [
  http.get("/api/finance/x/summary", async () => {
    await delay(150);
    return guard(true) ?? ok(summary());
  }),
  http.get("/api/finance/x/approvals", async ({ request }) => {
    await delay(200);
    const type = new URL(request.url).searchParams.get("type");
    return guard(true) ?? ok({ items: approvalsFor().filter((i) => !type || i.type === type) });
  }),
  http.get("/api/finance/x/notifications", async () => {
    await delay(150);
    return guard(true) ?? ok({ items: notesFor() });
  }),
  http.get("/api/finance/x/payables-due", async () => {
    await delay(150);
    // shortcut: payables tile reads a stub, replace in Stage 12.
    return guard(true) ?? ok({ total: 0, count: 0, items: [] });
  }),
  http.get("/api/finance/settings", async () => {
    await delay(200);
    return guard(true) ?? ok({ items: SETTINGS, changes: SETTING_CHANGES });
  }),
  http.patch("/api/finance/settings", async ({ request }) => {
    const g = guard();
    if (g) return g;
    const b = (await request.json()) as { key: FinanceSettingKey; value: unknown; effectiveAt: string; reason: string };
    return idempotent(request, () => { try { return accepted(proposeSetting(b)); } catch (e) { return failFrom(e); } });
  }),
  http.get("/api/staff/settings/changes", async () => {
    await delay(150);
    return guard(true) ?? ok({ items: SETTING_CHANGES });
  }),
  http.post("/api/staff/settings/changes/:id/decision", async ({ request, params }) => {
    if (!stepUpOk(request)) return needStepUp();
    const b = (await request.json()) as { decision: "approve" | "reject"; reason?: string };
    return idempotent(request, () => { try { return ok(decideSetting(String(params.id), b.decision, b.reason ?? "")); } catch (e) { return failFrom(e); } });
  }),
  http.get("/api/staff/audit", async ({ request }) => {
    await delay(200);
    const g = guard(true);
    if (g) return g;
    const q = new URL(request.url).searchParams;
    const type = q.get("resource_type"), id = q.get("resource_id"), cat = q.get("category");
    const rows = type && id ? auditFor(type, id) : auditAll();
    return ok({ items: cat ? rows.filter((e) => e.action.startsWith(`${cat}.`)) : rows });
  }),
  http.post("/api/finance/x/simulate/sweep", async () => {
    const g = guard();
    return g ?? ok({ expired: sweep() });
  }),
];

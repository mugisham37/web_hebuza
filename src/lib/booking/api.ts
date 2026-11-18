"use client";
// Booking + staff-AI data layer (plan 11 §6). Own fetcher so 409 bodies (nearest slots, free-limit date) reach the UI.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type {
  AdminBookings, AiSessionRow, AiSettings, AiTranscript, Availability, Booking, BookingAnalytics, CallbackRequest, Cluster, ConsultationType, CopilotResult, EvalRun,
  HandoffItem, Hold, KbSource, SessionSummary, SlotsResponse, StaffBooking, Adviser,
} from "@/shared/booking/types";
import type { AuditEvent } from "@/mocks/audit";

export class BkgError extends ApiError {
  constructor(status: number, errorType: string | null, message: string, public data: Record<string, unknown> | null) { super(status, errorType, message, null); }
}
type Env = { success?: boolean; errorType?: string; message?: string; data?: unknown };
/** Like `unwrap`, but keeps the envelope `data` on errors (409 nearest slots, free-limit date) as BkgError.data. */
export async function bk<T = unknown>(call: Promise<{ data?: unknown; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await call;
  const env = (error ?? data ?? {}) as Env;
  if (!response.ok || env.success === false) throw new BkgError(response.status, env.errorType ?? null, env.message ?? response.statusText, (env.data as Record<string, unknown>) ?? null);
  return env.data as T;
}
/** Idempotency header for writes; pass one `key` per user intent. */
export const idem = (key = newIdempotencyKey()) => ({ "Idempotency-Key": key });
const path = <K extends string>(k: K, v: string) => ({ params: { path: { [k]: v } as Record<K, string> } });

export const bkgKeys = {
  all: ["bkg"] as const,
  types: (c?: string) => ["bkg", "types", c ?? ""] as const,
  slots: (t: string, from: string, to: string, a: string | null) => ["bkg", "slots", t, from, to, a ?? "any"] as const,
  mine: (scope: string) => ["bkg", "me", scope] as const,
};

export const useTypes = () => useQuery({ queryKey: bkgKeys.types(), queryFn: () => bk<ConsultationType[]>(api.GET("/api/consultation-types")) });
export const useType = (slug: string) => useQuery({ queryKey: ["bkg", "type", slug], queryFn: () => bk<ConsultationType>(api.GET("/api/consultation-types/{slug}", path("slug", slug))), retry: false });
export const useAdvisers = (type: string) => useQuery({ queryKey: ["bkg", "advisers", type], queryFn: () => bk<Adviser[]>(api.GET("/api/consultation-advisers", { params: { query: { type } } })) });
export const useSlots = (type: string, from: string, to: string, adviser: string | null, enabled = true) =>
  useQuery({ queryKey: bkgKeys.slots(type, from, to, adviser), queryFn: () => bk<SlotsResponse>(api.GET("/api/consultation-types/{slug}/slots", { params: { path: { slug: type }, query: { from, to, adviser_id: adviser ?? undefined } } })), staleTime: 30_000, refetchOnWindowFocus: true, enabled });
export const holdSlot = (b: { type: string; starts_at: string; adviser_id: string | null; release?: string | null }) => bk<Hold>(api.POST("/api/bookings/hold", { body: b, headers: idem() }));

export const useMyBookings = (scope: "upcoming" | "past") => useQuery({ queryKey: bkgKeys.mine(scope), queryFn: () => bk<Booking[]>(api.GET("/api/me/bookings", { params: { query: { scope } } })) });
export const useAdviserBookings = (from: string, to: string) => useQuery({ queryKey: ["bkg", "adviser", from, to], queryFn: () => bk<StaffBooking[]>(api.GET("/api/agent/bookings", { params: { query: { from, to } } })) });
export const useAvailability = () => useQuery({ queryKey: ["bkg", "availability"], queryFn: () => bk<Availability>(api.GET("/api/agent/availability")) });
export type RoomData = StaffBooking & { previous: { reference: string; startsAt: string; status: string; typeName: Record<string, string> }[]; history: AuditEvent[] };
export const useRoom = (id: string, staff: boolean) => useQuery({ queryKey: ["bkg", "room", id], queryFn: () => bk<RoomData>(staff ? api.GET("/api/admin/bookings/{id}", path("id", id)) : api.GET("/api/agent/bookings/{id}", path("id", id))), retry: false });
export const useAdminBookings = (q: string) => useQuery({ queryKey: ["bkg", "admin", q], queryFn: () => bk<AdminBookings>(api.GET("/api/admin/bookings", { params: { query: Object.fromEntries(new URLSearchParams(q)) } })), retry: false });
export const useCallbacks = () => useQuery({ queryKey: ["bkg", "callbacks"], queryFn: () => bk<CallbackRequest[]>(api.GET("/api/admin/consultation-requests")) });
export const useTypeAdmin = () => useQuery({ queryKey: ["bkg", "type-admin"], queryFn: () => bk<{ types: ConsultationType[]; advisers: { id: string; name: string }[]; canEdit: "all" | "copy" }>(api.GET("/api/admin/consultation-types")), retry: false });
export const useAnalytics = () => useQuery({ queryKey: ["bkg", "analytics"], queryFn: () => bk<BookingAnalytics>(api.GET("/api/admin/bookings/analytics")) });

/** Mutation that invalidates every booking query. Pass one `key` per dialog instance. */
export function useBkgMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: bkgKeys.all }) });
}

// Staff AI
export const useKb = () => useQuery({ queryKey: ["aia", "kb"], queryFn: () => bk<{ items: KbSource[]; canFacts: boolean; canTone: boolean; canReindex: boolean }>(api.GET("/api/admin/kb-sources")), retry: false });
export const useKbOne = (id: string) => useQuery({ queryKey: ["aia", "kb", id], queryFn: () => bk<{ item: KbSource; canFacts: boolean; canTone: boolean; canReindex: boolean; history: AuditEvent[] }>(api.GET("/api/admin/kb-sources/{id}", path("id", id))), retry: false });
export const useAiSessions = (q: string) => useQuery({ queryKey: ["aia", "sessions", q], queryFn: () => bk<AiSessionRow[]>(api.GET("/api/admin/assistant/sessions", { params: { query: Object.fromEntries(new URLSearchParams(q)) as { handoff?: "true" | "false" } } })), retry: false });
export const useTranscript = (id: string) => useQuery({ queryKey: ["aia", "t", id], queryFn: () => bk<AiTranscript>(api.GET("/api/admin/assistant/sessions/{id}", path("id", id))), retry: false });
export const useClusters = () => useQuery({ queryKey: ["aia", "clusters"], queryFn: () => bk<Cluster[]>(api.GET("/api/admin/assistant/unanswered")) });
export const useEvals = () => useQuery({ queryKey: ["aia", "evals"], queryFn: () => bk<EvalRun[]>(api.GET("/api/admin/assistant/evals/runs")) });
export const useAiSettings = () => useQuery({ queryKey: ["aia", "settings"], queryFn: () => bk<AiSettings & { canEdit: boolean }>(api.GET("/api/admin/assistant/settings")) });
export const useHandoffs = () => useQuery({ queryKey: ["aia", "handoffs"], queryFn: () => bk<HandoffItem[]>(api.GET("/api/admin/assistant/handoffs")), retry: false });
export const useRecentSessions = (enabled: boolean) => useQuery({ queryKey: ["aia", "recent"], queryFn: () => bk<SessionSummary[]>(api.GET("/api/assistant/sessions")), enabled, retry: false });
export function useAiMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: ["aia"] }) });
}
export const copilot = (kind: "summary" | "draft-reply" | "completeness" | "queue-summary", body: object) => bk<CopilotResult>(api.POST("/api/assistant/copilot/{kind}", { params: { path: { kind } }, body, headers: idem() }));

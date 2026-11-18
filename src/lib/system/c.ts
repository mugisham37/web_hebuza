"use client";
// Stage 6 system lane C hooks (U5–U9): roles, custom roles, access reviews, SoD, break-glass. Keys under ["system", "c", …].
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLES, type Role } from "@/shared/auth/roles";
import type { Scope } from "@/shared/auth/permissions";
import { sysKeys } from "./api";
import type {
  AuditEntryVM, BreakGlassVM, ChangeRequestVM, Iso, PersonRef, ReviewCampaignVM, ReviewDecision, SodPair, SodWaiverVM,
} from "@/shared/system/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";
import { ifMatchHdr } from "@/lib/system/api";

// ---------------------------------------------------------------- shapes (shared with handlers-system-c)
export type RoleRowVM = {
  slug: string; role: string; name: string; builtin: boolean; privileged: boolean; members: number;
  lastChangedAt: Iso | null; status: "active" | "retired"; pending: boolean;
  description?: string; base?: string; perms?: Record<string, Scope>; version: number;
};
export type RoleDetailVM = RoleRowVM & { memberList: { id: string; name: string; email: string }[]; change: ChangeRequestVM | null };
export type CustomRoleInput = { name: string; description: string; base: string; perms: Record<string, Scope> };
export type SodVM = {
  pairs: SodPair[]; process: { maker: string; checker: string; rule: string }[]; waivers: SodWaiverVM[];
  pending: ChangeRequestVM[]; exceptions: AuditEntryVM[]; people: { id: string; name: string; roles: string[] }[];
};
export type CampaignRowVM = Omit<ReviewCampaignVM, "items"> & { done: number; total: number; pct: number; kept: number; removed: number; suspended: number };
export type BreakGlassViewVM = BreakGlassVM & { change: ChangeRequestVM | null; approvers: (PersonRef & { role: Role })[] };
export type WaiverInput = { userId: string; pair: [string, string]; why: string; expiresAt: Iso };
export type BreakGlassInput = { reason: string; minutes: 60 | 120 | 240; incidentId?: string };

/** Built-in role ↔ URL slug (`staff:sysadmin` ↔ `sysadmin`, `ext:agent` ↔ `ext-agent`). */
export const roleSlug = (r: string) => (r === "ext:agent" ? "ext-agent" : r.replace(/^staff:/, ""));
export const slugRole = (s: string): string | null =>
  (ROLES as readonly string[]).find((r) => roleSlug(r) === s) ?? null;

export const cKeys = {
  roles: () => ["system", "c", "roles"] as const,
  role: (slug: string) => ["system", "c", "role", slug] as const,
  sod: () => ["system", "c", "sod"] as const,
  sodCheck: (roles: string[]) => ["system", "c", "sod-check", ...roles] as const,
  reviews: () => ["system", "c", "reviews"] as const,
  review: (id: string) => ["system", "c", "review", id] as const,
  breakGlass: () => ["system", "c", "break-glass"] as const,
};

// ---------------------------------------------------------------- U5/U6 roles
export const useRoles = () =>
  useQuery({ queryKey: cKeys.roles(), queryFn: () => unwrap<{ items: RoleRowVM[]; customEnabled: boolean }>(api.GET("/api/staff/x/roles")) });
export const useRole = (slug: string | undefined) =>
  useQuery({ queryKey: cKeys.role(slug ?? ""), queryFn: () => unwrap<RoleDetailVM>(api.GET("/api/staff/x/roles/{slug}", { params: { path: { slug: slug ?? "" } } })), enabled: !!slug });

export function useSaveRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { input: CustomRoleInput; token: string; slug?: string; version?: number; reason: string }) =>
      v.slug
        ? unwrap<ChangeRequestVM>(api.PATCH("/api/staff/x/roles/{slug}", { params: { path: { slug: v.slug } }, body: { ...v.input, reason: v.reason }, headers: ifMatchHdr(v.version ?? 0, v.token) }))
        : unwrap<ChangeRequestVM>(api.POST("/api/staff/x/roles", { body: { ...v.input, reason: v.reason }, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}
export function useRetireRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { slug: string; version: number; token: string }) =>
      unwrap<RoleRowVM>(api.POST("/api/staff/x/roles/{slug}/retire", { params: { path: { slug: v.slug } }, headers: ifMatchHdr(v.version, v.token) })),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}

// ---------------------------------------------------------------- U8 SoD
export const useSod = () => useQuery({ queryKey: cKeys.sod(), queryFn: () => unwrap<SodVM>(api.GET("/api/staff/x/sod")) });
export const useSodCheck = (roles: string[]) =>
  useQuery({
    queryKey: cKeys.sodCheck(roles),
    queryFn: () => unwrap<{ ok: boolean; conflicts: SodPair[] }>(api.GET("/api/staff/x/sod/check", { params: { query: { roles: encodeURIComponent(roles.join(",")) } } })),
    enabled: roles.length > 1,
  });
export function useRequestWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { input: WaiverInput; token: string }) => unwrap<ChangeRequestVM>(api.POST("/api/staff/x/sod/waivers", { body: v.input, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}

// ---------------------------------------------------------------- U7 access reviews
export const useReviews = () =>
  useQuery({ queryKey: cKeys.reviews(), queryFn: () => unwrap<{ items: CampaignRowVM[] }>(api.GET("/api/staff/x/access-reviews")) });
export const useReview = (id: string) =>
  useQuery({ queryKey: cKeys.review(id), queryFn: () => unwrap<ReviewCampaignVM>(api.GET("/api/staff/x/access-reviews/{id}", { params: { path: { id: id } } })) });

/** Per-row decision, optimistic with rollback (U7). `reviewerId` reassigns instead. */
export function useDecideItem(id: string) {
  const qc = useQueryClient();
  const key = cKeys.review(id);
  return useMutation({
    mutationFn: (v: { itemId: string; decision?: ReviewDecision; reviewerId?: string; version: number }) =>
      unwrap<ReviewCampaignVM>(api.PATCH("/api/staff/x/access-reviews/{id}/items/{itemId}", { params: { path: { id: id, itemId: v.itemId } }, body: { decision: v.decision, reviewerId: v.reviewerId }, headers: ifMatchHdr(v.version) })),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ReviewCampaignVM>(key);
      if (prev && v.decision)
        qc.setQueryData<ReviewCampaignVM>(key, { ...prev, items: prev.items.map((i) => (i.id === v.itemId ? { ...i, decision: v.decision as ReviewDecision } : i)) });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSuccess: (d) => qc.setQueryData(key, d),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}
export function useBulkKeep(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { ids: string[]; version: number }) =>
      unwrap<ReviewCampaignVM>(api.POST("/api/staff/x/access-reviews/{id}/bulk-keep", { params: { path: { id: id } }, body: { ids: v.ids }, headers: ifMatchHdr(v.version) })),
    onSuccess: (d) => qc.setQueryData(cKeys.review(id), d),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}
export function useSignOff(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { version: number; token: string }) =>
      unwrap<ReviewCampaignVM>(api.POST("/api/staff/x/access-reviews/{id}/sign-off", { params: { path: { id: id } }, headers: ifMatchHdr(v.version, v.token) })),
    onSuccess: (d) => qc.setQueryData(cKeys.review(id), d),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}
export function useExportReview(id: string) {
  return useMutation({
    mutationFn: (token: string) => unwrap<{ ref: string; at: Iso }>(api.POST("/api/staff/x/access-reviews/{id}/export", { params: { path: { id: id } }, headers: hdr({ stepUp: token, idempotent: true }) })),
  });
}

// ---------------------------------------------------------------- U9 break-glass
export const useBreakGlass = () =>
  useQuery({ queryKey: cKeys.breakGlass(), queryFn: () => unwrap<BreakGlassViewVM>(api.GET("/api/staff/x/break-glass")), refetchInterval: 15_000 });
export function useBreakGlassAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { kind: "request"; input: BreakGlassInput; token: string } | { kind: "end" } | { kind: "review"; note: string; token: string }) =>
      v.kind === "request"
        ? unwrap<BreakGlassViewVM>(api.POST("/api/staff/x/break-glass", { body: v.input, headers: hdr({ stepUp: v.token, idempotent: true }) }))
        : v.kind === "end"
          ? unwrap<BreakGlassViewVM>(api.POST("/api/staff/x/break-glass/end", { headers: hdr({ idempotent: true }) }))
          : unwrap<BreakGlassViewVM>(api.POST("/api/staff/x/break-glass/review", { body: { note: v.note }, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}

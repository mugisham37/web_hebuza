"use client";
// Stage 6 system lane A hooks (Project/SYSTEM-AGENT-BRIEF.md): Overview cards (U1) + "propose again" for expired
// requests (U2). Keys under ["system", "a", …]; mutations invalidate sysKeys.all.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sysKeys } from "./api";
import type { AuditCategory, BudgetVM, ChangeRequestVM, ComponentHealthVM, Iso, ReviewCampaignVM } from "@/shared/system/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";

/** One Overview card. `ok:false` = source unreachable; `data` is the last known value from `at` (OV3). */
export type Card<T> = { ok: true; data: T; at: Iso } | { ok: false; data: T | null; at: Iso | null };
export type RecentChange = { id: string; at: Iso; actorLabel: string; action: string; category: AuditCategory; resourceType: string; resourceId: string };
export type OverviewVM = {
  health: Card<ComponentHealthVM[]>;
  users: Card<{ active: number; invited: number; locked: number }>;
  posture: Card<{ enrolled: number; total: number; pendingFirst: number; withoutKey: number; ipAllowlist: boolean }>;
  backup: Card<{ lastAt: Iso | null; ok: boolean; nextAt: Iso | null; drillAt: Iso | null }>;
  integrations: Card<{ ok: number; degraded: number; untested: number; notSetUp: number }>;
  budgets: Card<BudgetVM[]>;
  review: Card<(Pick<ReviewCampaignVM, "id" | "name" | "status" | "dueAt"> & { decided: number; total: number }) | null>;
  recent: Card<RecentChange[]>;
};

export const aKeys = { overview: () => ["system", "a", "overview"] as const };

/** Overview polls 30 s (DoD "Stale"). */
export const useOverview = () =>
  useQuery({ queryKey: aKeys.overview(), queryFn: () => unwrap<OverviewVM>(api.GET("/api/staff/x/overview")), refetchInterval: 30_000 });

/** Expired request → proposer files a fresh copy (same kind/diff/payload, new 48 h clock). Step-up required. */
export function usePropose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; token: string }) => unwrap<ChangeRequestVM>(api.POST("/api/staff/x/changes/{id}/repropose", { params: { path: { id: v.id } }, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}

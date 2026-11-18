"use client";
// F-CAL-01 compliance rules (spec 05-modules/deadlines-and-compliance-calendar §8, §11, §12): types, occurrence preview,
// validation (pure, in rules.ts, shared with the server) and query hooks over /api/admin/compliance-calendar.
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ComplianceRule, RuleInput } from "@/shared/ops/rules";

export { AUTHORITIES, nextDates, validateRule } from "@/shared/ops/rules";
export type { Authority, Recurrence, DueRule, ComplianceRule, RuleInput, RuleErrors } from "@/shared/ops/rules";

const key = ["ops", "compliance-rules"] as const;

export const useComplianceRules = () =>
  useQuery({
    queryKey: key,
    queryFn: () =>
      unwrap<{ items: ComplianceRule[] }>(api.GET("/api/admin/compliance-calendar")),
    retry: false,
  });
export function useRuleMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
export const createRule = (b: RuleInput) =>
  unwrap<ComplianceRule>(api.POST("/api/admin/compliance-calendar", { body: b, headers: hdr({
    idempotent: true,
  }) }));
export const patchRule = (id: string, b: Partial<RuleInput>) =>
  unwrap<ComplianceRule>(api.PATCH("/api/admin/compliance-calendar/{id}", { params: { path: { id: id } }, body: b }));

"use client";
// Stage 6 system lane D hooks: U12 Settings + U12b Integrations. Keys under ["system", "d", …].
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, unwrap } from "@/lib/api/client";
import { sysKeys } from "./api";
import type { ChangeRequestVM, IntegrationVM, Iso, SettingValueVM } from "@/shared/system/types";
import { hdr } from "@/lib/ops/c";
import { ifMatchHdr } from "@/lib/system/api";

export type SettingsBundle = { values: Record<string, SettingValueVM>; version: number; pending: ChangeRequestVM[]; change?: ChangeRequestVM };
export type LanguageDraft = { code: string; name: string; stage: "draft" | "translating" | "review" | "published"; createdAt: Iso; by: string };
export type LanguageReport = { total: number; locales: Record<"rw" | "en" | "fr", string[]>; drafts: LanguageDraft[] };
export type IntegrationLog = { id: string; at: Iso; op: string; status: number; ms: number; requestId: string };
export type IntegrationDetail = IntegrationVM & { logs: IntegrationLog[]; daily: number[]; payLater: boolean; change?: ChangeRequestVM };

export const dKeys = {
  settings: ["system", "d", "settings"] as const,
  languages: ["system", "d", "languages"] as const,
  myIp: ["system", "d", "my-ip"] as const,
  integrations: ["system", "d", "integrations"] as const,
  integration: (key: string) => ["system", "d", "integration", key] as const,
};

export const useSettings = () => useQuery({ queryKey: dKeys.settings, queryFn: () => unwrap<SettingsBundle>(api.GET("/api/staff/settings")) });
export const useLanguageReport = () => useQuery({ queryKey: dKeys.languages, queryFn: () => unwrap<LanguageReport>(api.GET("/api/staff/x/languages/report")) });
export const useMyIp = (enabled: boolean) => useQuery({ queryKey: dKeys.myIp, queryFn: () => unwrap<{ ip: string }>(api.GET("/api/staff/x/my-ip")), enabled, staleTime: Infinity });

/** PATCH with If-Match; 200 = applied, data.change present = 202 pending approval. */
export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { values: Record<string, unknown>; version: number; token?: string; reason?: string; effectiveAt?: string | null }) =>
      unwrap<SettingsBundle>(api.PATCH("/api/staff/settings", { body: { values: v.values, reason: v.reason, effectiveAt: v.effectiveAt }, headers: ifMatchHdr(v.version, v.token) })),
    onSuccess: (d) => {
      qc.setQueryData(dKeys.settings, d);
      if (d.change) qc.invalidateQueries({ queryKey: sysKeys.all });
      else qc.invalidateQueries({ queryKey: sysKeys.summary() }); // maintenance banner
    },
  });
}
export const exportSettingsJson = (token: string) => unwrap<{ json: string }>(api.POST("/api/staff/settings/export", { headers: hdr({ stepUp: token, idempotent: true }) }));
export function useAddLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { code: string; name: string }) => unwrap<LanguageReport>(api.POST("/api/staff/x/languages", { body: b, headers: hdr({ idempotent: true }) })),
    onSuccess: (d) => qc.setQueryData(dKeys.languages, d),
  });
}

export const useIntegrations = () =>
  useQuery({ queryKey: dKeys.integrations, queryFn: () => unwrap<{ items: IntegrationVM[]; payLater: boolean }>(api.GET("/api/staff/x/integrations")) });
export const useIntegration = (key: string) =>
  useQuery({ queryKey: dKeys.integration(key), queryFn: () => unwrap<IntegrationDetail>(api.GET("/api/staff/x/integrations/{key}", { params: { path: { key: key } } })) });

function useIntegrationWrite<V>(fn: (v: V) => Promise<IntegrationDetail>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (d) => {
      qc.setQueryData(dKeys.integration(d.key), d);
      qc.invalidateQueries({ queryKey: dKeys.integrations });
      qc.invalidateQueries({ queryKey: d.change ? sysKeys.all : sysKeys.summary() });
    },
  });
}
export const useTestIntegration = () =>
  useIntegrationWrite((key: string) => unwrap<IntegrationDetail>(api.POST("/api/staff/x/integrations/{key}/test", { params: { path: { key } }, headers: hdr({ idempotent: true }) })));
export const useRotateCredential = () =>
  useIntegrationWrite((v: { key: string; name: string; value: string; token: string }) =>
    unwrap<IntegrationDetail>(api.POST("/api/staff/x/integrations/{key}/credentials", { params: { path: { key: v.key } }, body: { name: v.name, value: v.value }, headers: hdr({ stepUp: v.token, idempotent: true }) })));
export const useSwitchEnv = () =>
  useIntegrationWrite((v: { i: IntegrationVM; env: IntegrationVM["env"]; token: string }) =>
    unwrap<IntegrationDetail>(api.PATCH("/api/staff/x/integrations/{key}", { params: { path: { key: v.i.key } }, body: { env: v.env }, headers: ifMatchHdr(v.i.version, v.token) })));
export function usePayLater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { on: boolean; token: string }) => unwrap<{ payLater: boolean }>(api.POST("/api/staff/x/integrations/pay-later", { body: { on: v.on }, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system", "d"] }),
  });
}

/** Runs `run(token)` after step-up; on step_up_required drops the cached token and retries once (brief). */
export async function withStepUp<T>(su: { request: (what: string) => Promise<string>; reset: () => void }, what: string, run: (token: string) => Promise<T>): Promise<T> {
  try { return await run(await su.request(what)); } catch (e) {
    if (!(e instanceof ApiError) || e.errorType !== "step_up_required") throw e;
    su.reset();
    return run(await su.request(what));
  }
}

/** IPv4 CIDR membership for "Test my IP" (v6 → null = can't tell). */
export function ipInCidr(ip: string, cidr: string): boolean | null {
  const [net, b] = cidr.split("/");
  const n = (s: string) => s.split(".").reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
  if (!/^\d+(\.\d+){3}$/.test(ip) || !/^\d+(\.\d+){3}$/.test(net)) return null;
  const bits = Number(b);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (n(ip) & mask) === (n(net) & mask);
}

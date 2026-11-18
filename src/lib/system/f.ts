"use client";
// Stage 6 system lane F hooks (U15 Privacy, U16 Operations). Keys under ["system", "f", …].
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sysKeys } from "./api";
import type {
  BackupVM, ChangeRequestVM, ComponentHealthVM, DependencyVM, DrillVM, DsrVM, Health, I18nText, IncidentStatus, IncidentVM,
  PostureVM, ProcessorVM, RetentionRow,
} from "@/shared/system/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";
import { ifMatchHdr } from "@/lib/system/api";

export type Visibility = "full" | "masked" | "own" | "none";
export type DataMapRow = { category: string; stored: string; location: string; retention: string; visibility: Record<string, Visibility> };
export type MonitoringVM = {
  components: ComponentHealthVM[]; p95: number[]; targetMs: number; errorRate: number[]; errorPct: number;
  slow: { path: string; p95: number }[]; jobs: { name: string; failures: number; lastAt: string }[];
  uptime: { date: string; up: number }[]; links: { label: string; href: string }[];
};
export type BackupsVM = { items: BackupVM[]; tiers: { tier: BackupVM["tier"]; keep: string }[] };
export type DrillsVM = { items: DrillVM[]; gateOpen: boolean };
export type DsrDetailVM = DsrVM & { events: { at: string; status: DsrVM["status"] }[]; version: number };

const k = {
  map: ["system", "f", "map"] as const,
  processors: ["system", "f", "processors"] as const,
  retention: ["system", "f", "retention"] as const,
  dsrs: ["system", "f", "dsrs"] as const,
  dsr: (id: string) => ["system", "f", "dsr", id] as const,
  monitoring: ["system", "f", "monitoring"] as const,
  backups: ["system", "f", "backups"] as const,
  drills: ["system", "f", "drills"] as const,
  posture: ["system", "f", "posture"] as const,
  deps: ["system", "f", "deps"] as const,
  incidents: ["system", "f", "incidents"] as const,
  incident: (id: string) => ["system", "f", "incident", id] as const,
};
export const fKeys = k;
const X = "/api/staff/x";

// ---------------------------------------------------------------- privacy
export const useDataMap = () => useQuery({ queryKey: k.map, queryFn: () => unwrap<{ items: DataMapRow[]; roles: string[]; residencyOpen: boolean }>(api.GET("/api/staff/x/privacy/map")) });
export const useProcessors = () => useQuery({ queryKey: k.processors, queryFn: () => unwrap<{ items: ProcessorVM[] }>(api.GET("/api/staff/x/privacy/processors")) });
export const useRetention = () =>
  useQuery({ queryKey: k.retention, queryFn: () => unwrap<{ items: RetentionRow[]; pending: ChangeRequestVM[] }>(api.GET("/api/staff/x/privacy/retention")) });
export const useDsrs = () => useQuery({ queryKey: k.dsrs, queryFn: () => unwrap<{ items: DsrVM[] }>(api.GET("/api/staff/privacy/requests")), refetchInterval: 60_000 });
export const useDsr = (id: string) => useQuery({ queryKey: k.dsr(id), queryFn: () => unwrap<DsrDetailVM>(api.GET("/api/staff/privacy/requests/{id}", { params: { path: { id: id } } })) });

export type ProcessorInput = Omit<ProcessorVM, "id" | "placeholder">;
export function useSaveProcessor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id?: string; body: ProcessorInput }) =>
      v.id ? unwrap<ProcessorVM>(api.PATCH("/api/staff/x/privacy/processors/{id}", { params: { path: { id: v.id } }, body: v.body, headers: hdr({ idempotent: true }) })) : unwrap<ProcessorVM>(api.POST("/api/staff/x/privacy/processors", { body: v.body, headers: hdr({ idempotent: true }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: k.processors }),
  });
}
export const useDryRun = () =>
  useMutation({ mutationFn: () => unwrap<{ items: { category: string; due: number; action: RetentionRow["action"] }[]; ranAt: string }>(api.POST("/api/staff/x/privacy/retention/dry-run")) });
export function useRetentionChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { category: string; keep: string; reason: string; token: string }) =>
      unwrap<ChangeRequestVM>(api.POST("/api/staff/x/privacy/retention/changes", { body: { category: v.category, keep: v.keep, reason: v.reason }, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    onSettled: () => { qc.invalidateQueries({ queryKey: k.retention }); qc.invalidateQueries({ queryKey: sysKeys.all }); },
  });
}
export function useDsrAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { action: "start" | "complete" | "reject"; version: number; reason?: string; token?: string }) =>
      unwrap<DsrDetailVM>(api.POST("/api/staff/privacy/requests/{id}/{action}", { params: { path: { id: id, action: v.action } }, body: { reason: v.reason }, headers: ifMatchHdr(v.version, v.token) })),
    onSuccess: (d) => qc.setQueryData(k.dsr(id), d),
    onSettled: () => { qc.invalidateQueries({ queryKey: k.dsrs }); qc.invalidateQueries({ queryKey: k.dsr(id) }); },
  });
}

// ---------------------------------------------------------------- operations
export const useMonitoring = () => useQuery({ queryKey: k.monitoring, queryFn: () => unwrap<MonitoringVM>(api.GET("/api/staff/x/ops/monitoring")), refetchInterval: 30_000 });
export const useBackups = () => useQuery({ queryKey: k.backups, queryFn: () => unwrap<BackupsVM>(api.GET("/api/staff/x/ops/backups")) });
export const useDrills = () => useQuery({ queryKey: k.drills, queryFn: () => unwrap<DrillsVM>(api.GET("/api/staff/x/ops/drills")) });
export const usePosture = () => useQuery({ queryKey: k.posture, queryFn: () => unwrap<{ items: PostureVM[] }>(api.GET("/api/staff/x/ops/posture")) });
export const useDependencies = () => useQuery({ queryKey: k.deps, queryFn: () => unwrap<{ items: DependencyVM[]; nextWindow: string }>(api.GET("/api/staff/x/ops/dependencies")) });
export const useIncidents = () => useQuery({ queryKey: k.incidents, queryFn: () => unwrap<{ items: IncidentVM[] }>(api.GET("/api/staff/x/ops/incidents")), refetchInterval: 30_000 });
export const useIncident = (id: string) => useQuery({ queryKey: k.incident(id), queryFn: () => unwrap<IncidentVM>(api.GET("/api/staff/x/ops/incidents/{id}", { params: { path: { id: id } } })), refetchInterval: 30_000 });

export function useRestore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { target: "staging" | "production"; backupId?: string; reason?: string; token: string }) =>
      unwrap<DrillVM | ChangeRequestVM>(api.POST("/api/staff/x/ops/restore", { body: { target: v.target, backupId: v.backupId, reason: v.reason }, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    onSettled: () => { qc.invalidateQueries({ queryKey: k.drills }); qc.invalidateQueries({ queryKey: sysKeys.all }); },
  });
}
export function useStatusPost() {
  return useMutation({
    mutationFn: (v: { component: string; state: Health; message: I18nText }) => unwrap<{ id: string }>(api.POST("/api/staff/x/ops/status-updates", { body: v, headers: hdr({ idempotent: true }) })),
  });
}
export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: Pick<IncidentVM, "title" | "sev" | "components" | "startedAt" | "impact">) => unwrap<IncidentVM>(api.POST("/api/staff/x/ops/incidents", { body: v, headers: hdr({ idempotent: true }) })),
    onSettled: () => { qc.invalidateQueries({ queryKey: k.incidents }); qc.invalidateQueries({ queryKey: sysKeys.all }); },
  });
}
export type IncidentPatch = { status?: IncidentStatus; postmortem?: Partial<NonNullable<IncidentVM["postmortem"]>> };
export function useIncidentMutations(id: string) {
  const qc = useQueryClient();
  const done = (d: IncidentVM) => { qc.setQueryData(k.incident(id), d); qc.invalidateQueries({ queryKey: k.incidents }); };
  return {
    patch: useMutation({
      mutationFn: (v: { patch: IncidentPatch; version: number }) => unwrap<IncidentVM>(api.PATCH("/api/staff/x/ops/incidents/{id}", { params: { path: { id: id } }, body: v.patch, headers: ifMatchHdr(v.version) })),
      onSuccess: done,
    }),
    note: useMutation({
      mutationFn: (text: string) => unwrap<IncidentVM>(api.POST("/api/staff/x/ops/incidents/{id}/events", { params: { path: { id: id } }, body: { text }, headers: hdr({ idempotent: true }) })),
      onSuccess: done,
    }),
  };
}

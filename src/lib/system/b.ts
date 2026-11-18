"use client";
// Stage 6 system lane B hooks (Project/SYSTEM-AGENT-BRIEF.md): users (U3/U4), offboarding, service accounts,
// identity checks (U10), impersonation (U11). Keys under ["system", "b", …]; mutations invalidate sysKeys.all.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { sysKeys } from "./api";
import type { AuditEntryVM, IdentityRequestVM, ServiceAccountVM, SessionVM, SystemUserVM, TrustedDeviceVM, UserKind } from "@/shared/system/types";
import { api, unwrap, type ApiCall } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";
import { ifMatchHdr } from "./api";

export type UserFilters = { kind: UserKind; role?: string; status?: string; mfa?: string; last?: string; q?: string };
export type UsersPage = { rows: SystemUserVM[]; total: number; counts: Record<UserKind, number>; nextCursor: string | null };
export type UserDetail = SystemUserVM & { lastSysadmin: boolean; openCases: number };

const qs = (f: Record<string, string | undefined>) => new URLSearchParams(Object.entries(f).filter((e): e is [string, string] => !!e[1])).toString();

export const bKeys = {
  users: (f: UserFilters) => ["system", "b", "users", f] as const,
  user: (id: string) => ["system", "b", "user", id] as const,
  activity: (id: string) => ["system", "b", "user", id, "activity"] as const,
  sessions: (id: string) => ["system", "b", "user", id, "sessions"] as const,
  devices: (id: string) => ["system", "b", "user", id, "devices"] as const,
  service: () => ["system", "b", "service"] as const,
  identity: () => ["system", "b", "identity"] as const,
};

export const useUsers = (f: UserFilters) =>
  useQuery({ queryKey: bKeys.users(f), queryFn: () => unwrap<UsersPage>(api.GET("/api/staff/users", { params: { query: toQuery(qs(f)) } })), placeholderData: (p) => p });
export const useUser = (id: string) => useQuery({ queryKey: bKeys.user(id), queryFn: () => unwrap<UserDetail>(api.GET("/api/staff/users/{id}", { params: { path: { id: id } } })) });
export const useUserActivity = (id: string) =>
  useQuery({ queryKey: bKeys.activity(id), queryFn: () => unwrap<{ items: AuditEntryVM[] }>(api.GET("/api/staff/users/{id}/activity", { params: { path: { id: id } } })) });
export const useSessions = (id: string) =>
  useQuery({ queryKey: bKeys.sessions(id), queryFn: () => unwrap<{ items: SessionVM[] }>(api.GET("/api/staff/users/{id}/sessions", { params: { path: { id: id } } })) });
export const useDevices = (id: string) =>
  useQuery({ queryKey: bKeys.devices(id), queryFn: () => unwrap<{ items: TrustedDeviceVM[] }>(api.GET("/api/staff/users/{id}/trusted-devices", { params: { path: { id: id } } })) });
export const useServiceAccounts = () =>
  useQuery({ queryKey: bKeys.service(), queryFn: () => unwrap<{ items: ServiceAccountVM[]; bootstrap: SystemUserVM | null }>(api.GET("/api/staff/x/service-accounts")) });
/** Identity checks poll 30 s (lockouts are time-sensitive). */
export const useIdentity = () =>
  useQuery({ queryKey: bKeys.identity(), queryFn: () => unwrap<{ items: IdentityRequestVM[] }>(api.GET("/api/admin/access-requests")), refetchInterval: 30_000 });

/** One mutation hook for every lane-B write. `version` → If-Match (stale → 409); else Idempotency-Key. */
export type Call = { req: ApiCall; version?: number; stepUp?: string };
export function useCall() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (c: Call) =>
      unwrap<unknown>(c.req(c.version !== undefined ? ifMatchHdr(c.version, c.stepUp) : hdr({ stepUp: c.stepUp, idempotent: true }))),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
  return { call: <T,>(c: Call) => m.mutateAsync(c) as Promise<T>, busy: m.isPending };
}

"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, ApiError } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { qk } from "@/lib/query/client";
import { useRealtime } from "@/lib/realtime";
import { can, type Permission, type ResourceContext } from "@/shared/auth/permissions";
import { normalizeRoles, workspacesFor, requiresMfa, type Role, type Workspace } from "@/shared/auth/roles";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: Role[];
  orgIds: string[];
  language: "rw" | "en" | "fr";
  emailVerified: boolean;
  mfaRequired: boolean;
  /** Absolute session end from the server (F-IAM-11); null = idle timeout only. */
  expiresAt: string | null;
};

type SessionState = {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "anonymous";
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (w: Workspace) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);
const WS_KEY = "posiba.workspace";

async function fetchSession(): Promise<SessionUser | null> {
  try {
    const data = await unwrap<components["schemas"]["SessionData"]>(api.GET("/api/auth/session"));
    const s = data.session;
    const roles = normalizeRoles(s);
    return {
      id: s.userId, name: s.name, email: s.email, phone: s.phone ?? null, roles,
      orgIds: (s as { orgIds?: string[] }).orgIds ?? [], // shortcut: server has no orgs yet (ORG module, Stage 7)
      language: s.language as SessionUser["language"], emailVerified: s.isEmailVerified, mfaRequired: requiresMfa(roles), expiresAt: s.expiresAt ?? null,
    };
  } catch (e) {
    if (e instanceof ApiError && (e.isAuth || e.isForbidden)) return null;
    throw e;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: qk.session, queryFn: fetchSession, staleTime: 4 * 60_000, refetchInterval: 4 * 60_000 });
  const [picked, setPicked] = useState<Workspace | null>(() => {
    try { return (localStorage.getItem(WS_KEY) as Workspace) || null; } catch { return null; }
  });
  useRealtime(!!data);

  const value = useMemo<SessionState>(() => {
    const user = data ?? null;
    const workspaces = user ? workspacesFor(user.roles) : [];
    const activeWorkspace = picked && workspaces.includes(picked) ? picked : workspaces[0] ?? null;
    return {
      user,
      status: isPending ? "loading" : user ? "authenticated" : "anonymous",
      workspaces,
      activeWorkspace,
      setActiveWorkspace: (w) => { setPicked(w); try { localStorage.setItem(WS_KEY, w); } catch {} },
      signOut: async () => {
        await api.DELETE("/api/auth/session").catch(() => {});
        qc.setQueryData(qk.session, null);
        qc.clear();
      },
    };
  }, [data, isPending, picked, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** UI-side permission check mirroring spec/02 §3. Server still enforces. */
export function useCan(perm: Permission, ctx?: ResourceContext): boolean {
  const { user } = useSession();
  return can(user, perm, ctx);
}

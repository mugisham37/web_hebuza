// Mirror of server/src/domain/auth/roles.ts — UI display only; the server enforces.
// Canonical roles & workspaces — spec/00-index.md (role slugs) + spec/02 §2 (roles table) + §5 (migration).
// Pure module: used by proxy.ts (edge) and client code.

export const ROLES = [
  "visitor",
  "client",
  "staff:agent",
  "ext:agent",
  "staff:service_manager",
  "staff:finance",
  "staff:marketing",
  "staff:procurement",
  "staff:partner_manager",
  "staff:executive",
  "staff:sysadmin",
] as const;
export type Role = (typeof ROLES)[number];

export type Workspace =
  | "client" | "agent" | "work" | "ops" | "finance" | "marketing"
  | "procurement" | "partners" | "exec" | "system";

/** Role → workspace, home route, MFA, session lifetime (spec/02 §2). */
export const ROLE_META: Record<Exclude<Role, "visitor">, {
  workspace: Workspace; home: string; mfa: "optional" | "required"; refreshHours: number;
}> = {
  client: { workspace: "client", home: "/dashboard", mfa: "optional", refreshHours: 24 },
  "staff:agent": { workspace: "agent", home: "/agent", mfa: "required", refreshHours: 8 },
  "ext:agent": { workspace: "work", home: "/work", mfa: "required", refreshHours: 12 },
  "staff:service_manager": { workspace: "ops", home: "/ops", mfa: "required", refreshHours: 8 },
  "staff:finance": { workspace: "finance", home: "/finance", mfa: "required", refreshHours: 8 },
  "staff:marketing": { workspace: "marketing", home: "/marketing", mfa: "required", refreshHours: 8 },
  "staff:procurement": { workspace: "procurement", home: "/procurement", mfa: "required", refreshHours: 8 },
  "staff:partner_manager": { workspace: "partners", home: "/partners", mfa: "required", refreshHours: 8 },
  "staff:executive": { workspace: "exec", home: "/exec", mfa: "required", refreshHours: 8 },
  "staff:sysadmin": { workspace: "system", home: "/system", mfa: "required", refreshHours: 4 },
};

/** URL prefix → workspace. Client workspace owns several top-level paths. */
export const WORKSPACE_PREFIXES: Record<Workspace, readonly string[]> = {
  client: ["/dashboard", "/requests", "/documents", "/billing", "/history", "/notifications", "/settings", "/orgs", "/bookings", "/messages", "/help"],
  agent: ["/agent"],
  work: ["/work"],
  ops: ["/ops"],
  finance: ["/finance"],
  marketing: ["/marketing"],
  procurement: ["/procurement"],
  partners: ["/partners"],
  exec: ["/exec"],
  system: ["/system"],
};

export function workspaceForPath(path: string): Workspace | null {
  for (const [ws, prefixes] of Object.entries(WORKSPACE_PREFIXES) as [Workspace, readonly string[]][]) {
    if (prefixes.some((p) => path === p || path.startsWith(`${p}/`))) return ws;
  }
  return null;
}

/** Legacy server roles (AuthSessionModel.role) → canonical roles (spec/02 §5). */
const LEGACY: Record<string, Role[]> = {
  client: ["client"],
  partner: ["ext:agent"],
  "staff:agent": ["staff:agent"],
  // shortcut: seeded admin gets all three until the server issues roles[]; replace when user_roles ships.
  "staff:admin": ["staff:service_manager", "staff:sysadmin", "staff:executive"],
};

export function normalizeRoles(input: { roles?: unknown; role?: unknown }): Role[] {
  const raw = Array.isArray(input.roles) ? input.roles : input.role ? [input.role] : [];
  const out = new Set<Role>();
  for (const r of raw) {
    if (typeof r !== "string") continue;
    if ((ROLES as readonly string[]).includes(r)) out.add(r as Role);
    else LEGACY[r]?.forEach((m) => out.add(m));
  }
  return [...out];
}

export const workspacesFor = (roles: Role[]): Workspace[] =>
  [...new Set(roles.filter((r) => r !== "visitor").map((r) => ROLE_META[r as Exclude<Role, "visitor">].workspace))];

/** X-6: executives may open the finance approvals inbox without the finance role (D12/D-17). */
export const GRANTS: { role: Role; prefix: string }[] = [{ role: "staff:executive", prefix: "/finance/approvals" },
  // Stage 10 §13: SM reviews regulatory/service-fact content; executives approve campaigns and read marketing reports.
  ...["/marketing/content", "/marketing/knowledge", "/marketing/updates", "/marketing/faqs"].map((prefix) => ({ role: "staff:service_manager" as Role, prefix })),
  ...["/marketing/campaigns", "/marketing/reports"].map((prefix) => ({ role: "staff:executive" as Role, prefix }))];
export const mayEnter = (roles: Role[], ws: Workspace, path: string) =>
  workspacesFor(roles).includes(ws) || GRANTS.some((g) => roles.includes(g.role) && (path === g.prefix || path.startsWith(`${g.prefix}/`)));

export function homeFor(roles: Role[]): string {
  const first = roles.find((r) => r !== "visitor") as Exclude<Role, "visitor"> | undefined;
  return first ? ROLE_META[first].home : "/";
}

export const requiresMfa = (roles: Role[]) =>
  roles.some((r) => r !== "visitor" && ROLE_META[r as Exclude<Role, "visitor">].mfa === "required");

/** Decode roles from a JWT payload without verifying (routing hint only; the API enforces). */
export function rolesFromJwt(token: string | undefined | null): Role[] {
  if (!token) return [];
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    return normalizeRoles(JSON.parse(json));
  } catch {
    return [];
  }
}

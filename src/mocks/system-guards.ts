// Impersonation read-only guard (plan 06 §9.4, F-IAM-15), split out so lanes and core share one copy.
// shortcut: system handlers only; the central all-workspace authz pre-handler (src/mocks/authz.ts) lands in Phase 2.
import { fail } from "./handlers-agent";
import { IMPERSONATION } from "./system-world";

/** 403 impersonation_read_only for any write while a sysadmin is viewing as someone else. Null when allowed. */
export const readOnlyGuard = () =>
  IMPERSONATION.current && Date.parse(IMPERSONATION.current.until) > Date.now()
    ? fail(403, "impersonation_read_only", "Read-only while viewing as another user.")
    : null;

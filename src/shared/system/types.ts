// Mirror of server/src/domain/system/types.ts — UI display only; the server enforces.
// Stage 6 System Administrator view models (plan 06 §9.2). Framework-free: imported by UI, rules libs and mocks.
// The real API drops in later behind these shapes; adapters live in src/lib/system/api.ts.
import type { Role } from "@/shared/auth/roles";
import type { Locale } from "@/shared/i18n/config";

export type Iso = string;
export type PersonRef = { id: string; name: string };

// ---------------------------------------------------------------- users (§2.2)
export type UserKind = "staff" | "agent" | "client" | "service";
export type UserStatus = "invited" | "invite_expired" | "invite_revoked" | "active" | "suspended" | "locked" | "deactivated";
export type MfaState = "enrolled" | "pending" | "reset";
export type MfaMethod = "totp" | "webauthn";
export type RoleGrant = { role: Role | string; grantedBy: string; grantedAt: Iso; expiresAt: Iso | null };
export type SystemUserVM = {
  id: string; name: string; email: string; phone: string | null; kind: UserKind;
  roles: RoleGrant[];
  status: UserStatus;
  mfa: { state: MfaState; methods: MfaMethod[]; backupCodesLeft: number | null };
  lastActiveAt: Iso | null;
  invitation?: { expiresAt: Iso; invitedBy: string };
  customerNo?: string; termsVersion?: string; isBootstrap?: boolean; locale?: Locale;
  createdAt: Iso; createdBy?: string; managerName?: string;
  version: number;
};
export type SessionVM = { id: string; userId: string; device: string; ip: string; city: string | null; createdAt: Iso; lastSeenAt: Iso; current: boolean; revokedAt?: Iso };
export type TrustedDeviceVM = { id: string; userId: string; label: string; addedAt: Iso; lastUsedAt: Iso };
export type ServiceAccountVM = { id: string; name: string; scopes: string[]; last4: string; rotatedAt: Iso; createdBy: string };

// ---------------------------------------------------------------- approvals (§2.1)
export type ChangeKind =
  | "role_grant" | "role_revoke_privileged" | "invite_privileged" | "custom_role" | "setting_change"
  | "ip_allowlist_disable" | "credential_rotation" | "retention_change" | "sod_waiver"
  | "break_glass" | "prod_restore" | "impersonation_write";
export type ChangeState = "proposed" | "approved" | "applied" | "rejected" | "withdrawn" | "expired";
export type ChangeArea = "access" | "security" | "settings" | "ops";
export type ApproverRule = { role: Role; anyOf?: string[] };
export type Decision = { by: PersonRef & { role: Role }; decision: "approve" | "reject"; at: Iso; reason?: string };
export type ChangeRequestVM = {
  id: string; kind: ChangeKind; state: ChangeState; title: string; area: ChangeArea;
  proposedBy: PersonRef; proposedAt: Iso; expiresAt: Iso; effectiveAt: Iso | null;
  /** Every rule must be satisfied (AND); inside a rule any one person with that role (OR). */
  approvers: ApproverRule[];
  decisions: Decision[];
  before: unknown; after: unknown; reason: string;
  /** Kind-specific payload (target user, role, setting key…). */
  payload: Record<string, unknown>;
  version: number;
};

// ---------------------------------------------------------------- audit (§2.9)
export type AuditCategory =
  | "auth" | "access_control" | "case" | "document_access" | "financial" | "workforce" | "config"
  | "data_export" | "data_deletion" | "ai" | "system";
export type AuditEntryVM = {
  id: string; at: Iso; actorId: string | null; actorLabel: string; actorRole: string; impersonatorId: string | null;
  category: AuditCategory; action: string; resourceType: string; resourceId: string;
  details: { before?: unknown; after?: unknown; reason?: string; extra?: Record<string, unknown> };
  ip: string; userAgent: string; requestId: string; sessionId: string; batchId?: string; breakGlass?: boolean;
  approvalRef?: string; prevHash: string; hash: string;
};
export type ChainState = "verified" | "broken" | "checking";
export type ChainReport = { ok: boolean; checked: number; brokenAt?: string; at: Iso };

// ---------------------------------------------------------------- settings (§7 U12)
export type SettingGroup = "general" | "security" | "maintenance" | "flags" | "languages" | "uploads" | "retention";
export type SettingType = "bool" | "int" | "enum" | "cidr[]" | "i18n" | "window" | "text" | "readonly";
export type I18nText = Record<Locale, string>;
export type MaintenanceWindow = { start: Iso; end: Iso };
export type SettingValueVM = { key: string; value: unknown; changedBy: string | null; changedAt: Iso | null; pending?: string };

// ---------------------------------------------------------------- integrations (§2.5)
export type Health = "operational" | "degraded" | "down" | "untested" | "maintenance";
export type Env = "production" | "sandbox" | "staging";
export type IntegrationGroup = "payments" | "messaging" | "ai" | "identity" | "platform";
export type IntegrationVM = {
  key: string; name: string; group: IntegrationGroup; env: "sandbox" | "production"; configured: boolean;
  credentials: { name: string; last4: string; rotatedAt: Iso }[];
  lastTest: { at: Iso; ok: boolean; message: string; env: "sandbox" | "production" } | null;
  envChangedAt: Iso | null; errorRate1h: number; maintenance?: boolean;
  usage?: { used: number; limit: number; unit: "messages" | "rwf" | "requests" };
  webhook?: { url: string; signature: "valid" | "invalid" | "none"; lastReceivedAt: Iso | null };
  fallback?: string[];
  health: Health; version: number;
};

// ---------------------------------------------------------------- notifications (§2.6)
export type Channel = "email" | "whatsapp" | "sms" | "inapp";
export type TemplateStatus = "draft" | "pending_provider_approval" | "active" | "retired" | "rejected";
export type TemplateBody = { subject?: string; header?: string; body: string; footer?: string; button?: string };
export type VarType = "string" | "money" | "date" | "ref" | "secure_link" | "code";
export type TemplateVersion = {
  v: number; status: TemplateStatus; languages: Record<Locale, TemplateBody | null>;
  providerStatus?: string; rejectedReason?: string; approvedBy?: string; approvedAt?: Iso; editedBy: string; editedAt: Iso;
};
export type TemplateVM = {
  key: string; channel: Channel; ownerKind: "security" | "operational" | "marketing";
  category: "utility" | "marketing" | "authentication"; event: string;
  versions: TemplateVersion[]; variablesSchema: Record<string, VarType>;
};
export type EventRuleVM = {
  event: string; critical: boolean; security: boolean; priority: "low" | "normal" | "high" | "critical";
  channels: Record<Channel, boolean>; chain: Channel[]; quietHours: "defer" | "send";
};
export type DeliveryVM = {
  id: string; at: Iso; event: string; channel: Channel; to: string; status: "queued" | "sent" | "delivered" | "read" | "failed" | "deferred" | "capped" | "skipped" | "suppressed" | "duplicate";
  fallbackTo?: Channel; costRwf: number; templateKey: string; lang: Locale;
};
export type BudgetVM = { channel: "whatsapp" | "sms" | "ai" | "email"; budget: number; spent: number; marketingSpent: number };

// ---------------------------------------------------------------- governance (§2.3, §2.4, U8)
export type RiskFlag = "inactive" | "privileged" | "sod_waiver" | "no_mfa" | "never_signed_in";
export type ReviewDecision = "pending" | "kept" | "role_removed" | "suspended";
export type ReviewItemVM = { id: string; userId: string; userName: string; role: Role | string; lastActiveAt: Iso | null; flags: RiskFlag[]; decision: ReviewDecision; reviewer: PersonRef; decidedAt?: Iso };
export type ReviewCampaignVM = {
  id: string; name: string; status: "scheduled" | "open" | "overdue" | "completed"; openedAt: Iso; dueAt: Iso;
  items: ReviewItemVM[]; signOffs: { role: "staff:sysadmin" | "staff:executive"; by: PersonRef; at: Iso }[]; escalatedTo?: PersonRef; version: number;
};
export type SodPair = { a: Role | string; b: Role | string; status: "blocked" | "enforced"; why: string };
export type SodWaiverVM = { id: string; userId: string; userName: string; pair: [string, string]; why: string; expiresAt: Iso; approvedBy: PersonRef; approvedAt: Iso };
export type BreakGlassState = "sealed" | "requested" | "active" | "ended" | "expired" | "reviewed";
export type BreakGlassVM = {
  state: BreakGlassState; lastUsedAt: Iso | null;
  request?: { id: string; by: PersonRef; reason: string; incidentId?: string; minutes: 60 | 120 | 240; at: Iso; changeId: string };
  activeUntil?: Iso; endedAt?: Iso; reviewNote?: string;
};
export type IdentityRequestVM = {
  id: string; kind: "two_factor" | "unlock"; userId: string; userName: string; managerName: string;
  reason: string; at: Iso; status: "pending" | "in_review" | "approved" | "declined"; decidedBy?: string; decidedAt?: Iso; declineReason?: string;
};
export type ImpersonationVM = { targetId: string; targetName: string; reason: string; until: Iso; startedAt: Iso; by: PersonRef } | null;

// ---------------------------------------------------------------- privacy (§2.7, §2.8)
export type DsrType = "export" | "erasure" | "rectification" | "restriction";
export type DsrStatus = "received" | "verifying" | "in_progress" | "completed" | "rejected";
export type PlanAction = "anonymise" | "delete" | "retain";
export type DsrVM = {
  id: string; type: DsrType; subjectNo: string; receivedAt: Iso; dueAt: Iso; status: DsrStatus; legalHold: boolean;
  verification?: string; plan: { category: string; action: PlanAction; until?: string; reason?: string }[];
  bundleHash?: string; rejectReason?: string;
};
export type RetentionRow = { category: string; keep: string; action: "anonymise" | "delete" | "archive"; legal: boolean; lastRunAt: Iso | null; due: number };
export type ProcessorVM = { id: string; name: string; purpose: string; data: string[]; location: string; dpaSignedAt: Iso | null; reviewDue: Iso; placeholder?: boolean };

// ---------------------------------------------------------------- operations (§2.10)
export type IncidentStatus = "open" | "investigating" | "mitigated" | "resolved" | "postmortem_done";
export type IncidentVM = {
  id: string; title: string; sev: 1 | 2 | 3; status: IncidentStatus; components: string[];
  startedAt: Iso; resolvedAt?: Iso; impact: string; timeline: { at: Iso; by: string; text: string }[];
  postmortem?: { dueAt: Iso; summary?: string; rootCause?: string; actions: { text: string; owner: string; done: boolean }[] };
  version: number;
};
export type ComponentHealthVM = { key: string; name: string; health: Health; detail: string; checkedAt: Iso };
export type BackupVM = { id: string; tier: "hourly" | "daily" | "monthly" | "yearly"; at: Iso; sizeMb: number; ok: boolean; encrypted: boolean; location: string };
export type DrillVM = { id: string; at: Iso; type: "staging" | "full_dr"; rtoMinutes: number; ok: boolean; reportBy: string };
export type PostureVM = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string; source: string };
export type DependencyVM = { id: string; pkg: string; from: string; to: string; type: "security" | "minor" | "major"; mergedAt: Iso; cves: string[] };

// ---------------------------------------------------------------- shell (U0)
export type AlertKind = "security" | "integrations" | "ops";
export type AlertVM = { id: string; kind: AlertKind; code: string; title: string; detail?: string; at: Iso; href: string; read: boolean; tone: "danger" | "warning" | "success" | "info" };
export type SystemSummary = {
  approvals: number; identity: number; reviewsDue: number; degraded: number; untested: number; alertsUnread: number;
  setupIncomplete: number; breakGlass: BreakGlassState; breakGlassUntil: Iso | null;
  impersonation: ImpersonationVM; maintenance: { on: boolean; message: I18nText; until: Iso | null };
  env: Env; me: PersonRef & { roles: Role[] };
};
export type SetupItem = { key: string; done: boolean; href: string };

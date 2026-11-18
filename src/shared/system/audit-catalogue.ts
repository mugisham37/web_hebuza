// Mirror of server/src/domain/system/audit-catalogue.ts — UI display only; the server enforces.
// Audit event catalogue (plan 06 §10.3, AUD F-AUD-01/02). Mocks emit only these codes; category is derived, never guessed.
import type { AuditCategory } from "./types";

export const AUDIT_CATALOGUE = {
  // access control
  "access.user.invited": "access_control",
  "access.invitation.resent": "access_control",
  "access.invitation.revoked": "access_control",
  "access.role.granted": "access_control",
  "access.role.revoked": "access_control",
  "access.user.suspended": "access_control",
  "access.user.reactivated": "access_control",
  "access.user.deactivated": "access_control",
  "access.access_request.approved": "access_control",
  "access.access_request.declined": "access_control",
  "access.impersonation.started": "access_control",
  "access.impersonation.ended": "access_control",
  "access.review.item_decided": "access_control",
  "access.review.completed": "access_control",
  "access.sod.waiver_approved": "access_control",
  "access.break_glass.activated": "access_control",
  "access.break_glass.ended": "access_control",
  "access.break_glass.reviewed": "access_control",
  "access.denied": "access_control", // D-18 addition
  // auth
  "auth.mfa.reset": "auth",
  "auth.mfa.enrolled": "auth",
  "auth.mfa.backup_codes_regenerated": "auth",
  "auth.password.reset_forced": "auth",
  "auth.session.revoked": "auth",
  "auth.trusted_device.revoked": "auth",
  "auth.lockout": "auth",
  "auth.unusual_login": "auth",
  // config
  "config.setting.changed": "config",
  "config.change.proposed": "config",
  "config.change.approved": "config",
  "config.change.rejected": "config",
  "config.change.withdrawn": "config",
  "config.change.expired": "config",
  "config.change.applied": "config",
  "config.flag.changed": "config",
  "config.maintenance.scheduled": "config",
  "config.template.changed": "config",
  "config.template.submitted": "config",
  "config.template.activated": "config",
  "config.template.retired": "config",
  "config.integration.credential_rotated": "config",
  "config.integration.tested": "config",
  "config.integration.env_changed": "config",
  "config.role.created": "config",
  "config.role.changed": "config",
  "config.role.retired": "config",
  "config.retention.changed": "config",
  "config.processor.changed": "config",
  // data export / deletion
  "data_export.audit.exported": "data_export",
  "data_export.report.exported": "data_export",
  "data_export.client_data.exported": "data_export",
  "data_deletion.record.erased": "data_deletion",
  // sensitive reads (F-AUD-05)
  "document_access.document.downloaded": "document_access",
  "workforce.private_field.revealed": "workforce",
  // system
  "system.restore.requested": "system",
  "system.restore.completed": "system",
  "system.incident.opened": "system",
  "system.incident.updated": "system",
  "system.incident.resolved": "system",
  "system.status.posted": "system",
  "system.backup.completed": "system",
} as const satisfies Record<string, AuditCategory>;

export type AuditCode = keyof typeof AUDIT_CATALOGUE;
export const AUDIT_CATEGORIES: readonly AuditCategory[] = [
  "auth", "access_control", "case", "document_access", "financial", "workforce", "config", "data_export", "data_deletion", "ai", "system",
];
export const categoryOf = (code: string): AuditCategory =>
  (AUDIT_CATALOGUE as Record<string, AuditCategory>)[code] ?? (AUDIT_CATEGORIES.find((c) => code.startsWith(`${c}.`)) ?? "system");
/** Privileged = changes access or config (the overview "recent privileged changes" list, audit `privileged=1`). */
export const isPrivileged = (code: string) => /^(access\.(role|user|break_glass|impersonation|sod)|config\.(change|setting|integration|role|retention))/.test(code);
/** Sensitive-read log (U13 /audit/sensitive). */
export const isSensitive = (code: string) => /^(document_access|data_export)\.|^workforce\.private_field\.revealed$/.test(code);

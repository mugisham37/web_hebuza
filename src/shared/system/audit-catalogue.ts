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
  "document_access.document.viewed": "document_access",
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
/** F-AUD-01: domain prefixes of @Route / AuditService codes outside the catalogue. The CI test fails on any code
 *  whose prefix is in neither list, so a new event family needs a category decision here. */
export const PREFIX_CATEGORY: Record<string, AuditCategory> = {
  case: "case", application: "case", deliverable: "case", document: "case", offer: "case", obligation: "case", sub_status: "config",
  service: "config", service_category: "config", service_subcategory: "config", compliance_rule: "config", capacity_cap: "config", cms: "config",
  chat: "case", support: "case", ticket: "case", review: "case", testimonial: "config", media: "config", social: "config",
  agent: "workforce", worker: "workforce", workload: "workforce", allocation: "workforce", field: "workforce", licence: "workforce", credential: "workforce", contract: "workforce", rate: "workforce", firm: "workforce",
  invoice: "financial", payment: "financial", payment_method: "financial", payment_gate: "financial", payout_destination: "financial", statement: "financial", journal: "financial", subscription: "financial", refund: "financial",
  lead: "case", campaign: "config", segment: "config", referral: "case", tracking: "config", report: "data_export",
  access: "access_control", sup: "financial", supplier_payment: "financial", procurement: "financial",
  profile: "access_control", org: "access_control", kyc: "access_control", view_as: "access_control", privacy: "data_deletion", file: "case", notifications: "config",
  partner: "config", assignment: "workforce", request_group: "case", enquiry: "case",
};
export const knownCode = (code: string) =>
  code in AUDIT_CATALOGUE || AUDIT_CATEGORIES.some((c) => code.startsWith(`${c}.`)) || code.split(".")[0] in PREFIX_CATEGORY;
export const categoryOf = (code: string): AuditCategory =>
  (AUDIT_CATALOGUE as Record<string, AuditCategory>)[code] ?? AUDIT_CATEGORIES.find((c) => code.startsWith(`${c}.`)) ?? PREFIX_CATEGORY[code.split(".")[0]] ?? "system";
/** Privileged = changes access or config (the overview "recent privileged changes" list, audit `privileged=1`). */
export const isPrivileged = (code: string) => /^(access\.(role|user|break_glass|impersonation|sod)|config\.(change|setting|integration|role|retention))/.test(code);
/** Sensitive-read log (U13 /audit/sensitive). */
export const isSensitive = (code: string) => /^(document_access|data_export)\.|^workforce\.private_field\.revealed$/.test(code);

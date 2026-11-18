// Mirror of server/src/domain/system/settings-registry.ts — UI display only; the server enforces.
// Typed settings registry (plan 06 §7 U12, SET F-SET-01/14). Every key names what enforces it; dead keys never render.
import type { Role } from "@/shared/auth/roles";
import { locales } from "@/shared/i18n/config";
import { POLICY } from "@/shared/policy";
import type { I18nText, MaintenanceWindow, SettingGroup, SettingType } from "./types";

export type SettingDef = {
  key: string; group: SettingGroup; type: SettingType; default: unknown;
  /** Component that enforces the value (B19: enforced or removed). */
  enforcedBy: string;
  editableBy: Role[]; requiresApproval: boolean;
  options?: readonly string[]; unit?: "min" | "h" | "mb";
  /** Owned elsewhere: rendered read-only with "Owned by …". */
  ownedBy?: string;
  validate(v: unknown): string | null;
};

const SYS: Role[] = ["staff:sysadmin"];
const SYS_EXE: Role[] = ["staff:sysadmin", "staff:executive"];

export const validMinutes = (min: number, max: number) => (v: unknown) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? null : "range";

/** IPv4 / IPv6 CIDR (validator only; no normalisation). */
export function parseCidr(s: string): { v: 4 | 6; bits: number } | null {
  const [ip, b] = s.trim().split("/");
  if (b === undefined || !/^\d{1,3}$/.test(b)) return null;
  const bits = Number(b);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.split(".").every((o) => Number(o) <= 255) && bits <= 32 ? { v: 4, bits } : null;
  if (/^[0-9a-f:]+$/i.test(ip) && ip.includes(":") && (ip.match(/::/g)?.length ?? 0) <= 1) {
    const groups = ip.split(":").filter(Boolean);
    return groups.length <= 8 && groups.every((g) => g.length <= 4) && bits <= 128 ? { v: 6, bits } : null;
  }
  return null;
}
const validCidrs = (v: unknown) => (Array.isArray(v) && v.every((c) => typeof c === "string" && parseCidr(c)) ? null : "cidr");
/** PLACEHOLDER(maintenance-message-length) 280 chars per locale, all three required. */
export const validI18n = (max = 280) => (v: unknown) => {
  const t = v as Partial<I18nText> | null;
  if (!t) return "required";
  for (const l of locales) { const s = t[l]?.trim() ?? ""; if (!s) return `required_${l}`; if (s.length > max) return `too_long_${l}`; }
  return null;
};
export const validWindow = (v: unknown) => {
  const w = v as MaintenanceWindow | null;
  if (!w) return null;
  return Date.parse(w.end) > Date.parse(w.start) ? null : "end_before_start";
};
const none = () => null;
const bool = (v: unknown) => (typeof v === "boolean" ? null : "type");
const oneOf = (opts: readonly string[]) => (v: unknown) => (opts.includes(String(v)) ? null : "type");

export const LOCALE_OPTIONS = ["rw", "en", "fr"] as const;
export const FLAG_KEYS = ["ai_assistant", "field_cash", "whatsapp_channel", "consultation_booking", "custom_roles", "card_payments"] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

export const SETTINGS: readonly SettingDef[] = [
  // General (existing PlatformSettings keys + read-only identity)
  { key: "intake.accept_new", group: "general", type: "bool", default: true, enforcedBy: "API intake guard (POST /api/applications)", editableBy: SYS_EXE, requiresApproval: false, validate: bool },
  { key: "intake.guest_applications", group: "general", type: "bool", default: true, enforcedBy: "API intake guard (guest session)", editableBy: SYS_EXE, requiresApproval: false, validate: bool },
  { key: "i18n.default_locale", group: "general", type: "enum", options: LOCALE_OPTIONS, default: "rw", enforcedBy: "proxy.ts locale negotiation", editableBy: SYS, requiresApproval: false, validate: oneOf(LOCALE_OPTIONS) },
  { key: "general.time_zone", group: "general", type: "readonly", default: "Africa/Kigali", enforcedBy: "src/lib/format.ts TIME_ZONE", editableBy: [], requiresApproval: false, validate: none },
  { key: "general.numbering", group: "general", type: "readonly", default: "HBZ-XXXXXX · INV-YYYY-NNNNN", enforcedBy: "API numbering service", editableBy: [], requiresApproval: false, ownedBy: "staff:finance", validate: none },
  { key: "general.company_identity", group: "general", type: "readonly", default: "HEBUZA Ltd · Sonatube, Kicukiro", enforcedBy: "Invoice & legal renderers", editableBy: [], requiresApproval: false, ownedBy: "staff:finance", validate: none },
  // X-3: refunds above this need an executive. A setting owned by Finance (set.tax); shown read-only here.
  { key: "finance.refund_exec_limit", group: "general", type: "readonly", default: POLICY.refundExecLimit, enforcedBy: "Refund approval chain (rfd.approve.exec)", editableBy: [], requiresApproval: true, ownedBy: "staff:finance", validate: none },
  { key: "general.branches", group: "general", type: "readonly", default: "Sonatube / Kicukiro", enforcedBy: "— (single branch, D-10 PLACEHOLDER)", editableBy: [], requiresApproval: false, validate: none },
  // Security (IAM F-IAM-11/12/16)
  { key: "security.idle_minutes.staff", group: "security", type: "int", unit: "min", default: 30, enforcedBy: "API session middleware (idle)", editableBy: SYS, requiresApproval: true, validate: validMinutes(5, 480) },
  { key: "security.idle_minutes.sysadmin", group: "security", type: "int", unit: "min", default: 30, enforcedBy: "API session middleware (idle)", editableBy: SYS, requiresApproval: true, validate: validMinutes(5, 480) },
  { key: "security.idle_minutes.client", group: "security", type: "int", unit: "min", default: 60, enforcedBy: "API session middleware (idle)", editableBy: SYS, requiresApproval: true, validate: validMinutes(5, 480) },
  { key: "security.absolute_hours.sysadmin", group: "security", type: "readonly", unit: "h", default: 4, enforcedBy: "Refresh-token lifetime (roles.ts ROLE_META)", editableBy: [], requiresApproval: false, validate: none },
  { key: "security.absolute_hours.staff", group: "security", type: "readonly", unit: "h", default: 8, enforcedBy: "Refresh-token lifetime (roles.ts ROLE_META)", editableBy: [], requiresApproval: false, validate: none },
  { key: "security.absolute_hours.client", group: "security", type: "readonly", unit: "h", default: 24, enforcedBy: "Refresh-token lifetime (roles.ts ROLE_META)", editableBy: [], requiresApproval: false, validate: none },
  { key: "security.ip_allowlist.sysadmin", group: "security", type: "cidr[]", default: [], enforcedBy: "API auth middleware (IP check)", editableBy: SYS, requiresApproval: true, validate: validCidrs },
  { key: "security.ip_allowlist.finance", group: "security", type: "cidr[]", default: [], enforcedBy: "API auth middleware (IP check)", editableBy: SYS, requiresApproval: true, validate: validCidrs },
  { key: "security.mfa_staff", group: "security", type: "readonly", default: "always", enforcedBy: "proxy.ts + /team/mfa/setup (F-IAM-05)", editableBy: [], requiresApproval: false, validate: none },
  { key: "security.step_up_method", group: "security", type: "enum", options: ["webauthn_preferred", "totp"], default: "webauthn_preferred", enforcedBy: "Step-up dialog (useStepUp)", editableBy: SYS, requiresApproval: true, validate: oneOf(["webauthn_preferred", "totp"]) },
  { key: "security.password_policy", group: "security", type: "readonly", default: "staff ≥ 12 · breached-list check · no rotation", enforcedBy: "API password service (F-IAM-16)", editableBy: [], requiresApproval: false, validate: none },
  { key: "security.unusual_login_alerts", group: "security", type: "bool", default: true, enforcedBy: "API login risk check → auth.unusual_login", editableBy: SYS, requiresApproval: true, validate: bool },
  // Maintenance (F-SET-11)
  { key: "maintenance.on", group: "maintenance", type: "bool", default: false, enforcedBy: "API write guard (clients read-only) + site banner", editableBy: SYS_EXE, requiresApproval: false, validate: bool },
  { key: "maintenance.message", group: "maintenance", type: "i18n", default: { rw: "", en: "", fr: "" }, enforcedBy: "Public + client layout banner", editableBy: SYS_EXE, requiresApproval: false, validate: validI18n() },
  { key: "maintenance.window", group: "maintenance", type: "window", default: null, enforcedBy: "API scheduler (maintenance window)", editableBy: SYS_EXE, requiresApproval: false, validate: validWindow },
  // Uploads (security V12)
  { key: "uploads.max_file_mb", group: "uploads", type: "readonly", unit: "mb", default: 10, enforcedBy: "API upload guard + FileDrop", editableBy: [], requiresApproval: false, validate: none },
  { key: "uploads.max_message_mb", group: "uploads", type: "readonly", unit: "mb", default: 25, enforcedBy: "API upload guard (per message)", editableBy: [], requiresApproval: false, validate: none },
  { key: "uploads.allowed_types", group: "uploads", type: "readonly", default: "pdf, jpg, png, heic, docx, xlsx, csv · DOCM/XLSM rejected", enforcedBy: "API content-type sniffing", editableBy: [], requiresApproval: false, validate: none },
  // Languages (F-SET-10)
  { key: "i18n.enabled_locales", group: "languages", type: "readonly", default: ["rw", "en", "fr"], enforcedBy: "src/lib/i18n/config.ts locales (deploy)", editableBy: [], requiresApproval: false, validate: none },
  // Flags (F-SET-12): one bool per module + audience
  ...FLAG_KEYS.map((k): SettingDef => ({ key: `flags.${k}`, group: "flags", type: "bool", default: k === "whatsapp_channel" || k === "consultation_booking", enforcedBy: `Feature gate useFlag("${k}") + API module guard`, editableBy: SYS_EXE, requiresApproval: false, validate: bool })),
];

export const settingDef = (key: string) => SETTINGS.find((d) => d.key === key);
export const settingsIn = (g: SettingGroup) => SETTINGS.filter((d) => d.group === g);
export const SETTING_GROUPS: readonly SettingGroup[] = ["general", "security", "maintenance", "flags", "languages", "uploads", "retention"];

/** F-SET-14: keys the old admin panel stored that nothing enforces. The adapter drops them. */
export const DEAD_KEYS = ["enforce2FA", "compactTables", "dataRetention"] as const;
export const dropDead = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !(DEAD_KEYS as readonly string[]).includes(k)));

/** F-SET-13 export: values only, never secrets. */
export const exportSettings = (values: Record<string, unknown>) =>
  JSON.stringify(Object.fromEntries(Object.entries(values).filter(([k]) => settingDef(k) && !/secret|token|password/i.test(k))), null, 2);

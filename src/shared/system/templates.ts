// Mirror of server/src/domain/system/templates.ts — UI display only; the server enforces.
// Notification template rules (plan 06 §2.6, NTF F-NTF-03..12/16). Pure helpers used by the editor and the mock.
import type { BudgetVM, TemplateBody, TemplateStatus, TemplateVM, VarType } from "./types";

// GSM 03.38 basic set + extension table (extension chars cost 2).
const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";

/** 160/153 for GSM-7, 70/67 for UCS-2 (any non-GSM char switches the whole message). */
export function smsSegments(text: string): { encoding: "GSM-7" | "UCS-2"; length: number; segments: number; perSegment: number } {
  const chars = [...text];
  const gsm = chars.every((c) => GSM.includes(c) || GSM_EXT.includes(c));
  const length = gsm ? chars.reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0) : chars.length;
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  const segments = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  return { encoding: gsm ? "GSM-7" : "UCS-2", length, segments, perSegment: segments > 1 ? multi : single };
}

/** `{{1}}` / `{{name}}` placeholders, de-duplicated, in order of first use. */
export const extractVars = (body: string) => [...new Set([...body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))];

/** Every used var declared; every declared var used somewhere in the bodies. */
export function validateVars(bodies: string[], schema: Record<string, VarType>): { undeclared: string[]; unused: string[] } {
  const used = new Set(bodies.flatMap(extractVars));
  return { undeclared: [...used].filter((v) => !(v in schema)), unused: Object.keys(schema).filter((k) => !used.has(k)) };
}

export type LintIssue = { code: "otp_link_forbidden" | "raw_url" | "url_variable" | "marketing_consent" | "missing_language" | "too_long" | "undeclared_var"; field?: string; detail?: string };
/** PLACEHOLDER(whatsapp-limits) verify against Meta docs. */
export const WA_LIMITS = { header: 60, body: 1024, footer: 60, button: 25 } as const;
const URL_RE = /https?:\/\/|www\./i;

export function lint(t: Pick<TemplateVM, "channel" | "category" | "variablesSchema">, body: TemplateBody, opts: { marketingConsentRule?: boolean } = {}): LintIssue[] {
  const out: LintIssue[] = [];
  const text = [body.subject, body.header, body.body, body.footer, body.button].filter(Boolean).join("\n");
  if (t.category === "authentication" && (URL_RE.test(text) || extractVars(text).includes("secure_link"))) out.push({ code: "otp_link_forbidden" });
  else if (URL_RE.test(text)) out.push({ code: "raw_url", detail: "Use {{secure_link}}" }); // F-NTF-16
  for (const v of extractVars(text)) {
    const type = t.variablesSchema[v];
    if (!type) out.push({ code: "undeclared_var", detail: v });
    else if (/url|link/i.test(v) && type !== "secure_link") out.push({ code: "url_variable", detail: v });
  }
  if (t.channel === "whatsapp") {
    for (const f of Object.keys(WA_LIMITS) as (keyof typeof WA_LIMITS)[]) if ((body[f]?.length ?? 0) > WA_LIMITS[f]) out.push({ code: "too_long", field: f });
    if (t.category === "marketing" && !opts.marketingConsentRule) out.push({ code: "marketing_consent" });
  }
  return out;
}

/** Fill placeholders with sample values (preview). Unknown vars stay visible as `{{x}}`. */
export const render = (s: string, sample: Record<string, string>) => s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => sample[k] ?? m);

/** Quiet hours 21:00–07:00 Africa/Kigali (UTC+2, no DST) → next 07:00 unless critical (F-NTF-08). */
export function quietHoursDefer(at: Date, critical: boolean): Date | null {
  if (critical) return null;
  const kigali = new Date(at.getTime() + 2 * 3600_000);
  const h = kigali.getUTCHours();
  if (h >= 7 && h < 21) return null;
  const next = new Date(kigali);
  if (h >= 21) next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(7, 0, 0, 0);
  return new Date(next.getTime() - 2 * 3600_000);
}

/** Marketing stops at 100% of budget; transactional always sends (F-NTF-12). */
export const capDecision = (b: Pick<BudgetVM, "budget" | "spent">, category: "utility" | "marketing" | "authentication"): "send" | "capped" =>
  category === "marketing" && b.spent >= b.budget ? "capped" : "send";
/** Whole percent, rounded down (§2.11). */
export const pctUsed = (spent: number, budget: number) => (budget > 0 ? Math.floor((spent / budget) * 100) : 0);
export const budgetTone = (pct: number) => (pct >= 100 ? "danger" : pct >= 80 ? "warning" : "ok");

/** draft → pending_provider_approval (WhatsApp) → active → retired; provider rejected → draft. */
export const TEMPLATE_NEXT: Record<TemplateStatus, TemplateStatus[]> = {
  draft: ["pending_provider_approval", "active"],
  pending_provider_approval: ["active", "rejected"],
  rejected: ["draft"],
  active: ["retired"],
  retired: [],
};
export const currentVersion = (t: TemplateVM) => t.versions.at(-1)!;
export const activeVersion = (t: TemplateVM) => [...t.versions].reverse().find((v) => v.status === "active") ?? null;

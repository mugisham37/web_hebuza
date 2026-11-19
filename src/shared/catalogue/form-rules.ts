// Mirror of server/src/domain/catalogue/form-rules.ts — the wizard's copy; the server re-checks on submit.
// Service form rules shared by the apply wizard and submit: conditional visibility (visibleIf) and answer validation
// over the builder's published fields (FormField in web lib/ops/e). Pure; the server re-checks on submit.
export type FormRuleField = {
  id: string;
  type: string;
  required?: boolean;
  options?: string[];
  visibleIf?: { field: string; equals: string } | null;
  children?: FormRuleField[];
  totalField?: string | null;
};
export type Answers = Record<string, unknown>;

const filled = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== "";
const asText = (v: unknown) => (Array.isArray(v) ? v.map(String) : [String(v ?? "")]);

/** A field shows when it has no condition, or the referenced answer equals the value (multi answers: contains it). */
export function isVisible(f: FormRuleField, answers: Answers): boolean {
  if (!f.visibleIf?.field) return true;
  return asText(answers[f.visibleIf.field]).includes(f.visibleIf.equals);
}

/** Only the visible fields' answers, so hidden branches never reach the case. */
export function visibleAnswers(fields: FormRuleField[], answers: Answers): Answers {
  return Object.fromEntries(fields.filter((f) => isVisible(f, answers) && f.id in answers).map((f) => [f.id, answers[f.id]]));
}

export type FormError = "required" | "option" | "total" | "rows";
/** Field id (or "group.row.child") → error code. Empty = valid. */
export function validateAnswers(fields: FormRuleField[], answers: Answers): Record<string, FormError> {
  const out: Record<string, FormError> = {};
  for (const f of fields) {
    if (!isVisible(f, answers)) continue;
    const v = answers[f.id];
    if (f.type === "group") {
      const rows = Array.isArray(v) ? (v as Answers[]) : [];
      if (f.required && !rows.length) out[f.id] = "rows";
      rows.forEach((row, i) => {
        for (const [k, e] of Object.entries(validateAnswers(f.children ?? [], row ?? {}))) out[`${f.id}.${i}.${k}`] = e;
      });
      if (f.totalField && rows.length && rows.reduce((s, r) => s + (Number(r?.[f.totalField!]) || 0), 0) !== 100) out[f.id] = "total";
      continue;
    }
    if (!filled(v)) {
      if (f.required) out[f.id] = "required";
      continue;
    }
    if ((f.type === "select" || f.type === "multi") && f.options?.length) {
      const opts = new Set(f.options.map((o) => o.trim()));
      if (asText(v).some((x) => !opts.has(x.trim()))) out[f.id] = "option";
    }
  }
  return out;
}

// Apply wizard ← builder: map the published service form (GET /api/services/{slug}/form, builder FormField[])
// to the wizard's FieldDef renderer. The server is the source of truth; content/pages/flow `fields` is the typed fallback.
import type { Locale } from "@/shared/i18n/config";
import type { FieldDef } from "@/content/pages/flow";

type L3 = Partial<Record<Locale, string>>;
export type PublishedField = {
  id: string; type: string; label?: L3; help?: L3; required?: boolean; options?: string[]; profile?: string | null;
  visibleIf?: { field: string; equals: string } | null;
};

const pick = (l: L3 | undefined, locale: Locale) => (l?.[locale] || l?.en || l?.rw || l?.fr || "").trim();

/** Builder field → wizard field. Files are collected on the Documents step and groups have no wizard widget yet, so both are skipped. */
export function toFieldDefs(fields: PublishedField[], locale: Locale): FieldDef[] {
  return fields.flatMap((f): FieldDef[] => {
    const label = pick(f.label, locale) || f.id;
    const hint = pick(f.help, locale) || undefined;
    const opts = (f.options ?? []).map((o) => o.trim()).filter(Boolean);
    switch (f.type) {
      case "file":
      case "group":
        return [];
      case "select":
        return opts.length ? [{ key: f.id, type: "radio", label, options: opts }] : [];
      case "multi":
        return opts.length ? [{ key: f.id, type: "search", label, hint, options: opts }] : [];
      case "date":
        return [{ key: f.id, type: "date", label, hint, optional: !f.required, ...(f.profile && { profile: f.profile }) }];
      case "address":
        return [{ key: f.id, type: "textarea", label, hint, optional: !f.required, ...(f.profile && { profile: f.profile }) }];
      default: // text, number, phone, id, isic
        return [{ key: f.id, type: "text", label, hint, optional: !f.required, ...(f.profile && { profile: f.profile }) }];
    }
  });
}

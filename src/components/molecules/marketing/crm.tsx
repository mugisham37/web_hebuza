"use client";
// CRM lane shared bits: copy hook, staff lookup, service labels, small form pieces.
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Field } from "@/components/atoms/field";
import { useM } from "@/components/atoms/marketing";
import { mktCrm } from "@/content/pages/mkt-crm";
import { useStaff } from "@/lib/marketing/api";
import type { Staff } from "@/shared/marketing/types";

export const useC = () => mktCrm(useI18n().locale);
/** Staff lookup by id (full names always — two Graces exist). */
export function useStaffMap() {
  const q = useStaff();
  const list: Staff[] = q.data?.items ?? [];
  return { list, of: (id?: string) => list.find((s) => s.id === id) ?? null };
}
// shortcut: service labels from slugs, read the live catalogue (src/lib/catalogue.ts) when the CRM gets a client-side catalogue hook.
export const SERVICE_SLUGS = ["company-registration", "vat-registration", "tax-filing", "business-plan", "trademark", "work-permit"];
export const serviceLabel = (s: string) => s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export const dateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
/** Date input value → ISO at 09:00 Africa/Kigali (UTC+2, no DST). */
export const fromDateInput = (v: string) => (v ? new Date(`${v}T07:00:00Z`).toISOString() : undefined);

/** ui/Field with a plain child: injects id + aria wiring into the single control. */
export function F({ label, hint, error, optional, className, children }: { label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; className?: string; children: ReactElement<Record<string, unknown>> }) {
  const opt = useM().common.optional;
  return (
    <Field label={label} hint={hint} error={error} optional={optional ? opt : undefined} className={className}>
      {({ id, describedBy, invalid }) => cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": invalid || undefined })}
    </Field>
  );
}

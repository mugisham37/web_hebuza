"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "@/shared/format";

// GOV.UK-style accessible fields (R-17): label above, hint, error under, aria wired, paste always allowed.
const control =
  "w-full rounded-none border border-border-strong bg-surface px-3.5 text-body text-fg placeholder:text-fg-disabled transition-[border-color,box-shadow] duration-(--duration-fast) hover:border-ink-400 focus:border-secondary focus:shadow-[0_0_0_3px_rgb(248_183_24/0.45)] focus:outline-none focus-visible:outline-none aria-invalid:border-danger aria-invalid:focus:border-danger disabled:border-border disabled:bg-bg-subtle disabled:text-fg-disabled";

type FieldProps = { label: ReactNode; hint?: ReactNode; error?: string; optional?: string; className?: string; children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode };

export function Field({ id: fixedId, label, hint, error, optional, className, children }: FieldProps & { id?: string }) {
  const autoId = useId();
  const id = fixedId ?? autoId; // fixed ids let error summaries link to the field
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cx("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-label text-fg">
        {label} {optional && <span className="text-small text-fg-subtle">({optional})</span>}
      </label>
      {hint && <p id={hintId} className="text-small text-fg-subtle">{hint}</p>}
      {error && (
        <p id={errId} className="flex items-start gap-1.5 text-small font-medium text-danger">
          <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3 2 21h20L12 3Z" /><path d="M12 10v5M12 18v.01" /></svg>
          {error}
        </p>
      )}
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(control, "h-12", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "min-h-28 py-3", className)} {...rest} />;
}
/** Native select: best on low-end Android, accessible for free. */
export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cx(control, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2312161f%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10", className)} {...rest}>
      {children}
    </select>
  );
}
export function DateInput({ className, ...rest }: Omit<ComponentProps<"input">, "type">) {
  return <input type="date" className={cx(control, "h-12", className)} {...rest} />;
}

export function Checkbox({ label, className, ...rest }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cx("flex min-h-6 cursor-pointer items-start gap-3 text-body", className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-none border-[1.5px] border-border-strong bg-surface bg-center bg-no-repeat transition-colors hover:border-ink-400 checked:border-secondary checked:bg-secondary checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223%22><path d=%22M5 12l5 5 9-10%22/></svg>')] disabled:border-border disabled:bg-bg-subtle" {...rest} />
      <span>{label}</span>
    </label>
  );
}
export function Radio({ label, className, ...rest }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cx("flex min-h-6 cursor-pointer items-start gap-3 text-body", className)}>
      <input type="radio" data-round className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-strong bg-surface transition-colors hover:border-ink-400 checked:border-[6px] checked:border-secondary disabled:border-border disabled:bg-bg-subtle" {...rest} />
      <span>{label}</span>
    </label>
  );
}
/** Switch = checkbox with role="switch" (native keyboard + screen reader support). */
export function Switch({ label, className, ...rest }: { label: ReactNode } & Omit<ComponentProps<"input">, "type" | "role">) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-3 text-body", className)}>
      <input type="checkbox" role="switch" className="peer sr-only" {...rest} />
      <span aria-hidden className="relative h-6 w-11 shrink-0 rounded-none bg-ink-300 transition-colors peer-checked:bg-secondary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
      <span>{label}</span>
    </label>
  );
}

/** Error summary at the top of a form (one link per error, focused on submit). */
export function ErrorSummary({ title, errors }: { title: string; errors: { field: string; message: string }[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" tabIndex={-1} className="border-l-[3px] border-danger bg-danger-bg p-4 focus-visible:outline-none">
      <p className="flex items-center gap-2 text-label-lg text-danger">
        <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3 2 21h20L12 3Z" /><path d="M12 10v5M12 18v.01" /></svg>
        {title}
      </p>
      <ul className="mt-2 list-disc pl-5 text-body">
        {errors.map((e) => <li key={e.field}><a className="text-danger underline underline-offset-2 hover:no-underline" href={`#${e.field}`}>{e.message}</a></li>)}
      </ul>
    </div>
  );
}

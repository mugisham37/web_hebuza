"use client";
// U5b checklist: every tick rewrites one coalesced visit.checklist op (last write wins, original seq kept).
import { cx } from "@/shared/format";
import { useCopyB } from "@/lib/field/copy-b";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useSave } from "@/lib/field/b";
import type { FieldVisit } from "@/shared/field/types";

export function Checklist({ visit }: { visit: FieldVisit }) {
  const t = useCopyB().work;
  const { locale } = useFieldCopy();
  const save = useSave();
  const done = visit.checklist.filter((c) => c.done).length;
  const tick = (id: string, v: boolean) => void save({
    kind: "visit.checklist", visitId: visit.id, coalesce: true,
    body: { base_version: visit.version, checklist: visit.checklist.map((c) => ({ id: c.id, done: c.id === id ? v : c.done })) },
  });
  return (
    <section className="border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-label-lg">{t.checklist}</h2>
        <span className="text-small font-medium tabular text-fg-muted">{fill(t.of, { a: done, b: visit.checklist.length })}</span>
      </div>
      <ul className="grid divide-y divide-border">
        {visit.checklist.map((c) => (
          <li key={c.id}>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
              <input type="checkbox" checked={c.done} onChange={(e) => tick(c.id, e.target.checked)} className="peer sr-only" />
              <span aria-hidden className={cx("flex size-7 shrink-0 items-center justify-center border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                c.done ? "border-success bg-success text-white" : "border-border-strong bg-surface")}>
                {c.done && <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path className="m-tick" pathLength={24} d="M20 6 9 17l-5-5" /></svg>}
              </span>
              <span className={cx("flex-1 text-body", c.done && "text-fg-muted")}>{c.label_i18n[locale]}</span>
              {c.required && <span className="bg-ink-100 px-2 py-0.5 text-eyebrow normal-case">{t.required}</span>}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

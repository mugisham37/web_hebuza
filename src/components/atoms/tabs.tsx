"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/shared/format";

/** WAI-ARIA tabs with arrow-key roving focus. Controlled or uncontrolled. */
export function Tabs({ tabs, value, onChange, className }: {
  tabs: { id: string; label: ReactNode; content: ReactNode; count?: number }[];
  value?: string; onChange?: (id: string) => void; className?: string;
}) {
  const uid = useId();
  const [inner, setInner] = useState(tabs[0]?.id);
  const active = value ?? inner;
  const list = useRef<HTMLDivElement>(null);
  const select = (id: string) => { setInner(id); onChange?.(id); };

  function onKey(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    select(t.id);
    list.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${uid}-${t.id}`)}`)?.focus();
  }

  return (
    <div className={className}>
      <div ref={list} role="tablist" onKeyDown={onKey} className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id} id={`${uid}-${t.id}`} role="tab" type="button"
            aria-selected={t.id === active} aria-controls={`${uid}-${t.id}-panel`} tabIndex={t.id === active ? 0 : -1}
            onClick={() => select(t.id)}
            className={cx("-mb-px flex h-11 items-center gap-2 border-b-2 px-4 text-button whitespace-nowrap transition-colors", t.id === active ? "border-primary text-fg-heading" : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg-heading")}
          >
            {t.label}
            {t.count !== undefined && <span className={cx("rounded-md px-2 text-eyebrow tabular", t.id === active ? "bg-navy-50 text-navy-700" : "bg-ink-100 text-ink-700")}>{t.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`${uid}-${t.id}-panel`} role="tabpanel" aria-labelledby={`${uid}-${t.id}`} hidden={t.id !== active} tabIndex={0} className="pt-5 focus-visible:outline-none">
          {t.id === active && t.content}
        </div>
      ))}
    </div>
  );
}

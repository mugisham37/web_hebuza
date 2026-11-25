"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Icon } from "@/components/atoms/icon";
import { cx } from "@/shared/format";

export type PriorityItem = { id: string; tone?: "danger" | "attention" | "info"; title: ReactNode; body?: ReactNode; action?: { label: string; href?: string; onClick?: () => void } };
const ORDER = { danger: 0, attention: 1, info: 2 } as const;
const TONE = {
  danger: "bg-danger-bg text-danger",
  attention: "bg-gold-100 text-gold-800",
  info: "bg-ink-950/6 text-fg-heading",
} as const;

/**
 * Dashboard "one thing at a time": several alerts / to-dos collapse into a single card showing the most urgent one
 * (danger → attention → info, then given order), with "1 of 4 · ‹ ›" to step through the rest. Nothing is hidden, it is
 * just not all shown at once. Renders nothing when empty.
 */
export function PriorityStack({ items, label, className }: { items: PriorityItem[]; label: string; className?: string }) {
  const { t } = useI18n();
  const sorted = [...items].sort((a, b) => ORDER[a.tone ?? "info"] - ORDER[b.tone ?? "info"]);
  const [i, setI] = useState(0);
  if (!sorted.length) return null;
  const at = Math.min(i, sorted.length - 1);
  const it = sorted[at];
  const tone = it.tone ?? "info";
  const step = (d: number) => setI((at + d + sorted.length) % sorted.length);
  return (
    <section aria-label={label} className={cx("flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm", className)}>
      <span aria-hidden className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", TONE[tone])}>
        <Icon name={tone === "info" ? "sparkle" : "zap"} size={18} />
      </span>
      <div aria-live="polite" className="min-w-0 flex-1 basis-56">
        <p className="text-label text-fg-heading">{it.title}</p>
        {it.body && <p className="mt-0.5 text-small text-fg-muted">{it.body}</p>}
      </div>
      {it.action && (it.action.href
        ? <Link href={it.action.href} className="inline-flex h-10 items-center gap-2 rounded-pill bg-ink-950 px-4 text-small font-medium text-white transition-colors hover:bg-ink-800">{it.action.label}<Icon name="arrowRight" size={14} aria-hidden /></Link>
        : <button type="button" onClick={it.action.onClick} className="inline-flex h-10 items-center gap-2 rounded-pill bg-ink-950 px-4 text-small font-medium text-white transition-colors hover:bg-ink-800">{it.action.label}</button>)}
      {sorted.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="px-1 text-small text-fg-subtle tabular">{t("common.ofN", { i: at + 1, n: sorted.length })}</span>
          <button type="button" onClick={() => step(-1)} aria-label={t("common.previous")} className="flex size-9 items-center justify-center rounded-full border border-border bg-white hover:bg-ink-50"><Icon name="chevronLeft" size={16} /></button>
          <button type="button" onClick={() => step(1)} aria-label={t("common.next")} className="flex size-9 items-center justify-center rounded-full border border-border bg-white hover:bg-ink-50"><Icon name="chevronRight" size={16} /></button>
        </div>
      )}
    </section>
  );
}

/** Progressive disclosure: secondary dashboard panels sit behind "Show more". */
export function MoreSection({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className={cx("grid gap-4", className)}>
      {open && children}
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="mx-auto inline-flex h-10 items-center gap-2 rounded-pill border border-border bg-white px-5 text-small font-medium text-fg-heading hover:bg-ink-50">
        {open ? t("common.showLess") : t("common.showMore")}<Icon name="chevronDown" size={14} aria-hidden className={cx("transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}

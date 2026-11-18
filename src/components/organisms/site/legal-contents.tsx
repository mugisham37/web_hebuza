"use client";
import { useEffect, useState } from "react";
import { cx } from "@/shared/format";
import { Sheet } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";

type Item = { id: string; title: string };

/** Sticky contents rail with scroll-spy (lg+) and an "On this page" bottom sheet (phone). */
export function LegalContents({ items, label }: { items: Item[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => { const hit = entries.find((e) => e.isIntersecting); if (hit) setActive(hit.target.id); },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    items.forEach((i) => { const el = document.getElementById(i.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [items]);

  const list = (onPick?: () => void) => (
    <ol className="grid gap-1">
      {items.map((i, n) => (
        <li key={i.id}>
          <a href={`#${i.id}`} onClick={onPick} aria-current={active === i.id ? "location" : undefined}
            className={cx("flex gap-3 px-3 py-2 text-small transition-colors hover:bg-navy-50", active === i.id && "bg-navy-50 font-medium text-navy-700 shadow-[inset_3px_0_0_var(--color-navy-700)]")}>
            <span className="tabular-nums text-fg-muted">{String(n + 1).padStart(2, "0")}</span>{i.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <nav aria-label={label} className="sticky top-28 hidden self-start lg:block">
        <p className="mb-3 text-eyebrow font-medium text-fg-muted">{label}</p>
        {list()}
      </nav>
      <button type="button" onClick={() => setOpen(true)}
        data-bottom-bar className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex h-12 items-center justify-between bg-secondary px-5 text-on-secondary shadow-lg lg:hidden">
        {label}<Icon name="chevronDown" size={18} className="rotate-180" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label} side="bottom">
        <nav aria-label={label}>{list(() => setOpen(false))}</nav>
      </Sheet>
    </>
  );
}

"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";

/** Native <dialog>: focus trap, Esc, top-layer and inert background for free. `side` turns it into a Sheet. */
export function Dialog({ open, onClose, title, description, children, footer, side, className }: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode;
  side?: "right" | "bottom"; className?: string;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const shape = side === "right"
    ? "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-md rounded-l-3xl border-l border-border"
    : side === "bottom"
      ? "mt-auto mb-0 w-full max-w-full rounded-t-3xl border-t border-border"
      : "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      data-motion={side ?? "center"}
      aria-labelledby={titleId}
      className={cx("bg-surface p-0 text-fg shadow-lg backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm", shape, className)}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id={titleId} className="text-card-title text-fg-heading">{title}</h2>
            {description && <p className="mt-1 text-small text-fg-subtle">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="-m-2 inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-navy-50 hover:text-fg-heading">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-border p-5">{footer}</footer>}
      </div>
    </dialog>
  );
}

export const Sheet = (props: Omit<Parameters<typeof Dialog>[0], "side"> & { side?: "right" | "bottom" }) =>
  <Dialog side={props.side ?? "right"} {...props} />;

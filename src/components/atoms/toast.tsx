"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cx } from "@/shared/format";

type Toast = { id: number; title: string; body?: string; tone: "info" | "success" | "danger"; action?: { label: string; onClick: () => void } };
const Ctx = createContext<(t: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }) => void>(() => {});

/** Minimal polite toaster (aria-live). Errors stay until dismissed; others auto-hide after 5 s (8 s with an action such as Undo). */
// Guide §7: white surface, 3px left bar in the status colour, ink-900 text, icon so colour isn't the only signal.
const BAR: Record<Toast["tone"], string> = { info: "border-l-info", success: "border-l-success-icon", danger: "border-l-danger" };
const ICON_TONE: Record<Toast["tone"], string> = { info: "text-info", success: "text-success-icon", danger: "text-danger" };
const ico = (d: string) => <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}><path d={d} /></svg>;
const ICON: Record<Toast["tone"], ReactNode> = {
  info: ico("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7.5v.01"),
  success: ico("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6"),
  danger: ico("M12 3 2 21h20L12 3ZM12 10v5M12 18v.01"),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));
  const push = useCallback((t: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }) => {
    const id = Date.now() + Math.random();
    const tone = t.tone ?? "info";
    setItems((xs) => [...xs.slice(-3), { ...t, id, tone }]);
    if (tone !== "danger") setTimeout(() => dismiss(id), t.action ? 10000 : 5000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 max-lg:bottom-16 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end">
        {items.map((t) => (
          <div key={t.id} role={t.tone === "danger" ? "alert" : "status"} className={cx("pointer-events-auto flex w-full max-w-sm m-rise items-start gap-3 rounded-none border border-l-[3px] border-border bg-surface p-4 text-fg shadow-lg", BAR[t.tone])}>
            <span aria-hidden className={cx("mt-0.5 shrink-0", ICON_TONE[t.tone])}>{ICON[t.tone]}</span>
            <div className="flex-1">
              <p className="text-label">{t.title}</p>
              {t.body && <p className="mt-1 text-small text-fg-muted">{t.body}</p>}
            </div>
            {t.action && <button type="button" onClick={() => { t.action?.onClick(); dismiss(t.id); }} className="inline-flex h-9 shrink-0 items-center rounded-none px-3 text-label text-link underline underline-offset-4 hover:bg-navy-50 hover:text-link-hover">{t.action.label}</button>}
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-my-1 inline-flex size-9 shrink-0 items-center justify-center rounded-none text-fg-subtle hover:bg-bg-subtle hover:text-fg">×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

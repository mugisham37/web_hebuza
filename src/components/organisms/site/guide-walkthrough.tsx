"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/atoms/icon";
import { RichLine, StepNumber } from "@/components/atoms/guide";
import { AnnotatedShot } from "@/components/molecules/site/annotated-shot";
import type { ShotLookup } from "@/components/molecules/site/guide";
import type { Step } from "@/content/guides/types";

type Copy = {
  walk: string;
  walkStep: string;
  close: string;
  prev: string;
  next: string;
  zoom: string;
};
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/**
 * "Walk me through it": every step of the guide, one per screen, with its annotated screenshot.
 * ← / → move, Esc closes; the progress bar shows how far along you are.
 */
export function GuideWalkthrough({
  title,
  steps,
  shots,
  copy,
}: {
  title: string;
  steps: (Step & { section: string })[];
  shots: ShotLookup;
  copy: Copy;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const n = steps.length;
  const s = steps[i];
  useEffect(() => {
    const d = dlg.current;
    const key = (e: KeyboardEvent) => {
      if (!d?.open) return;
      if (e.key === "ArrowRight") setI((x) => Math.min(n - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [n]);
  if (!n || !s) return null;
  const shot = s.shot ? shots[s.shot] : undefined;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setI(0);
          dlg.current?.showModal();
        }}
        className="inline-flex h-12 items-center gap-2.5 bg-primary px-5 text-button text-on-gold hover:bg-primary-hover"
      >
        <Icon name="play" size={16} />
        {copy.walk}
      </button>
      <dialog
        ref={dlg}
        aria-label={`${copy.walk}: ${title}`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg p-0 backdrop:bg-ink-950/70"
      >
        <div className="mx-auto grid h-full w-[min(100%-2rem,72rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 py-4 md:py-6">
          <header className="flex items-center justify-between gap-4">
            <p className="min-w-0 truncate text-label text-fg-muted">{title}</p>
            <button
              type="button"
              onClick={() => dlg.current?.close()}
              className="inline-flex h-10 shrink-0 items-center gap-2 border border-border-strong bg-white px-4 text-button text-ink-900"
            >
              <Icon name="x" size={16} />
              {copy.close}
            </button>
          </header>
          <div aria-hidden className="h-1.5 bg-ink-100">
            <div
              className="h-full bg-gold-400 transition-[width] duration-300"
              style={{ width: `${((i + 1) / n) * 100}%` }}
            />
          </div>
          <div className="grid min-h-0 content-start gap-5 overflow-y-auto">
            <p
              className="text-eyebrow text-fg-subtle uppercase"
              aria-live="polite"
            >
              {fill(copy.walkStep, { i: i + 1, n })} · {s.section}
            </p>
            <p className="flex items-start gap-3.5 text-lead text-fg-heading">
              <StepNumber n={i + 1} className="size-10 text-body" />
              <span className="pt-1.5">
                <RichLine text={s.text} />
              </span>
            </p>
            {shot && s.shot && (
              <AnnotatedShot
                key={s.shot}
                src={shot.src ?? ""}
                alt={s.caption ?? s.text.replace(/\*\*/g, "")}
                shot={shot}
                labels={s.marks ?? []}
                caption={s.caption}
                zoomLabel={copy.zoom}
                closeLabel={copy.close}
              />
            )}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => setI(i - 1)}
              className="inline-flex h-12 items-center gap-2 border border-border-strong bg-white px-5 text-button text-ink-900 disabled:opacity-40"
            >
              <Icon name="chevronLeft" size={18} />
              {copy.prev}
            </button>
            <span className="text-small text-fg-muted tabular">
              {i + 1} / {n}
            </span>
            {i < n - 1 ? (
              <button
                type="button"
                onClick={() => setI(i + 1)}
                className="inline-flex h-12 items-center gap-2 bg-secondary px-5 text-button text-on-secondary hover:bg-secondary-hover"
              >
                {copy.next}
                <Icon name="chevronRight" size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => dlg.current?.close()}
                className="inline-flex h-12 items-center gap-2 bg-primary px-5 text-button text-on-gold hover:bg-primary-hover"
              >
                <Icon name="check" size={18} />
                {copy.close}
              </button>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}

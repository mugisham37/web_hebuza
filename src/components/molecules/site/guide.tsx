"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/atoms/icon";
import { Highlighted, RichLine, StepNumber } from "@/components/atoms/guide";
import { AnnotatedShot } from "@/components/molecules/site/annotated-shot";
import type { GuideText, ShotData, Step } from "@/content/guides/types";
import { cx } from "@/shared/format";

export type ShotLookup = Record<string, ShotData | undefined>;
type ShotCopy = { zoom: string; close: string };

/** One numbered step: number, sentence, and its annotated screenshot when it has one. */
export function GuideStep({
  n,
  step,
  shots,
  copy,
  priority,
}: {
  n: number;
  step: Step;
  shots: ShotLookup;
  copy: ShotCopy;
  priority?: boolean;
}) {
  const shot = step.shot ? shots[step.shot] : undefined;
  return (
    <li className="grid gap-4">
      <p className="flex items-start gap-3.5 text-body text-ink-800">
        <StepNumber n={n} />
        <span className="pt-1">
          <RichLine text={step.text} />
        </span>
      </p>
      {shot && step.shot && (
        <div className="sm:pl-11.5">
          <AnnotatedShot
            src={shot.src ?? ""}
            alt={step.caption ?? step.text.replace(/\*\*/g, "")}
            shot={shot}
            labels={step.marks ?? []}
            caption={step.caption}
            zoomLabel={copy.zoom}
            closeLabel={copy.close}
            priority={priority}
          />
        </div>
      )}
    </li>
  );
}

/** Irembo-style facts box: who it's for, time, cost, what to have ready. */
export function FactsBox({
  facts,
  labels,
  compact,
}: {
  facts: NonNullable<GuideText["facts"]>;
  labels: { who: string; time: string; cost: string; need: string };
  /** narrow container (help panel): one column */
  compact?: boolean;
}) {
  const rows = (
    [
      ["who", facts.who, "users"],
      ["time", facts.time, "clock"],
      ["cost", facts.cost, "wallet"],
    ] as const
  ).filter(([, v]) => v);
  return (
    <div className={cx("grid gap-5 border border-border bg-white p-5", compact ? "gap-4 p-4" : "sm:grid-cols-[repeat(3,minmax(0,1fr))] md:p-6")}>
      {rows.map(([k, v, icon]) => (
        <div key={k} className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center bg-sky-100 text-navy-700">
            <Icon name={icon} size={18} />
          </span>
          <span className="grid">
            <span className="text-eyebrow text-fg-subtle uppercase">
              {labels[k]}
            </span>
            <span className="text-label text-fg-heading">{v}</span>
          </span>
        </div>
      ))}
      {facts.need && facts.need.length > 0 && (
        <div className={cx("border-t border-border pt-4", !compact && "sm:col-span-3")}>
          <p className="text-eyebrow text-fg-subtle uppercase">{labels.need}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {facts.need.map((x) => (
              <li
                key={x}
                className="flex items-center gap-1.5 bg-sky-50 px-3 py-1.5 text-small text-navy-900"
              >
                <Icon name="check" size={14} strokeWidth={3} />
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Search/topic result card. */
export function GuideResult({
  href,
  cat,
  title,
  ranges,
  summary,
  minutes,
}: {
  href: string;
  cat: string;
  title: string;
  ranges: [number, number][];
  summary: string;
  minutes: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 border border-border bg-white p-5 transition-colors hover:border-navy-300 md:p-6"
    >
      <span className="grid min-w-0 flex-1 gap-2">
        <span className="flex flex-wrap items-center gap-3 text-small">
          <span className="bg-sky-100 px-2.5 py-0.5 text-navy-800">{cat}</span>
          <span className="text-fg-subtle">{minutes}</span>
        </span>
        <span className="text-card-title text-fg-heading group-hover:underline group-hover:underline-offset-4">
          <Highlighted text={title} ranges={ranges} />
        </span>
        <span className="line-clamp-2 text-small text-fg-muted">{summary}</span>
      </span>
      <Icon
        name="chevronRight"
        size={20}
        className="mt-1 shrink-0 text-navy-700 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** Sticky "On this page" list; the section in view is marked. */
export function OnThisPage({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: string }[];
}) {
  const [on, setOn] = useState(items[0]?.id);
  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (es) => {
        const v = es
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (v) setOn(v.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label={title} className="grid gap-3">
      <p className="text-eyebrow text-fg-subtle uppercase">{title}</p>
      <ul className="grid border-l border-border">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={on === i.id ? "location" : undefined}
              className={cx(
                "-ml-px block border-l-2 py-1.5 pl-4 text-small transition-colors",
                on === i.id
                  ? "border-navy-700 font-medium text-navy-900"
                  : "border-transparent text-fg-muted hover:text-fg-heading",
              )}
            >
              {i.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "Was this guide helpful?" shortcut: the answer is remembered per browser only; send it to an API when feedback counts are needed. */
export function Helpful({
  id,
  copy,
}: {
  id: string;
  copy: { helpful: string; yes: string; no: string; thanks: string };
}) {
  const key = `guide-helpful:${id}`;
  const [voted, setVoted] = useState(false);
  const stored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return !!localStorage.getItem(key);
      } catch {
        return false;
      }
    },
    () => false,
  );
  const done = voted || stored;
  const vote = (v: "yes" | "no") => {
    try {
      localStorage.setItem(key, v);
    } catch {}
    setVoted(true);
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-6">
      <p className="text-h3">{copy.helpful}</p>
      {done ? (
        <p
          role="status"
          className="flex items-center gap-2 text-body text-success"
        >
          <Icon name="check" size={18} />
          {copy.thanks}
        </p>
      ) : (
        <div className="flex gap-2">
          {(["yes", "no"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => vote(v)}
              className="inline-flex h-11 min-w-24 items-center justify-center gap-2 border border-border-strong bg-white px-5 text-button text-ink-900 hover:border-navy-700 hover:bg-sky-50"
            >
              {v === "yes" ? (
                <Icon name="check" size={16} />
              ) : (
                <Icon name="x" size={16} />
              )}
              {copy[v]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

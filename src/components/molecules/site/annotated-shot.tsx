"use client";
import Image from "next/image";
import { useRef } from "react";
import { Icon } from "@/components/atoms/icon";
import { MarkerDot } from "@/components/atoms/guide";
import type { Mark, ShotData } from "@/content/guides/types";

const LW = 250,
  LH = 46,
  GAP = 56; // label box (image px)
type Placed = {
  n: number;
  label: string;
  box: { x: number; y: number; w: number; h: number };
  lx: number;
  ly: number;
  side: "left" | "right" | "below";
};

/** Places each label beside its box (right, else left, else below) and nudges labels on the same side apart. */
function place(shot: ShotData, labels: string[]): Placed[] {
  const { w, h } = shot;
  const out: Placed[] = [];
  shot.marks.forEach((m: Mark | null, i) => {
    if (!m) return;
    const box = {
      x: (m.x / 100) * w,
      y: (m.y / 100) * h,
      w: (m.w / 100) * w,
      h: (m.h / 100) * h,
    };
    const label = labels[i] ?? "";
    const cy = Math.min(h - LH - 8, Math.max(8, box.y + box.h / 2 - LH / 2));
    const side =
      box.x + box.w + GAP + LW < w
        ? "right"
        : box.x - GAP - LW > 0
          ? "left"
          : "below";
    const lx =
      side === "right"
        ? box.x + box.w + GAP
        : side === "left"
          ? box.x - GAP - LW
          : Math.min(w - LW - 8, Math.max(8, box.x));
    const ly =
      side === "below" ? Math.min(h - LH - 8, box.y + box.h + GAP / 2) : cy;
    out.push({ n: i + 1, label, box, lx, ly, side });
  });
  for (const s of ["left", "right", "below"] as const) {
    const col = out
      .filter((p) => p.side === s && p.label)
      .sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < col.length; i++)
      if (col[i].ly < col[i - 1].ly + LH + 10)
        col[i].ly = col[i - 1].ly + LH + 10;
  }
  return out;
}

function Frame({
  src,
  alt,
  shot,
  labels,
  priority,
  big,
}: {
  src: string;
  alt: string;
  shot: ShotData;
  labels: string[];
  priority?: boolean;
  big?: boolean;
}) {
  const { w, h } = shot;
  const ps = place(shot, labels);
  const holes = ps
    .map(({ box: b }) => `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`)
    .join("");
  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={big ? "96vw" : "(min-width: 1024px) 760px, 100vw"}
        className="object-cover object-top"
      />
      <svg
        aria-hidden
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 size-full"
      >
        <defs>
          <marker
            id="g-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10Z" fill="var(--color-navy-700)" />
          </marker>
        </defs>
        {/* Dim everything except the marked areas so the eye goes straight to them. */}
        <path
          d={`M0 0H${w}V${h}H0Z${holes}`}
          fill="var(--color-navy-950)"
          fillOpacity={0.3}
          fillRule="evenodd"
        />
        {ps.map(({ n, box: b }) => (
          <rect
            key={n}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill="none"
            stroke="var(--color-gold-400)"
            strokeWidth={4}
          />
        ))}
        <g className={big ? "" : "max-sm:hidden"}>
          {ps
            .filter((p) => p.label)
            .map(({ n, box: b, lx, ly, side }) => {
              const [sx, sy] =
                side === "right"
                  ? [lx, ly + LH / 2]
                  : side === "left"
                    ? [lx + LW, ly + LH / 2]
                    : [lx + LW / 2, ly];
              const [ex, ey] =
                side === "right"
                  ? [b.x + b.w + 6, b.y + b.h / 2]
                  : side === "left"
                    ? [b.x - 6, b.y + b.h / 2]
                    : [b.x + b.w / 2, b.y + b.h + 6];
              const d =
                side === "below"
                  ? `M${sx} ${sy}C${sx} ${(sy + ey) / 2} ${ex} ${(sy + ey) / 2} ${ex} ${ey}`
                  : `M${sx} ${sy}C${(sx + ex) / 2} ${sy} ${(sx + ex) / 2} ${ey} ${ex} ${ey}`;
              return (
                <g key={n}>
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--color-white)"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--color-navy-700)"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    markerEnd="url(#g-arrow)"
                  />
                </g>
              );
            })}
        </g>
      </svg>
      {ps.map(({ n, box: b }) => (
        <MarkerDot
          key={n}
          n={n}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(b.x / w) * 100}%`, top: `${(b.y / h) * 100}%` }}
        />
      ))}
      {ps
        .filter((p) => p.label)
        .map(({ n, lx, ly, label }) => (
          <span
            key={n}
            aria-hidden
            className={`absolute flex items-center gap-1.5 bg-navy-700 px-2 py-1 font-medium leading-tight text-white shadow-md ${big ? "text-small" : "text-[clamp(0.625rem,1.1vw,0.8125rem)] max-sm:hidden"}`}
            style={{
              left: `${(lx / w) * 100}%`,
              top: `${(ly / h) * 100}%`,
              maxWidth: `${(LW / w) * 100}%`,
            }}
          >
            <span className="text-primary tabular">{n}</span>
            {label}
          </span>
        ))}
    </div>
  );
}

/** A real app screenshot with gold highlight boxes, numbered markers and labelled arrows; the same labels are listed as text below (phones, screen readers). Click to enlarge. */
export function AnnotatedShot({
  src,
  alt,
  shot,
  labels,
  caption,
  zoomLabel,
  closeLabel,
  priority,
}: {
  src: string;
  alt: string;
  shot: ShotData;
  labels: string[];
  caption?: string;
  zoomLabel: string;
  closeLabel: string;
  priority?: boolean;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const listed = shot.marks
    .map((m, i) => (m && labels[i] ? { n: i + 1, label: labels[i] } : null))
    .filter((x) => x !== null);
  return (
    <figure className="grid gap-3">
      <button
        type="button"
        onClick={() => dlg.current?.showModal()}
        aria-label={`${zoomLabel}: ${alt}`}
        className="group relative block w-full cursor-zoom-in border border-border bg-white p-1.5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
      >
        <Frame
          src={src}
          alt={alt}
          shot={shot}
          labels={labels}
          priority={priority}
        />
        <span
          aria-hidden
          className="absolute top-3 right-3 flex size-8 items-center justify-center bg-white/90 text-navy-700 opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Icon name="expand" size={16} />
        </span>
      </button>
      {(caption || listed.length > 0) && (
        <figcaption className="grid gap-2 text-small text-fg-muted">
          {listed.length > 0 && (
            <ol className="flex flex-wrap gap-x-5 gap-y-1.5">
              {listed.map(({ n, label }) => (
                <li key={n} className="flex items-center gap-2">
                  <MarkerDot
                    n={n}
                    className="size-5 text-[0.6875rem] ring-0 shadow-none"
                  />
                  {label}
                </li>
              ))}
            </ol>
          )}
          {caption && <span>{caption}</span>}
        </figcaption>
      )}
      <dialog
        ref={dlg}
        aria-label={alt}
        onClick={(e) => e.target === e.currentTarget && dlg.current?.close()}
        className="m-auto max-h-[96dvh] w-[min(96vw,1400px)] max-w-none bg-transparent p-0 backdrop:bg-ink-950/80"
      >
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => dlg.current?.close()}
            className="ml-auto flex h-10 items-center gap-2 bg-white px-4 text-button text-navy-900"
          >
            <Icon name="x" size={16} />
            {closeLabel}
          </button>
          <div className="border border-white/20 bg-white p-1.5">
            <Frame src={src} alt={alt} shot={shot} labels={labels} big />
          </div>
        </div>
      </dialog>
    </figure>
  );
}

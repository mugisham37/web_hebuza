import Image from "next/image";
import type { ReactNode } from "react";
import { cx } from "@/shared/format";

/** Accessible tooltip: shown on hover AND keyboard focus; content is also the accessible description. */
export function Tooltip({ content, children, className }: { content: string; children: ReactNode; className?: string }) {
  return (
    <span className={cx("group/tt relative inline-flex", className)}>
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-64 -translate-x-1/2 rounded-md bg-ink-900 px-2.5 py-1.5 text-small text-white shadow-md opacity-0 transition-opacity group-focus-within/tt:opacity-100 group-hover/tt:opacity-100">
        {content}
      </span>
    </span>
  );
}

const AVATAR = { sm: "size-8 text-eyebrow", md: "size-10 text-small", lg: "size-14 text-label" } as const;
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: keyof typeof AVATAR; className?: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span data-round className={cx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-100 font-medium text-navy-700 ring-2 ring-white", AVATAR[size], className)}>
      {src ? <Image src={src} alt={name} fill sizes="56px" className="object-cover" /> : <span aria-label={name}>{initials}</span>}
    </span>
  );
}

/** Overlapping face stack (landing1 "Faces"). */
export function AvatarStack({ people, max = 4 }: { people: { name: string; src?: string }[]; max?: number }) {
  return (
    <span className="flex -space-x-3">
      {people.slice(0, max).map((p) => <Avatar key={p.name} name={p.name} src={p.src} />)}
    </span>
  );
}

/** Wizard stepper: done navy, current gold ring, upcoming ink-300 (guide §7). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol tabIndex={0} className="flex items-center gap-2 overflow-x-auto" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2 whitespace-nowrap">
          <span className={cx("flex size-7 items-center justify-center rounded-full text-eyebrow", i < current ? "bg-navy-700 text-white" : i === current ? "bg-white text-navy-700 ring-[3px] ring-gold-400 ring-inset" : "bg-white text-fg-subtle ring-1 ring-ink-300 ring-inset")}>{i < current ? "✓" : i + 1}</span>
          <span className={cx("text-small", i === current ? "font-medium text-fg-heading" : "text-fg-subtle")}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className={cx("h-px w-6", i < current ? "bg-navy-700" : "bg-border-strong")} />}
        </li>
      ))}
    </ol>
  );
}

/** Vertical timeline for case history (client-visible events only — F-CLP-04). */
export function Timeline({ items }: { items: { id: string; title: ReactNode; meta?: ReactNode; body?: ReactNode; current?: boolean }[] }) {
  return (
    <ol className="relative grid gap-6 border-l border-border-strong pl-6">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span aria-hidden className={cx("absolute top-1 -left-[1.95rem] size-3.5 rounded-full ring-4 ring-bg", it.current ? "bg-gold-400" : "bg-navy-700")} />
          <p className="text-label text-fg">{it.title}</p>
          {it.meta && <p className="text-small text-fg-subtle">{it.meta}</p>}
          {it.body && <div className="mt-2 text-body text-fg-muted">{it.body}</div>}
        </li>
      ))}
    </ol>
  );
}


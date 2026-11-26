import type { ReactNode } from "react";
import { Icon } from "@/components/atoms/icon";
import { cx } from "@/shared/format";

/** Guide step number: navy square, gold digit (matches the numbered markers on screenshots). */
export function StepNumber({
  n,
  className,
}: {
  n: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "flex size-8 shrink-0 items-center justify-center bg-navy-700 font-display text-label text-gold-400 tabular",
        className,
      )}
    >
      {n}
    </span>
  );
}

/** Numbered marker dot drawn over a screenshot (round on purpose: it reads as a pin, not a control). */
export function MarkerDot({
  n,
  className,
  style,
}: {
  n: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      data-round
      style={style}
      className={cx(
        "flex size-7 items-center justify-center rounded-full bg-navy-700 text-small font-semibold text-gold-400 shadow-md ring-2 ring-white tabular",
        className,
      )}
    >
      {n}
    </span>
  );
}

/** Tip / warning box: 3px left rule, tinted ground, icon + title. */
export function Callout({
  kind,
  title,
  children,
}: {
  kind: "tip" | "warn";
  title: string;
  children: ReactNode;
}) {
  const warn = kind === "warn";
  return (
    <aside
      className={cx(
        "grid gap-2 border-l-[3px] p-5",
        warn ? "border-gold-500 bg-gold-50" : "border-navy-700 bg-sky-50",
      )}
    >
      <p className="flex items-center gap-2 text-label text-navy-900">
        <Icon
          name={warn ? "alert" : "info"}
          size={18}
          className="shrink-0"
        />
        {title}
      </p>
      <div className="text-body text-ink-800">{children}</div>
    </aside>
  );
}

/** Renders `**bold**` spans in short guide sentences (button and field names). */
export function RichLine({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i} className="font-semibold text-fg-heading">
            {p.slice(2, -2)}
          </strong>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** Text with highlighted ranges (search hits). */
export function Highlighted({
  text,
  ranges,
}: {
  text: string;
  ranges: [number, number][];
}) {
  if (!ranges.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(
      <mark key={i} className="bg-gold-200 px-0.5 text-inherit">
        {text.slice(a, b)}
      </mark>,
    );
    at = b;
  });
  out.push(text.slice(at));
  return <>{out}</>;
}

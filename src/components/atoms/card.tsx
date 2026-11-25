import type { ComponentProps } from "react";
import { cx } from "@/shared/format";

// Guide §7 job card: white surface, ink-200 hairline, radius 0; interactive cards lift to navy-300 + shadow-md.
const TONE = {
  white: "border border-border bg-surface text-fg",
  outline: "border border-border bg-transparent",
  subtle: "border border-border bg-bg-subtle text-fg",
  tint: "border border-sky-100 bg-bg-tint text-fg",
  featured: "border border-border border-l-[3px] border-l-primary bg-surface text-fg",
  /** Navy/Night panel; wraps .theme-dark so roles inside flip. */
  navy: "theme-dark bg-navy-900 text-fg",
} as const;

/** Sharp surface. `interactive` adds the hover lift; `stacked` adds an offset navy-tinted back plate. */
export function Card({ tone = "white", stacked, interactive, className, children, ...rest }: { tone?: keyof typeof TONE; stacked?: boolean; interactive?: boolean } & ComponentProps<"div">) {
  const card = (
    <div className={cx("relative rounded-none p-6", TONE[tone], interactive && "transition-[border-color,box-shadow] duration-(--duration-base) hover:border-navy-300 hover:shadow-md", className)} {...rest}>
      {children}
    </div>
  );
  if (!stacked) return card;
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rounded-none bg-navy-100" />
      {card}
    </div>
  );
}

export function CardHeader({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("mb-4 flex items-start justify-between gap-4", className)} {...rest} />;
}

import { cx } from "@/shared/format";
import { Star } from "@/components/atoms/brand";

/** Infinite word ribbon with gold stars (landing1 "Ribbon"). Static for reduced motion; pauses on hover. */
export function Marquee({ items, className, size = "md", fade = "mask-fade-x", seconds }: { items: string[]; className?: string; size?: "md" | "sm" | "xs"; fade?: string; seconds?: number }) {
  const row = (hidden?: boolean) => (
    <div aria-hidden={hidden} className="flex shrink-0 items-center">
      {items.map((it, i) => (
        <span key={`${i}-${it}`} className={cx("flex items-center whitespace-nowrap", size === "xs" ? "gap-4 pr-4 text-small" : size === "sm" ? "gap-5 pr-5 text-body" : "gap-7 pr-7 text-label-lg")}>
          <Star className={cx("text-gold-600", size === "xs" ? "size-2.5" : size === "sm" ? "size-3" : "size-4")} />{it}
        </span>
      ))}
    </div>
  );
  return (
    <div className={cx("group overflow-hidden", fade, className)} role="marquee" aria-label={items.join(", ")}>
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none" style={seconds ? { animationDuration: `${seconds}s` } : undefined}>{row()}{row(true)}</div>
    </div>
  );
}

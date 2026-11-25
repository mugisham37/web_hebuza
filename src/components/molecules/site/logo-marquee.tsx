import { cx } from "@/shared/format";
import { LogoTile } from "@/components/atoms/logo-tile";

type Logo = { short: string; name: string; logo?: string; flat?: boolean; caption?: string };

/**
 * One endlessly moving row of logo tiles. The list is drawn twice (second copy aria-hidden) and slid by -50%, so the
 * loop is seamless; `reverse` runs it left → right. Hovering the row pauses it. Reduced motion: no animation, the
 * row scrolls sideways by hand instead.
 */
export function LogoMarquee({ items, seconds, reverse, label }: { items: Logo[]; seconds: number; reverse?: boolean; label: string }) {
  const row = (hidden?: boolean) => (
    <ul aria-hidden={hidden || undefined} aria-label={hidden ? undefined : label} className="flex shrink-0 gap-3 pr-3">
      {items.map((i) => <li key={i.short}><LogoTile {...i} /></li>)}
    </ul>
  );
  return (
    <div className="group mask-fade-x overflow-hidden motion-reduce:no-scrollbar motion-reduce:overflow-x-auto">
      <div className={cx("flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none", reverse && "[animation-direction:reverse]")}
        style={{ animationDuration: `${seconds}s` }}>
        {row()}{row(true)}
      </div>
    </div>
  );
}

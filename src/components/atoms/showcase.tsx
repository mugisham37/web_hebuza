"use client";
import type { KeyboardEvent, Ref } from "react";
import { Icon } from "@/components/atoms/icon";
import { cx } from "@/shared/format";

/** One row of the hero's category menu (a tab): just the category name; rows share the panel height on desktop. */
export function CategoryTab({ name, selected, panelId, id, onSelect, onKeyDown, ref }: {
  name: string; selected: boolean; panelId: string; id: string;
  onSelect: () => void; onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void; ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button ref={ref} id={id} type="button" role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1}
      onClick={onSelect} onKeyDown={onKeyDown}
      className={cx("relative flex shrink-0 items-center text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-700",
        "h-11 border px-4 text-small font-medium whitespace-nowrap",
        "lg:h-auto lg:w-full lg:flex-1 lg:border-0 lg:border-b lg:border-l-3 lg:px-5 lg:text-[1.0625rem] lg:leading-snug lg:whitespace-normal",
        selected ? "border-navy-700 bg-navy-700 text-white lg:border-l-gold-400" : "border-border bg-white text-fg-heading hover:bg-navy-50 lg:border-l-transparent lg:border-b-border")}>
      {name}
    </button>
  );
}

/** The autoplay clock: a thin gold line filling over one slide. Its CSS animation IS the timer (onEnd fires when full), so
 *  pausing it pauses autoplay and reduced motion (line hidden) never autoplays. */
export function SlideTimer({ tick, ms, running, onEnd }: { tick: string; ms: number; running: boolean; onEnd: () => void }) {
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/15 motion-reduce:hidden">
      <span key={tick} className="block h-full origin-left animate-showcase bg-gold-400"
        style={{ animationDuration: `${ms}ms`, animationPlayState: running ? "running" : "paused" }} onAnimationEnd={onEnd} />
    </span>
  );
}

/** Dots + prev/next + pause for the poster. Dots are buttons (go to slide). */
export function SlideControls({ count, index, playing, labels, onGo, onPrev, onNext, onToggle }: {
  count: number; index: number; playing: boolean;
  labels: { prev: string; next: string; pause: string; play: string; slide: (i: number) => string };
  onGo: (i: number) => void; onPrev: () => void; onNext: () => void; onToggle: () => void;
}) {
  const btn = "flex size-10 items-center justify-center border border-white/30 bg-navy-900/40 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5" role="group">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" aria-label={labels.slide(i + 1)} aria-current={i === index || undefined} onClick={() => onGo(i)}
            className="group flex h-10 items-center px-1 focus-visible:outline-2 focus-visible:outline-white">
            <span className={cx("block h-1 transition-all duration-300", i === index ? "w-8 bg-gold-400" : "w-4 bg-white/50 group-hover:bg-white")} />
          </button>
        ))}
      </div>
      <span className="ml-auto flex gap-2">
        <button type="button" aria-label={labels.prev} onClick={onPrev} className={btn}><Icon name="chevronLeft" size={18} /></button>
        <button type="button" aria-label={playing ? labels.pause : labels.play} onClick={onToggle} className={btn}><Icon name={playing ? "pause" : "play"} size={16} /></button>
        <button type="button" aria-label={labels.next} onClick={onNext} className={btn}><Icon name="chevronRight" size={18} /></button>
      </span>
    </div>
  );
}

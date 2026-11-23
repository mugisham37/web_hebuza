"use client";
import type { KeyboardEvent } from "react";
import { Icon, type IconName } from "@/components/atoms/icon";
import { cx } from "@/shared/format";

/** One radio in the sign-in role picker; sits on the role gradient. Roving tabindex is managed by the parent. */
export function RoleCard({ icon, label, selected, onSelect, onKeyDown }: {
  icon: IconName; label: string; selected: boolean; onSelect: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cx(
        "relative flex shrink-0 items-center gap-2 border text-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        "h-10 px-3 lg:h-auto lg:min-h-20 lg:flex-col lg:justify-center lg:px-2 lg:py-3 lg:text-center", // chip on phones, card on desktop
        selected ? "border-white bg-white text-role-accent" : "border-white/20 bg-white/10 text-white hover:bg-white/20",
      )}
    >
      <Icon name={icon} size={20} className="shrink-0" />
      <span className="min-w-0 whitespace-nowrap leading-tight lg:text-[0.8125rem] lg:whitespace-normal">{label}</span>
      {selected && <Icon name="check" size={14} className="shrink-0 lg:absolute lg:top-1.5 lg:right-1.5" />}
    </button>
  );
}

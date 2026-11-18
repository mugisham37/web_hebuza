import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/shared/format";

// Guide §7 buttons: sharp corners, gold = the ONE main action per view, navy = everything else that's filled.
// Disabled states are explicit (guide), not opacity. Focus ring comes from the global :focus-visible (D6).
const VARIANTS = {
  primary:
    "bg-primary text-on-gold font-semibold hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:text-fg-disabled aria-disabled:bg-primary-disabled aria-disabled:text-fg-disabled",
  secondary:
    "bg-secondary text-on-secondary hover:bg-secondary-hover active:bg-secondary-active disabled:bg-ink-200 disabled:text-ink-400 aria-disabled:bg-ink-200 aria-disabled:text-ink-400",
  outline:
    "border-[1.5px] border-secondary bg-transparent text-secondary hover:bg-navy-50 active:bg-navy-100 disabled:border-ink-300 disabled:text-ink-400 aria-disabled:border-ink-300 aria-disabled:text-ink-400",
  "outline-dark":
    "border-[1.5px] border-white bg-transparent text-white hover:bg-white/8 active:bg-white/16 disabled:border-ink-700 disabled:text-ink-600 aria-disabled:border-ink-700 aria-disabled:text-ink-600",
  ghost:
    "bg-transparent text-link hover:bg-navy-50 active:bg-navy-100 disabled:text-ink-400 aria-disabled:text-ink-400",
  danger:
    "bg-danger text-white hover:bg-danger-hover active:bg-danger-active disabled:bg-danger-bg disabled:text-ink-400 aria-disabled:bg-danger-bg aria-disabled:text-ink-400",
  /** White fill for navy/Night bands that aren't wrapped in .theme-dark yet. */
  inverse:
    "bg-white text-navy-900 hover:bg-navy-100 active:bg-navy-200 disabled:bg-ink-800 disabled:text-ink-600 aria-disabled:bg-ink-800 aria-disabled:text-ink-600",
} as const;
export type ButtonVariant = keyof typeof VARIANTS;

const SIZES = {
  sm: "h-9 px-4 gap-2 text-small font-medium",
  md: "h-11 px-5 gap-3 text-button",
  lg: "h-14 pl-7 pr-6 gap-4 text-label",
  xl: "h-16 pl-8 pr-7 gap-4 text-label-lg",
  icon: "size-11 justify-center",
} as const;

type Common = {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  dots?: boolean;
  loading?: boolean;
  children?: ReactNode;
};

const base =
  "group/btn inline-flex shrink-0 items-center rounded-none whitespace-nowrap select-none transition-colors duration-(--duration-base) ease-(--ease-standard) disabled:pointer-events-none aria-disabled:pointer-events-none";

/** Default is `secondary` (navy): the old default black button. Use `primary` (gold) once per view for the main action. */
export function buttonClass({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return cx(base, VARIANTS[variant], SIZES[size], className);
}

/** Three-dot motif: accent dot then current colour at 45 % / 20 %; breathes on hover (globals.css). */
export function Dots({
  accent = "gold",
  className,
}: {
  accent?: "gold" | "navy" | "lime" | "ink" | "purple";
  className?: string;
}) {
  const a =
    accent === "gold" || accent === "lime" ? "bg-gold-400" : "bg-navy-700";
  return (
    <span
      aria-hidden
      className={cx("inline-flex items-center gap-[3px]", className)}
    >
      <span className={cx("btn-dot size-[6px] rounded-full", a)} />
      <span className="btn-dot size-[6px] rounded-full bg-current opacity-45" />
      <span className="btn-dot size-[6px] rounded-full bg-current opacity-20" />
    </span>
  );
}

// On gold: navy dots. On navy / dark: gold dots. On light outline/ghost: navy.
const DOT_ACCENT: Record<ButtonVariant, "gold" | "navy"> = {
  primary: "navy",
  secondary: "gold",
  outline: "navy",
  "outline-dark": "gold",
  ghost: "navy",
  danger: "navy",
  inverse: "navy",
};

function Inner({ dots, loading, children, variant = "secondary" }: Common) {
  return (
    <>
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
      {dots && <Dots accent={DOT_ACCENT[variant]} />}
    </>
  );
}

export function Button({
  variant,
  size,
  dots,
  loading,
  className,
  children,
  disabled,
  ...rest
}: Common & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner dots={dots} loading={loading} variant={variant}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  dots,
  className,
  children,
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...rest}>
      <Inner dots={dots} variant={variant}>
        {children}
      </Inner>
    </Link>
  );
}

// Square icon buttons (D7). Old tone names kept: ink → navy, lavender → gold, cream/white → light.
const SQUARE = {
  ink: "bg-secondary text-on-secondary hover:bg-secondary-hover",
  navy: "bg-secondary text-on-secondary hover:bg-secondary-hover",
  lavender: "bg-primary text-on-gold hover:bg-primary-hover",
  gold: "bg-primary text-on-gold hover:bg-primary-hover",
  cream:
    "border border-border bg-surface text-fg-heading hover:border-navy-300",
  white: "bg-white text-navy-700 shadow-sm hover:bg-navy-50",
} as const;

/** Square aside button: an 8-point star (or arrow); the glyph turns a quarter on hover. */
export function CircleLink({
  className,
  label,
  tone = "cream",
  glyph = "star",
  size = "md",
  ...rest
}: ComponentProps<typeof Link> & {
  label: string;
  tone?: keyof typeof SQUARE;
  glyph?: "star" | "arrow";
  size?: "md" | "lg";
}) {
  return (
    <Link
      aria-label={label}
      className={cx(
        "group/circle inline-flex shrink-0 items-center justify-center rounded-none transition-[transform,background-color] duration-(--duration-slow) ease-(--ease-out-expo) hover:scale-105",
        size === "lg" ? "size-[4.5rem]" : "size-14",
        SQUARE[tone],
        className,
      )}
      {...rest}
    >
      {glyph === "star" ? (
        <svg
          viewBox="0 0 100 100"
          className="size-6 transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/circle:rotate-90"
          fill="currentColor"
          aria-hidden
        >
          <polygon points="50,0 56,38 85,15 62,44 100,50 62,56 85,85 56,62 50,100 44,62 15,85 38,56 0,50 38,44 15,15 44,38" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="size-5 transition-transform duration-(--duration-base) group-hover/circle:-rotate-45"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="square"
          aria-hidden
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </Link>
  );
}

/** Back-compat alias (arrow glyph, navy). */
export const ArrowLink = (
  p: ComponentProps<typeof Link> & { label: string },
) => <CircleLink tone="ink" glyph="arrow" {...p} />;

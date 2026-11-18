import type { ComponentProps, ElementType, ReactNode } from "react";
import { cx } from "@/shared/format";
import { Tag, type TagVariant } from "@/components/atoms/tag";

// Type roles from landing1 presets → utilities generated in globals.css.
const SIZE = {
  wordmark: "font-display text-wordmark uppercase",
  display: "text-display",
  cta: "text-cta",
  h2: "text-h2",
  "statement-xl": "text-statement-xl",
  statement: "text-statement",
  h3: "text-h3",
  "card-title": "text-card-title",
  lead: "text-lead text-fg-muted",
  body: "text-body",
  small: "text-small text-fg-subtle",
} as const;

export function Heading({ as: As = "h2", size = "h2", className, children, ...rest }: { as?: ElementType; size?: keyof typeof SIZE; className?: string; children: ReactNode } & Omit<ComponentProps<"h2">, "children">) {
  return <As className={cx(SIZE[size], "text-fg-heading", className)} {...rest}>{children}</As>;
}

export function Text({ as: As = "p", size = "body", className, children }: { as?: ElementType; size?: keyof typeof SIZE; className?: string; children: ReactNode }) {
  return <As className={cx(SIZE[size], className)}>{children}</As>;
}

/** Section eyebrow: ink-500 label in a sharp neutral chip. */
export function Eyebrow({ variant = "neutral", children, className }: { variant?: TagVariant; children: ReactNode; className?: string }) {
  return <Tag variant={variant} className={cx("eyebrow", (variant === "neutral") && "bg-ink-100 text-ink-600", className)}>{children}</Tag>;
}

/** Inline body link: underlined, link role (guide §8 "links in body text are underlined"). */
export function TextLink({ className, ...rest }: ComponentProps<"a">) {
  return <a className={cx("text-link underline underline-offset-2 transition-colors hover:text-link-hover", className)} {...rest} />;
}

/** Page width + side gutter (1312px max, 16→64px padding). */
export function Container({ className, children, ...rest }: ComponentProps<"div">) {
  return <div className={cx("container-page px-gutter", className)} {...rest}>{children}</div>;
}

const SECTION_TONE = {
  white: "bg-bg text-fg",
  subtle: "bg-bg-subtle text-fg",
  sky: "bg-grad-sky-wash text-fg",
  /** Dark band (D5): Night + .theme-dark so every role inside flips. One per page. */
  night: "theme-dark bg-ink-950 text-fg",
} as const;
/** Full-bleed section with the landing1 vertical rhythm (72→140px). */
export function Section({ tone = "white", className, children, ...rest }: { tone?: keyof typeof SECTION_TONE } & ComponentProps<"section">) {
  return (
    <section className={cx("py-section", SECTION_TONE[tone], className)} {...rest}>
      <Container>{children}</Container>
    </section>
  );
}

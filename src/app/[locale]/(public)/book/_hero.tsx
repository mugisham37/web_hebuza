import type { ReactNode } from "react";
// Shared header band for /book/* pages (board 15 v2 hero, Inspiraton soft rise).
export function BookShell({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]">
      <div className="container-page grid gap-8">
        <header className="m-rise max-w-2xl">
          {eyebrow && <p className="text-eyebrow uppercase tracking-wide text-fg-subtle">{eyebrow}</p>}
          <h1 className="mt-2 text-h1 text-balance">{title}</h1>
          {lead && <p className="mt-3 text-lead text-fg-muted">{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

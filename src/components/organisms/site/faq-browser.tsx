"use client";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { fill, type FaqCategory, type LBCopy } from "@/content/pages/lb";
import { setUrlParams, useHash, useUrlParams } from "@/lib/url-state";

export type FaqCat = {
  key: FaqCategory;
  label: string;
  body: string;
  items: { id: string; q: string; a: string }[];
};
const ICON: Record<FaqCategory, IconName> = {
  "getting-started": "zap",
  documents: "file",
  payments: "card",
  tracking: "mapPin",
  plans: "sparkle",
  privacy: "shield",
  business: "users",
};
const TILE_TONE: Partial<Record<FaqCategory, string>> = {
  plans: "bg-gold-100 text-gold-800 border-gold-300 hover:bg-gold-200",
};

function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.split(re).map((part, i) =>
    i % 2 ? (
      <mark key={i} className="bg-gold-200 px-0.5 text-fg">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** FAQ: search (?q=, highlights), category tiles/chips + sticky rail (?cat=), <details> accordions with #q-slug deep links. */
export function FaqBrowser({
  cats,
  copy,
}: {
  cats: FaqCat[];
  copy: LBCopy["faq"];
}) {
  const params = useUrlParams();
  const hash = useHash();
  const q = params.get("q") ?? "";
  const n = q.trim().toLowerCase();
  const hashCat = cats.find((c) => c.items.some((i) => i.id === hash))?.key;
  const cat = (hashCat ??
    cats.find((c) => c.key === params.get("cat"))?.key ??
    cats[0].key) as FaqCategory;
  const [copied, setCopied] = useState("");
  const results = n
    ? cats.flatMap((c) =>
        c.items
          .filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(n))
          .map((i) => ({ ...i, cat: c.label })),
      )
    : [];
  // Deep link: scroll the targeted question into view once it is rendered (it may live in a non-default category).
  useEffect(() => {
    if (hash)
      document.getElementById(hash)?.scrollIntoView({ block: "center" });
  }, [hash]);

  const pick = (k: FaqCategory) => {
    setUrlParams({ cat: k === cats[0].key ? null : k, q: null }, "");
    document.getElementById("faq-panel")?.focus({ preventScroll: true });
  };
  const share = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setUrlParams({}, `#${id}`);
    }
  };

  const item = (i: { id: string; q: string; a: string }, extra?: ReactNode) => (
    <details
      key={i.id}
      id={i.id}
      open={i.id === hash || undefined}
      className="group scroll-mt-28 border border-border bg-white open:shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-label-lg text-fg-heading [&::-webkit-details-marker]:hidden">
        <span>
          <Mark text={i.q} q={q.trim()} />
          {extra}
        </span>
        <Icon
          name="chevronDown"
          size={20}
          className="shrink-0 transition-transform duration-(--duration-base) group-open:rotate-180"
        />
      </summary>
      <div className="grid gap-3 px-5 pb-5">
        <p className="max-w-2xl text-body text-fg-muted">
          <Mark text={i.a} q={q.trim()} />
        </p>
        <button
          type="button"
          onClick={() => share(i.id)}
          className="inline-flex w-fit items-center gap-1.5 text-small text-fg-subtle hover:text-fg-heading"
        >
          <Icon name="arrowUpRight" size={14} />
          {copied === i.id ? copy.copied : copy.copyLink}
        </button>
      </div>
    </details>
  );

  const active = cats.find((c) => c.key === cat)!;
  return (
    <div className="grid gap-10">
      <div className="relative mx-auto w-full max-w-3xl">
        <Icon
          name="search"
          size={22}
          className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-fg-subtle"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setUrlParams({ q: e.target.value || null }, "")}
          placeholder={copy.search}
          aria-label={copy.search}
          className="h-16 w-full border border-border-strong bg-white pr-6 pl-15 text-lead shadow-sm placeholder:text-fg-subtle focus:border-navy-700 focus:outline-none"
        />
      </div>

      <nav
        aria-label={copy.browse}
        className="-mx-gutter overflow-x-auto px-gutter lg:mx-0 lg:overflow-visible lg:px-0"
      >
        <ul className="flex gap-3 lg:grid lg:grid-cols-7">
          {cats.map((c) => {
            const on = !n && c.key === cat;
            return (
              <li key={c.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => pick(c.key)}
                  aria-current={on || undefined}
                  className={cx(
                    "relative flex h-full w-32 flex-col items-center gap-2 border p-4 text-center transition-colors lg:w-full",
                    on
                      ? "border-secondary bg-secondary text-on-secondary"
                      : (TILE_TONE[c.key] ??
                          "border-border bg-white/70 text-fg-heading hover:bg-white"),
                  )}
                >
                  {on && (
                    <span
                      aria-hidden
                      className="absolute top-3 right-3 size-2 rounded-full bg-primary"
                    />
                  )}
                  <Icon name={ICON[c.key]} size={26} />
                  <span className="text-small font-medium">{c.label}</span>
                  <span className="text-label tabular">{c.items.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28 border border-border bg-white/70 p-4">
            <p className="px-3 pb-2 text-label-lg">{copy.browse}</p>
            <ul className="grid gap-1">
              {cats.map((c) => {
                const on = !n && c.key === cat;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => pick(c.key)}
                      aria-current={on || undefined}
                      className={cx(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-body",
                        on ? "bg-secondary text-on-secondary" : "hover:bg-navy-50",
                      )}
                    >
                      <Icon name={ICON[c.key]} size={18} />
                      <span className="flex-1">{c.label}</span>
                      {on && (
                        <span
                          aria-hidden
                          className="size-2 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div
          id="faq-panel"
          tabIndex={-1}
          className="min-w-0 focus:outline-none"
        >
          {n ? (
            results.length ? (
              <>
                <h2 className="text-h3" aria-live="polite">
                  {fill(copy.results, { n: results.length, q: q.trim() })}
                </h2>
                <div className="mt-6 grid gap-3">
                  {results.map((r) =>
                    item(
                      r,
                      <span className="ml-2 align-middle text-eyebrow text-fg-subtle">
                        · {r.cat}
                      </span>,
                    ),
                  )}
                </div>
              </>
            ) : (
              <div
                role="status"
                className="grid justify-items-start gap-3 border border-dashed border-border-strong bg-white p-8"
              >
                <p className="text-h3">{fill(copy.none, { q: q.trim() })}</p>
                <p className="text-body text-fg-muted">{copy.noneBody}</p>
                <button
                  type="button"
                  onClick={() => setUrlParams({ q: null })}
                  className="text-small font-medium underline"
                >
                  {copy.clear}
                </button>
              </div>
            )
          ) : (
            <>
              <h2 className="text-h2">{active.label}</h2>
              <p className="mt-2 text-body text-fg-muted">{active.body}</p>
              <div className="mt-6 grid gap-3">
                {active.items.map((i) => item(i))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

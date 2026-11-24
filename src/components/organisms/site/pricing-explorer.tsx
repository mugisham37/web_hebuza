"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatMoney } from "@/shared/format";
import type { getCopy } from "@/content/marketing";
import { waLink } from "@/content/marketing";
import { priceLabel as sharedPriceLabel } from "@/shared/pricing";
import type { PlanVM, Tier } from "@/lib/catalogue";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { matches } from "@/components/molecules/site/search";
import { FeeBreakdown } from "@/components/organisms/site/interactive";

export type ExplorerService = {
  slug: string;
  /** public slug for this locale (F-CAT-07) */
  path: string;
  name: string;
  family: string;
  area: string | null;
  haystack: string;
  priceMode: "fixed" | "range" | "quote";
  fromFee: number | null;
  tiers: Tier[];
  planCovered: boolean;
};
type Copy = ReturnType<typeof getCopy>["pricing"];

export function PricingExplorer({
  services,
  families,
  plans,
  copy: p,
}: {
  services: ExplorerService[];
  families: { slug: string; name: string }[];
  plans: PlanVM[];
  copy: Copy;
}) {
  const { locale } = useI18n();
  const L = (x: string) => localHref(locale, x);
  const money = (n: number) => formatMoney(n, "RWF", locale);
  const view = useUrlParams().get("pricing") === "plans" ? "plans" : "prices";
  const setView = (v: string) =>
    setUrlParams({ pricing: v === "plans" ? "plans" : null });

  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const [slug, setSlug] = useState(
    () =>
      (services.find((s) => s.slug === "company-registration") ?? services[0])
        ?.slug,
  );
  const [planId, setPlanId] = useState(
    () =>
      (
        plans.find((pl) => /popular/i.test(pl.badge ?? "")) ??
        plans.find((pl) => /growth/i.test(pl.name)) ??
        plans[0]
      )?.id,
  );
  const list = useRef<HTMLUListElement>(null);
  const receipt = useRef<HTMLDivElement>(null);
  // Keep the selected row in view inside the list (list scroll only, never the page).
  useEffect(() => {
    const ul = list.current, li = ul?.querySelector<HTMLElement>("[aria-current]");
    if (ul && li) ul.scrollTop += li.getBoundingClientRect().top - ul.getBoundingClientRect().top - 8;
  }, [fam]);
  const tabs = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () =>
      services.filter(
        (s) => (fam === "all" || s.family === fam) && matches(s.haystack, q),
      ),
    [services, fam, q],
  );
  const s = services.find((x) => x.slug === slug);
  const plan = plans.find((pl) => pl.id === planId);

  const priceLabel = (x: ExplorerService) => sharedPriceLabel(x, { from: p.from, quote: p.afterReview }, money);

  const pick = (v: string) => {
    setSlug(v);
    if (window.matchMedia("(max-width: 1023px)").matches)
      receipt.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
  };
  // ↑/↓ walk the result rows (and leave the search box); Enter/Space on a row selects it natively.
  const walk = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = [
      ...(list.current?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ];
    if (!rows.length) return;
    e.preventDefault();
    const i = rows.indexOf(document.activeElement as HTMLButtonElement);
    rows[
      i < 0
        ? 0
        : Math.max(
            0,
            Math.min(rows.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)),
          )
    ].focus();
  };
  const tabKey = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = view === "plans" ? "prices" : "plans";
    const target =
      e.key === "Home" ? "prices" : e.key === "End" ? "plans" : next;
    setView(target);
    tabs.current
      ?.querySelector<HTMLButtonElement>(`#pricing-tab-${target}`)
      ?.focus();
  };

  const card = "self-start bg-white p-6 text-ink-900 shadow-lg md:p-8";
  const panel = "border border-white/15 bg-navy-800";
  const rowCls = (on: boolean) =>
    cx(
      "relative flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white",
      on &&
        "bg-white/10 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary",
    );

  return (
    <div className="mt-12">
      <div
        ref={tabs}
        role="tablist"
        aria-label={p.tabs}
        onKeyDown={tabKey}
        className="inline-flex border border-white/15"
      >
        {(["prices", "plans"] as const).map((v) => (
          <button
            key={v}
            id={`pricing-tab-${v}`}
            type="button"
            role="tab"
            aria-selected={view === v}
            aria-controls="pricing-panel"
            tabIndex={view === v ? 0 : -1}
            onClick={() => setView(v)}
            className={cx(
              "h-11 px-5 text-button transition-colors",
              view === v
                ? "bg-white text-navy-900"
                : "text-white/80 hover:text-white",
            )}
          >
            {v === "prices" ? p.tabPrices : p.tabPlans}
          </button>
        ))}
      </div>

      <div
        id="pricing-panel"
        role="tabpanel"
        aria-labelledby={`pricing-tab-${view}`}
        className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]"
      >
        {view === "prices" ? (
          <>
            <div
              ref={receipt}
              aria-live="polite"
              className={cx(card, "order-2 scroll-mt-24 lg:order-1")}
            >
              {s && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {s.area && (
                      <Tag variant="outline" className="h-7 text-eyebrow">
                        {s.area}
                      </Tag>
                    )}
                    {s.planCovered && (
                      <button
                        type="button"
                        onClick={() => setView("plans")}
                        className="inline-flex h-7 items-center gap-1.5 border border-border px-2.5 text-eyebrow text-navy-700 hover:bg-navy-50"
                      >
                        <Icon name="check" size={14} />
                        {p.inPlans}
                      </button>
                    )}
                  </div>
                  <h3 className="mt-3 text-h3">
                    <Link
                      href={L(`/services/${s.path}`)}
                      className="hover:underline"
                    >
                      {s.name}
                    </Link>
                  </h3>
                  <div className="mt-6">
                    {s.priceMode === "fixed" && s.tiers.length ? (
                      <FeeBreakdown
                        key={s.slug}
                        tiers={s.tiers}
                        slug={s.slug}
                        copy={p}
                      />
                    ) : (
                      <div className="grid gap-4">
                        <p className="tabular text-h3">
                          {s.priceMode === "quote"
                            ? p.afterReview
                            : priceLabel(s).replace(/^./, (c) =>
                                c.toUpperCase(),
                              )}
                        </p>
                        {s.priceMode === "range" && (
                          <p className="text-small text-fg-muted">
                            {p.rangeNote}
                          </p>
                        )}
                        {s.priceMode === "quote" ? (
                          <ButtonLink href={L("/book")} variant="primary" dots>
                            {p.quote}
                          </ButtonLink>
                        ) : (
                          <ButtonLink
                            href={L(`/apply/${s.slug}`)}
                            variant="primary"
                            dots
                          >
                            {p.apply}
                          </ButtonLink>
                        )}
                        <p className="flex items-center gap-2 text-small text-fg-subtle">
                          <Icon name="lock" size={14} />
                          {p.trust}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div
              className={cx(panel, "order-1 flex min-w-0 flex-col lg:order-2")}
            >
              <div className="grid gap-3 border-b border-white/15 p-5">
                <label htmlFor="pricing-search" className="sr-only">
                  {p.searchLabel}
                </label>
                <div className="relative">
                  <Icon
                    name="search"
                    size={18}
                    className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/80"
                  />
                  <input
                    id="pricing-search"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={walk}
                    placeholder={p.searchPh}
                    className="h-12 w-full border border-white/15 bg-navy-900 pr-4 pl-11 text-body text-white placeholder:text-white/80 focus:border-white focus:outline-none"
                  />
                </div>
                <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                  {[{ slug: "all", name: p.all }, ...families].map((f) => (
                    <button
                      key={f.slug}
                      type="button"
                      aria-pressed={fam === f.slug}
                      onClick={() => setFam(f.slug)}
                      className={cx(
                        "h-8 shrink-0 border px-3 text-small whitespace-nowrap transition-colors",
                        fam === f.slug
                          ? "border-white bg-white text-navy-900"
                          : "border-white/15 text-white/80 hover:text-white",
                      )}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              {visible.length ? (
                <ul
                  ref={list}
                  onKeyDown={walk}
                  className="scrollbar-dark max-h-[21rem] divide-y divide-white/15 overflow-y-auto overscroll-contain"
                >
                  {visible.map((x) => (
                    <li key={x.slug}>
                      <button
                        type="button"
                        aria-current={x.slug === slug || undefined}
                        onClick={() => pick(x.slug)}
                        className={rowCls(x.slug === slug)}
                      >
                        <span className="line-clamp-2 min-w-0 flex-1 text-body">
                          {x.name}
                        </span>
                        <span className="tabular shrink-0 text-small text-white/80">
                          {priceLabel(x)}
                        </span>
                        <Icon
                          name="chevronDown"
                          size={16}
                          className="shrink-0 -rotate-90 text-white/80"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid gap-4 p-5">
                  <p className="text-body text-white/80">{p.noMatch}</p>
                  <div className="flex flex-wrap gap-3">
                    <ButtonLink
                      href={waLink(
                        q ? `Muraho HEBUZA — ${q}` : "Muraho HEBUZA",
                      )}
                      variant="inverse"
                      size="sm"
                    >
                      {p.ask}
                    </ButtonLink>
                    <ButtonLink href={L("/book")} variant="inverse" size="sm">
                      {p.consult}
                    </ButtonLink>
                  </div>
                </div>
              )}
              <p
                role="status"
                className="mt-auto border-t border-white/15 px-5 py-3 text-small text-white/80"
              >
                {p.count.replace("{n}", String(visible.length))}
              </p>
            </div>
          </>
        ) : (
          <>
            <div aria-live="polite" className={cx(card, "order-2 lg:order-1")}>
              {plan && (
                <>
                  <p className="flex flex-wrap items-center gap-2 text-h3">
                    {plan.name}
                    {plan.badge && (
                      <Tag
                        variant={
                          plan.badge.toLowerCase().includes("agent")
                            ? "navy"
                            : "new"
                        }
                        className="h-7 text-eyebrow"
                      >
                        {plan.badge}
                      </Tag>
                    )}
                  </p>
                  <p className="mt-3 tabular text-label-lg">
                    {money(plan.amount)}{" "}
                    <span className="text-small opacity-60">{p.perMonth}</span>
                  </p>
                  {plan.maxApps && (
                    <p className="text-small text-fg-muted">
                      {p.upTo.replace("{n}", String(plan.maxApps))}
                    </p>
                  )}
                  <p className="mt-4 text-body text-fg-muted">
                    {plan.description}
                  </p>
                  <ul className="mt-5 grid gap-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-body">
                        <Icon
                          name="check"
                          size={18}
                          className="mt-0.5 shrink-0 text-success"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    {/* Same destination rule as the /pricing page CTA. */}
                    <ButtonLink
                      href={L(
                        /agent|retainer/i.test(`${plan.badge} ${plan.name}`)
                          ? `/contact?plan=${plan.id}`
                          : `/signup?plan=${plan.id}`,
                      )}
                      variant="primary"
                      dots
                    >
                      {p.choose}
                    </ButtonLink>
                    <Link
                      href={L("/pricing")}
                      className="inline-flex items-center gap-2 text-label text-navy-700 hover:underline"
                    >
                      {p.compare}
                      <Icon name="arrowRight" size={16} />
                    </Link>
                  </div>
                </>
              )}
            </div>
            <ul
              onKeyDown={walk}
              className={cx(
                panel,
                "order-1 divide-y divide-white/15 self-start lg:order-2",
              )}
              ref={list}
            >
              {plans.map((pl) => (
                <li key={pl.id}>
                  <button
                    type="button"
                    aria-current={pl.id === planId || undefined}
                    onClick={() => setPlanId(pl.id)}
                    className={cx(
                      rowCls(pl.id === planId),
                      "flex-wrap justify-between gap-4 p-5 md:p-6",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-card-title">
                        {pl.name}
                        {pl.badge && (
                          <Tag
                            variant={
                              pl.badge.toLowerCase().includes("agent")
                                ? "navy"
                                : "new"
                            }
                            className="h-7 text-eyebrow"
                          >
                            {pl.badge}
                          </Tag>
                        )}
                      </span>
                      <span className="mt-1 block text-small text-white/85">
                        {pl.description}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block tabular text-label-lg">
                        {money(pl.amount)}{" "}
                        <span className="text-small opacity-60">
                          {p.perMonth}
                        </span>
                      </span>
                      {pl.maxApps && (
                        <span className="block text-small opacity-60">
                          {p.upTo.replace("{n}", String(pl.maxApps))}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { formatDate, formatMoney, cx } from "@/shared/format";
import { ButtonLink } from "@/components/atoms/button";
import { HighlightWord } from "@/components/atoms/brand";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Money } from "@/components/atoms/domain";
import { ErrorState, Skeleton } from "@/components/atoms/feedback";
import { c2Copy, fill } from "@/content/pages/c2";
import { NpsCard } from "@/components/organisms/client/nps-card";
import { bucket, useDashboard } from "@/components/molecules/client/requests-data";
import { NeedRow, RequestRow } from "@/components/molecules/client/client";

export type Rec = { slug: string; name: string; fromFee: number | null };

const panel = "border border-border bg-surface p-5 sm:p-6";

/** C06 — action-first dashboard (CLP §9): Needs you → stats → active requests → payments → recommended. */
export function DashboardView({ recs }: { recs: Rec[] }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).dash;
  const { user } = useSession();
  const q = useDashboard();
  const first = user?.name.split(" ")[0] ?? "";

  if (q.isPending) return <DashSkeleton />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { needs, requests, paymentsDue, unread } = q.data;
  const open = needs.filter((n) => !n.done);
  const active = requests.filter((r) =>
    ["action", "active"].includes(bucket(r.status)),
  );
  const toPay = paymentsDue.reduce((s, p) => s + p.amount, 0);

  if (!requests.length) return <FirstRun name={first} recs={recs} />;

  const h = new Date().getHours();
  const greet = h < 12 ? c.morning : h < 18 ? c.afternoon : c.evening;
  const stats: {
    icon: IconName;
    label: string;
    value: React.ReactNode;
    href: string;
  }[] = [
    {
      icon: "layers",
      label: c.stats.active,
      value: active.length,
      href: "/requests",
    },
    {
      icon: "check",
      label: c.stats.done,
      value: requests.filter((r) => bucket(r.status) === "done").length,
      href: "/requests",
    },
    {
      icon: "wallet",
      label: c.stats.toPay,
      value: <Money amount={toPay} />,
      href: "/billing",
    },
    {
      icon: "message",
      label: c.stats.unread,
      value: unread,
      href: "/messages",
    },
  ];

  return (
    <div className="grid gap-6">
      <NpsCard />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-fg-heading text-h3">
            {greet} {first && <HighlightWord>{first}</HighlightWord>}
          </h1>
          <p className="mt-1 text-body text-fg-muted">
            {formatDate(new Date(), locale)}
          </p>
        </div>
        <ButtonLink href={localHref(locale, "/services")} variant="primary" dots>
          {c.start}
        </ButtonLink>
      </header>

      <section
        aria-labelledby="needs-h"
        className={cx(
          "p-5 sm:p-6",
          open.length ? "border-l-3 border-gold-400 bg-gold-50" : "bg-bg-subtle",
        )}
      >
        <h2
          id="needs-h"
          className="text-fg-heading flex items-center gap-2 text-eyebrow uppercase"
        >
          <Icon name={open.length ? "zap" : "check"} size={18} aria-hidden />
          {c.needs}
          {open.length > 0 && (
            <span className="bg-secondary px-2 text-on-secondary tabular">
              {open.length}
            </span>
          )}
        </h2>
        {open.length ? (
          <ul className="mt-2 divide-y divide-border">
            {open.map((n) => (
              <NeedRow key={n.id} need={n} tone="band" />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-body">{c.needsNone}</p>
        )}
      </section>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={localHref(locale, s.href)}
              className={cx(
                panel,
                "flex h-full flex-col gap-3 hover:border-navy-300",
              )}
            >
              <Icon name={s.icon} aria-hidden className="text-secondary" />
              <span className="text-small text-fg-subtle">{s.label}</span>
              <span className="text-card-title tabular">{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="active-h" className={panel}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="active-h" className="text-fg-heading text-card-title">
              {c.active}
            </h2>
            <Link
              href={localHref(locale, "/requests")}
              className="text-small underline underline-offset-4"
            >
              {c.viewAll} →
            </Link>
          </div>
          <ul className="mt-2">
            {(active.length ? active : requests).slice(0, 5).map((r) => (
              <RequestRow key={r.code} r={r} />
            ))}
          </ul>
        </section>

        <div className="grid content-start gap-6">
          <section aria-labelledby="pay-h" className={panel}>
            <h2 id="pay-h" className="text-fg-heading text-card-title">
              {c.payments}
            </h2>
            {paymentsDue.length ? (
              <ul className="mt-2">
                {paymentsDue.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-0"
                  >
                    <span className="min-w-0 flex-1 text-body">
                      {p.service}
                      <span className="block text-small text-fg-subtle tabular">
                        {p.code}
                        {p.dueAt &&
                          ` · ${fill(c.due, { date: formatDate(p.dueAt, locale) })}`}
                      </span>
                    </span>
                    <Money amount={p.amount} className="font-medium" />
                    <ButtonLink
                      size="sm"
                      variant="secondary"
                      href={localHref(
                        locale,
                        `/pay/${encodeURIComponent(p.code)}`,
                      )}
                    >
                      {c.pay}
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-body text-fg-muted">{c.paymentsNone}</p>
            )}
          </section>
          {/* CLP-05 cards: open quotes, new results, upcoming due dates; the full list lives in Reminders. */}
          {([
            ["quotes", (q.data.openQuotes ?? []).map((x) => ({ k: x.code, t: x.service, sub: x.code, href: `/requests/${x.code}` }))],
            ["results", (q.data.releasedDeliverables ?? []).map((x) => ({ k: x.id, t: x.title, sub: `${x.code} · ${formatDate(x.at, locale)}`, href: "/documents?tab=deliverables" }))],
            ["deadlines", (q.data.deadlines ?? []).map((x) => ({ k: x.code, t: x.service, sub: `${x.code} · ${formatDate(x.dueAt, locale)}`, href: `/requests/${x.code}` }))],
          ] as const).map(([key, rows]) => rows.length ? (
            <section key={key} aria-labelledby={`${key}-h`} className={panel}>
              <h2 id={`${key}-h`} className="text-fg-heading text-card-title">{c[key]}</h2>
              <ul className="mt-2">
                {rows.map((r) => (
                  <li key={r.k} className="border-b border-border py-3 last:border-0">
                    <Link href={localHref(locale, r.href)} className="text-body underline-offset-4 hover:underline">{r.t}</Link>
                    <span className="block text-small text-fg-subtle tabular">{r.sub}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null)}
          <Link href={localHref(locale, "/dashboard/reminders")} className="text-small text-link underline underline-offset-4">{c.reminders}</Link>
          <Recommended recs={recs} />
        </div>
      </div>
    </div>
  );
}

function Recommended({ recs }: { recs: Rec[] }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).dash;
  if (!recs.length) return null;
  return (
    <section
      aria-labelledby="rec-h"
      className="bg-bg-tint p-5 sm:p-6"
    >
      <h2 id="rec-h" className="text-fg-heading text-card-title">
        {c.recommended}
      </h2>
      <ul className="mt-3 grid gap-2">
        {recs.map((s) => (
          <li key={s.slug}>
            <Link
              href={localHref(locale, `/apply/${s.slug}`)}
              className="flex items-center gap-3 bg-surface/70 px-4 py-3 hover:bg-surface"
            >
              <span className="min-w-0 flex-1 text-label">
                {s.name}
                <span className="block text-small font-normal text-fg-subtle">
                  {s.fromFee != null
                    ? `${c.from} ${formatMoney(s.fromFee, "RWF", locale)}`
                    : c.onQuote}
                </span>
              </span>
              <Icon name="arrowRight" size={18} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** DB1 first run: checklist + empty state + consultation band. */
function FirstRun({ name, recs }: { name: string; recs: Rec[] }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).dash;
  const steps = [
    { label: c.stepAccount, done: true },
    { label: c.stepRequest, done: false },
    { label: c.stepDocs, done: false },
  ];
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-fg-heading text-h3">
          {c.welcome} {name && <HighlightWord>{name}</HighlightWord>}
        </h1>
        <p className="mt-1 text-lead">{c.welcomeSub}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="chk-h" className={panel}>
          <h2 id="chk-h" className="text-fg-heading text-card-title">
            {c.checklist}{" "}
            <span className="text-small text-fg-subtle tabular">
              1/{steps.length}
            </span>
          </h2>
          <ol className="mt-4 grid gap-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-body">
                <span
                  aria-hidden
                  className={cx(
                    "grid size-6 place-items-center border",
                    s.done
                      ? "border-secondary bg-secondary text-on-secondary"
                      : "border-ink-300",
                  )}
                >
                  {s.done && <Icon name="check" size={14} />}
                </span>
                <span className={cx(s.done && "text-fg-subtle line-through")}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          <ButtonLink
            className="mt-6"
            href={localHref(locale, "/services")}
            dots
          >
            {c.stepRequest}
          </ButtonLink>
        </section>
        <section
          aria-labelledby="empty-h"
          className={cx(panel, "flex flex-col items-center text-center")}
        >
          <span
            aria-hidden
            className="grid size-16 place-items-center bg-gold-200 text-navy-800"
          >
            <Icon name="file" size={28} />
          </span>
          <h2 id="empty-h" className="text-fg-heading mt-4 text-h3">
            {c.emptyTitle}
          </h2>
          <p className="mt-2 max-w-sm text-body text-fg-muted">{c.emptyBody}</p>
          {recs.length > 0 && (
            <ul className="mt-5 grid w-full gap-2 sm:grid-cols-3">
              {recs.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={localHref(locale, `/apply/${s.slug}`)}
                    className="block h-full border border-border px-3 py-3 text-small hover:border-navy-300"
                  >
                    <span className="block font-medium">{s.name}</span>
                    <span className="text-fg-subtle">
                      {s.fromFee != null
                        ? formatMoney(s.fromFee, "RWF", locale)
                        : c.onQuote}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <ButtonLink
            className="mt-5"
            variant="outline"
            href={localHref(locale, "/services")}
          >
            {c.browse}
          </ButtonLink>
        </section>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-bg-tint px-5 py-4 text-body">
        <Icon name="calendar" aria-hidden />
        <span className="flex-1">{c.consult}</span>
        <Link
          href={localHref(locale, "/book")}
          className="text-button underline underline-offset-4"
        >
          {c.consultCta}
        </Link>
      </p>
    </div>
  );
}

function DashSkeleton() {
  return (
    <div className="grid gap-6" aria-busy>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full " />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 " />
        ))}
      </div>
      <Skeleton className="h-64 w-full " />
    </div>
  );
}

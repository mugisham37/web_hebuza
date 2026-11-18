"use client";
// Lane C · /work home (board 06 HO1/HO4/PHO1, spec E2): one status chip, three tiles, priced offer strip (≤3),
// contract + licence cards, next steps, then the Stage 4 My work + Messages panels. Not-cleared and empty variants.
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatMoney } from "@/shared/format";
import { compactLeft } from "@/shared/agent/core";
import { useMyCases } from "@/lib/agent/api";
import { useOffers } from "@/lib/agent/c";
import { useExternal } from "@/lib/work/api";
import type { ExtOfferVM } from "@/lib/work/c";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { Countdown, useNow } from "@/components/atoms/agent";
import { MyWork, Messages } from "@/components/organisms/agent/today";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { fill } from "@/content/pages/work-common";
import { ExternalBadge, FirmRoleTag, RateLabel, WorkerStatusChip, useW } from "@/components/atoms/work";
import { ContractStatusCard, LicenceStatusCard, OfferEarnings } from "@/components/molecules/agent/agent";
import { useH } from "@/components/organisms/agent/work-counter";

export function WorkHome() {
  const h = useH();
  const w = useW();
  const { locale } = useI18n();
  const { ext, data: s, isError, refetch } = useExternal();
  const first = s?.me.name.split(" ")[0];

  if (isError) return <PanelError what={h.title} onRetry={() => refetch()} />;
  const uncleared = ext && ext.status !== "cleared";

  return (
    <div className="pb-24 lg:pb-8">
      <header className="mb-6 flex flex-wrap items-end gap-3 m-rise">
        <div className="min-w-0 flex-1">
          <h1 className="text-h3">
            {h.hello}{" "}
            {first ? <mark className="bg-navy-100 px-1.5 text-fg">{first}</mark> : <span aria-hidden className="inline-block h-7 w-24 align-middle m-shimmer" />}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-small text-fg-muted">
            {ext ? (
              <>
                <ExternalBadge />
                <WorkerStatusChip status={ext.status} />
                {ext.firmRole && <FirmRoleTag role={ext.firmRole} />}
                {ext.firm && <span>{ext.firm}</span>}
              </>
            ) : (
              <span aria-hidden className="h-7 w-56 m-shimmer" />
            )}
          </p>
        </div>
      </header>

      {uncleared ? (
        <NotCleared status={ext.status} next={ext.todo[0]} />
      ) : (
        <>
          <Tiles />
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="grid min-w-0 content-start gap-5">
              <OfferStrip />
              <MyWorkOrEmpty />
            </div>
            <aside className="grid min-w-0 content-start gap-3"aria-label={h.nextSteps}>
              {ext ? (
                <>
                  <ContractStatusCard state={ext.contractState} end={ext.contractEnd} href="/work/contract" />
                  {ext.firmRole !== "member" && <LicenceStatusCard fee={ext.licence} href="/work/contract?tab=licence" />}
                  <NextSteps />
                </>
              ) : (
                [0, 1].map((i) => <div key={i} className="h-24 m-shimmer" />)
              )}
              <Messages />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function NotCleared({ status, next }: { status: string; next?: string }) {
  const h = useH();
  const { locale } = useI18n();
  const pending = status === "pending_verification";
  return (
    <section className="grid justify-items-center gap-4 border border-border bg-white px-6 py-12 text-center m-rise">
      <span className="flex size-16 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <Icon name={pending ? "clock" : "lock"} size={28} aria-hidden />
      </span>
      <h2 className="text-h4 max-w-md">{pending ? h.notCleared.pendingTitle : h.notCleared.title}</h2>
      <p className="max-w-md text-body text-fg-muted">{pending ? h.notCleared.pendingBody : h.notCleared.body}</p>
      {!pending && (
        <ButtonLink href={localHref(locale, `/work/onboarding/${next ?? "identity"}`)} dots>
          {h.notCleared.cta}
        </ButtonLink>
      )}
    </section>
  );
}

function Tile({ label, value, note, href, dot }: { label: string; value: React.ReactNode; note: string; href: string; dot: string }) {
  const { locale } = useI18n();
  return (
    <Link href={localHref(locale, href)} className="group grid gap-1 border border-border bg-white p-4 transition-colors hover:border-navy-700/30 m-lift">
      <span className="flex items-center justify-between text-small text-fg-muted">
        {label}
        <span aria-hidden className={cx("size-2 rounded-full", dot)} />
      </span>
      <span className="text-h3 tabular">{value}</span>
      <span className="text-eyebrow text-fg-subtle">{note}</span>
    </Link>
  );
}

function Tiles() {
  const h = useH();
  const { locale } = useI18n();
  const now = useNow();
  const offers = useOffers();
  const cases = useMyCases();
  const { ext } = useExternal();
  const pending = (offers.data ?? []).filter((o) => o.status === "pending");
  const soonest = pending.map((o) => Date.parse(o.expiresAt)).sort((a, b) => a - b)[0];
  const open = (cases.data ?? []).filter((c) => !["completed_delivered", "cancelled", "rejected", "refunded"].includes(c.status));
  const dueSoon = now === null ? 0 : open.filter((c) => c.dueAt && Date.parse(c.dueAt) - now < 2 * 86_400_000).length;
  const sk = <span aria-hidden className="inline-block h-8 w-12 m-shimmer" />;
  return (
    <div className="grid grid-cols-3 gap-3 max-sm:gap-2 m-stagger">
      <Tile
        label={h.tiles.offers}
        href="/work/offers"
        dot="bg-gold-400"
        value={offers.data ? pending.length : sk}
        note={soonest && now !== null ? fill(h.tiles.soonest, { t: compactLeft(soonest - now) }) : h.tiles.none}
      />
      <Tile label={h.tiles.jobs} href="/work/jobs" dot="bg-navy-700" value={cases.data ? open.length : sk} note={dueSoon ? fill(h.tiles.due, { n: dueSoon }) : h.tiles.noneDue} />
      <Tile
        label={h.tiles.payout}
        href="/work/earnings?tab=payouts"
        dot="bg-success"
        value={ext?.lastPayout ? <span className="text-h4">{formatMoney(ext.lastPayout.amount, "RWF", locale)}</span> : ext ? "—" : sk}
        note={ext?.lastPayout ? "" : h.tiles.noPayout}
      />
    </div>
  );
}

function OfferStrip() {
  const h = useH();
  const { locale } = useI18n();
  const q = useOffers();
  if (q.isError) return <PanelError what={h.offers.title} onRetry={() => q.refetch()} />;
  const rows = ((q.data ?? []) as ExtOfferVM[]).filter((o) => o.status === "pending").slice(0, 3);
  if (q.data && !rows.length) return null;
  return (
    <section aria-labelledby="ho-offers"className="border border-border bg-white p-4 sm:p-5 m-rise">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="ho-offers"className="text-card-title">
          {h.offers.title}
        </h2>
        <Link href={localHref(locale, "/work/offers")} className="inline-flex items-center gap-1 text-small font-medium text-navy-700">
          {h.offers.all} <Icon name="arrowRight" size={14} aria-hidden />
        </Link>
      </div>
      {!q.data ? (
        <div className="grid gap-2">{[0, 1].map((i) => <div key={i} className="h-24 m-shimmer" />)}</div>
      ) : (
        <ul className="grid gap-2 m-stagger"aria-live="polite">
          {rows.map((o, i) => (
            <li key={o.id} style={{ ["--i" as string]: i }}>
              <Link href={localHref(locale, `/work/offers?offer=${encodeURIComponent(o.id)}`)} className="group grid gap-2 border border-border p-3 transition-colors hover:border-navy-300 hover:bg-tint/40 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="block text-label">{o.service}</span>
                  <span className="block truncate text-small text-fg-muted">{o.client}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <Countdown to={o.expiresAt} kind="respond" />
                    {o.rate && <RateLabel rate={o.rate} />}
                  </span>
                </span>
                {o.rate ? <OfferEarnings earning={o.share} rate={o.rate} showFee={false} compact /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-center gap-2 text-eyebrow text-fg-subtle">
        <Icon name="clock" size={12} aria-hidden />
        {h.offers.respond}
      </p>
    </section>
  );
}

function MyWorkOrEmpty() {
  const h = useH();
  const { locale } = useI18n();
  const cases = useMyCases();
  const offers = useOffers();
  const none = cases.data && !cases.data.length && offers.data && !offers.data.some((o) => o.status === "pending");
  if (none)
    return <EmptyPanel title={h.empty.title} body={h.empty.body} action={<ButtonLink href={localHref(locale, "/work/profile/services")}>{h.empty.cta}</ButtonLink>} />;
  return <MyWork />;
}

function NextSteps() {
  const h = useH();
  const { locale } = useI18n();
  const { ext } = useExternal();
  const offers = useOffers();
  if (!ext) return null;
  const steps: { label: string; href: string }[] = [];
  if ((offers.data ?? []).some((o) => o.status === "pending")) steps.push({ label: h.step.offers, href: "/work/offers" });
  if (ext.contractState === "expiring" || ext.contractState === "expired") steps.push({ label: h.step.contract, href: "/work/contract?tab=renewal" });
  if (ext.firmRole !== "member" && (ext.licence?.status === "due" || ext.licence?.status === "overdue")) steps.push({ label: h.step.licence, href: "/work/contract?tab=licence" });
  if (ext.services.some((s) => s.state === "not_cleared")) steps.push({ label: h.step.credentials, href: "/work/profile/credentials" });
  if (!steps.length) return null;
  return (
    <section className="border border-border bg-white p-4"aria-labelledby="ho-next">
      <h2 id="ho-next"className="mb-2 text-label">
        {h.nextSteps}
      </h2>
      <ol className="grid gap-1">
        {steps.map((s, i) => (
          <li key={s.href}>
            <Link href={localHref(locale, s.href)} className="flex items-center gap-3 px-2 py-2 text-small hover:bg-bg-subtle">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-eyebrow text-on-navy tabular">{i + 1}</span>
              <span className="flex-1">{s.label}</span>
              <Icon name="arrowRight"size={14} aria-hidden className="text-fg-subtle" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

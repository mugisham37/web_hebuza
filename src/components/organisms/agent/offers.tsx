"use client";
import { useWs } from "@/lib/agent/ws";
// U4 Offers (board 05): OF1 tabs + cards, OF4 history/empty, POF phone sheet, OfferDrawer. Dialogs in offer-dialogs.tsx.
import { useState } from "react";
import Link from "next/link";
import { Tabs } from "@/components/atoms/tabs";
import { Button, buttonClass } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { ErrorState } from "@/components/atoms/feedback";
import { EmptyPanel } from "@/components/molecules/ops/ops";
import { Countdown, PageHead, SkeletonRows } from "@/components/atoms/agent";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useOfferActions, useOffers, type OfferVM } from "@/lib/agent/c";
import { cx, formatDateTime, formatMoney } from "@/shared/format";
import { fill } from "@/content/pages/agent-common";
import {
  AcceptOfferDialog,
  DeclineOfferDialog,
  useAcceptBlock,
  useIsPhone,
  useO,
} from "@/components/organisms/agent/offer-dialogs";
// Stage 8: externals see their agreed earning + rate label, counter-propose, and why() accept blocks.
import { OfferEarnings } from "@/components/molecules/agent/agent";
import { RateLabel } from "@/components/atoms/work";
import { CounterDialog, CounterState, useExtAcceptWhy, useH } from "@/components/organisms/agent/work-counter";
import type { ExtOfferVM } from "@/lib/work/c";

const TABS = ["pending", "accepted", "declined", "expired"] as const;
type Tab = (typeof TABS)[number];
const tabOf = (s: OfferVM["status"]): Tab =>
  s === "returned" ? "declined" : s;

function Share({ offer, big }: { offer: OfferVM; big?: boolean }) {
  const o = useO();
  const { locale } = useI18n();
  const { external } = useWs();
  const x = offer as ExtOfferVM;
  if (external && x.rate)
    return (
      <div className="grid justify-items-start gap-1.5">
        <OfferEarnings earning={offer.share} eligible={offer.fee ?? undefined} rate={x.rate} showFee={offer.fee !== null} compact={!big} />
        <RateLabel rate={x.rate} />
      </div>
    );
  return (
    <p className={cx("tabular", big ? "text-body" : "text-small")}>
      <span className="text-fg-muted">{o.yourShare} </span>
      <span className="font-semibold">
        {fill(o.shareHint, {
          amount: formatMoney(offer.share, "RWF", locale),
          pct: Math.round(offer.pct * 100),
        })}
      </span>
      {offer.fee !== null && (
        <span className="block text-eyebrow text-fg-subtle">
          {fill(o.fee, { amount: formatMoney(offer.fee, "RWF", locale) })}
        </span>
      )}
    </p>
  );
}

function OfferCard({
  offer,
  i,
  leaving,
  onOpen,
  onAct,
}: {
  offer: OfferVM;
  i: number;
  leaving: boolean;
  onOpen: () => void;
  onAct: (a: "accept" | "decline" | "counter") => void;
}) {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const baseBlock = useAcceptBlock();
  const extWhy = useExtAcceptWhy(offer);
  const { external } = useWs();
  const h = useH();
  const x = offer as ExtOfferVM;
  const pending = offer.status === "pending";
  const decided = offer.status === "pending" ? null : offer.status;
  const block = baseBlock ?? (external ? extWhy : null);
  return (
    <article
      data-offer={offer.id}
      tabIndex={0}
      aria-label={`${offer.service} – ${offer.client}`}
      style={{ "--i": i } as React.CSSProperties}
      className={cx(
        "grid gap-3 border border-border bg-white p-4 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-5 m-lift",
        leaving && "m-out",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center bg-tint text-navy-800"
        >
          <Icon name="file" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          {decided && (
            <p className="mb-1 flex items-center gap-1.5 text-eyebrow font-medium">
              <Icon
                name={
                  decided === "accepted"
                    ? "check"
                    : decided === "expired"
                      ? "clock"
                      : "x"
                }
                size={12}
                aria-hidden
              />
              {o.decided[decided]}
              {offer.decidedAt && (
                <span className="text-fg-subtle">
                  · {formatDateTime(offer.decidedAt, locale)}
                </span>
              )}
            </p>
          )}
          <h3 className="text-label">
            {offer.service} – {offer.client}
          </h3>
          <p className="mt-0.5 text-small text-fg-muted">
            {decided === "expired"
              ? o.noResponse
              : decided === "returned"
                ? fill(o.returnedTo, { m: "Diane" })
                : offer.summary}
          </p>
        </div>
        {pending && (
          <div className="grid justify-items-end gap-1 max-sm:w-full max-sm:justify-items-start">
            <Countdown to={offer.expiresAt} kind="respond" />
            <Share offer={offer} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="file" size={14} aria-hidden />
          {fill(o.shared, { n: offer.shared[0], t: offer.shared[1] })}
        </span>
        {pending && <Countdown to={offer.dueAt} kind="due" />}
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" size={14} aria-hidden />
          {fill(o.effort, { h: offer.effortH })}
        </span>
        {offer.skills.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-1">
            <span className="sr-only">{o.skills}:</span>
            {offer.skills.map((s) => (
              <span
                key={s}
                className="bg-ink-100 px-2 py-0.5 text-eyebrow text-fg"
              >
                {s}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {pending && x.counter && (
          <div className="w-full">
            <CounterState offer={x} />
          </div>
        )}
        {pending && block && (
          <p className="mr-auto text-small text-warning">{baseBlock ? o.blocked[baseBlock] : block}</p>
        )}
        {external && pending && !x.counter && (
          <Button size="sm" variant="ghost" data-guide="offer-counter" onClick={() => onAct("counter")}>
            {h.counter.open}
          </Button>
        )}
        <Button size="sm" variant="outline" data-guide="offer-details" onClick={onOpen}>
          {o.viewDetails}
        </Button>
        {offer.status === "accepted" && (
          <Link
            href={localHref(locale, wsHref(`/agent/cases/${offer.ref}`))}
            className={buttonClass({ size: "sm" })}
          >
            {o.openCase}
          </Link>
        )}
        {pending && (
          <>
            <Button
              size="sm"
              variant="secondary"
              data-guide="offer-decline"
              onClick={() => onAct("decline")}
            >
              {o.decline}
            </Button>
            <Button
              size="sm"
              dots
              disabled={!!block}
              data-guide="offer-accept"
              onClick={() => onAct("accept")}
            >
              {o.accept}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function OfferDrawer({
  offer,
  onClose,
  onAct,
}: {
  offer: OfferVM | undefined;
  onClose: () => void;
  onAct: (a: "accept" | "decline" | "counter") => void;
}) {
  const o = useO();
  const { locale } = useI18n();
  const { external } = useWs();
  const h = useH();
  const phone = useIsPhone();
  const baseBlock = useAcceptBlock();
  const extWhy = useExtAcceptWhy(offer ?? { service: "" });
  const block = baseBlock ?? (external ? extWhy : null);
  if (!offer) return null;
  const x = offer as ExtOfferVM;
  const pending = offer.status === "pending";
  return (
    <Dialog
      open
      onClose={onClose}
      side={phone ? "bottom" : "right"}
      title={`${offer.service} – ${offer.client}`}
      description={offer.ref}
      footer={
        pending ? (
          <>
            <Button variant="outline" onClick={() => onAct("decline")}>
              {o.decline}
            </Button>
            {external && !x.counter && (
              <Button variant="ghost" onClick={() => onAct("counter")}>
                {h.counter.open}
              </Button>
            )}
            <Button dots disabled={!!block} onClick={() => onAct("accept")}>
              {o.accept}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="grid gap-5">
        {pending && <Countdown to={offer.expiresAt} kind="respond" />}
        <section>
          <h3 className="text-eyebrow text-fg-subtle uppercase">
            {o.drawer.brief}
          </h3>
          <p className="mt-1 text-body">{offer.summary}</p>
        </section>
        <section className="bg-tint p-4 text-small">
          <p className="flex items-center gap-2 font-medium">
            <Icon name="file" size={16} aria-hidden />
            {fill(o.shared, { n: offer.shared[0], t: offer.shared[1] })}
          </p>
          <p className="mt-1 flex items-center gap-2 text-fg-muted">
            <Icon name="lock" size={14} aria-hidden />
            {o.drawer.locked}
          </p>
        </section>
        <dl className="grid grid-cols-2 gap-4 text-small">
          <div>
            <dt className="text-fg-subtle">{o.drawer.due}</dt>
            <dd className="font-medium">
              {formatDateTime(offer.dueAt, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-fg-subtle">
              {fill(o.effort, { h: offer.effortH })}
            </dt>
            <dd>
              <Share offer={offer} big />
            </dd>
          </div>
        </dl>
        <section>
          <h3 className="text-eyebrow text-fg-subtle uppercase">{o.skills}</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {offer.skills.map((s) => (
              <li
                key={s}
                className="bg-ink-100 px-2.5 py-1 text-small"
              >
                {s}
              </li>
            ))}
          </ul>
        </section>
        {pending && x.counter && <CounterState offer={x} />}
        {pending && block && (
          <p className="text-small text-warning">{baseBlock ? o.blocked[baseBlock] : block}</p>
        )}
      </div>
    </Dialog>
  );
}

export function OffersView() {
  const o = useO();
  const q = useOffers();
  const { refresh } = useOfferActions();
  const p = useUrlParams();
  const tab = (TABS as readonly string[]).includes(p.get("tab") ?? "")
    ? (p.get("tab") as Tab)
    : "pending";
  const id = p.get("offer");
  const act = p.get("act");
  const [leaving, setLeaving] = useState<string[]>([]);
  const all = q.data ?? [];
  const open = (offer: string | null, a: string | null = null) =>
    setUrlParams({ offer, act: a });
  const close = () => open(null);

  // Card animates out (m-out, --dur-3), then counts/tabs refresh.
  const done = (x: string) => {
    setLeaving((l) => [...l, x]);
    setTimeout(() => {
      refresh();
      setLeaving((l) => l.filter((y) => y !== x));
    }, 280);
  };
  const focused = () =>
    (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
      "[data-offer]",
    )?.dataset.offer;
  const keyAct = (a: "accept" | "decline") => {
    const f = focused();
    if (f && all.find((x) => x.id === f)?.status === "pending") open(f, a);
  };
  useShortcut("a", o.keys.accept, () => keyAct("accept"), "list");
  useShortcut("d", o.keys.decline, () => keyAct("decline"), "list");

  const list = (t: Tab) => {
    if (q.isPending) return <SkeletonRows n={3} className="[&>div]:h-36" />;
    if (q.isError)
      return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
    const rows = all.filter((x) => tabOf(x.status) === t);
    if (!rows.length)
      return <EmptyPanel title={o.empty[t][0]} body={o.empty[t][1]} />;
    return (
      <div className="grid gap-3 m-stagger">
        {rows.map((x, i) => (
          <OfferCard
            key={x.id}
            offer={x}
            i={Math.min(i, 6)}
            leaving={leaving.includes(x.id)}
            onOpen={() => open(x.id)}
            onAct={(a) => open(x.id, a)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="pb-24 lg:pb-8">
      <PageHead title={o.title} sub={o.sub} />
      <Tabs
        value={tab}
        onChange={(t) =>
          setUrlParams({
            tab: t === "pending" ? null : t,
            offer: null,
            act: null,
          })
        }
        tabs={TABS.map((t) => ({
          id: t,
          label: o.tabs[t],
          count: q.data
            ? all.filter((x) => tabOf(x.status) === t).length
            : undefined,
          content: list(t),
        }))}
      />
      {id && !act && (
        <OfferDrawer
          offer={all.find((x) => x.id === id)}
          onClose={close}
          onAct={(a) => open(id, a)}
        />
      )}
      <CounterDialog
        offer={id && act === "counter" ? ((all.find((x) => x.id === id) as ExtOfferVM | undefined) ?? null) : null}
        onClose={close}
      />
      <AcceptOfferDialog
        offerId={id && act === "accept" ? id : null}
        onClose={close}
        onDone={done}
      />
      <DeclineOfferDialog
        offerId={id && act === "decline" ? id : null}
        onClose={close}
        onDone={done}
      />
    </div>
  );
}

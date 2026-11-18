"use client";
// U3 visit detail (plan §7.4, board 02 FH3). Phone is cached deliberately (agent must call); national ID never is.
import Link from "next/link";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { localHref } from "@/lib/i18n/provider";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyA } from "@/lib/field/copy-a";
import { useOnline } from "@/lib/field/net";
import { mapsHref } from "@/lib/field/geo";
import type { FieldVisit } from "@/shared/field/types";
import { FieldHeader, TimeWindowChip, EvidenceChip, CustodyChip, OutcomeChip, ActionBar, NeedsConnection, useFieldBase, useNow, useWsRoot } from "@/components/atoms/field-agent";
import { useOfferActions } from "@/components/organisms/field/field-offer-card";
import { PURPOSE_ICON } from "@/components/organisms/field/visit-row";

export function VisitDetail({ visit: v }: { visit: FieldVisit & { local: { accepted: boolean } } }) {
  const wsRoot = useWsRoot();
  const { c, locale } = useFieldCopy();
  const a = useCopyA();
  const base = useFieldBase();
  const online = useOnline();
  const now = useNow();
  const offer = useOfferActions(v);
  const ended = v.status === "completed" || v.status === "missed";

  return (
    <div className="grid gap-5">
      <FieldHeader back={base()} title={v.title_i18n[locale]} sub={<span className="inline-flex items-center gap-1.5"><Icon name={PURPOSE_ICON[v.purpose]} size={14} aria-hidden />{c.purpose[v.purpose]} · {v.ref}</span>} />

      {v.status === "cancelled" && (
        <p role="status" className="bg-ink-100 px-4 py-3 text-small"><b className="font-medium">{a.cancelled}.</b> {v.cancelledReason ?? a.cancelledBody}</p>
      )}

      <section className="m-rise grid gap-3 border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <TimeWindowChip start={v.windowStart} end={v.windowEnd} now={now} />
          {v.priority === "high" && <span className="inline-flex h-7 items-center bg-gold-100 px-2.5 text-eyebrow font-medium normal-case text-gold-800">{a.high}</span>}
          {v.checkout && <OutcomeChip outcome={v.checkout.outcome} />}
        </div>
        <p className="flex items-start gap-2 text-body"><Icon name="mapPin" size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span>{v.institution && <b className="block font-medium">{v.institution}</b>}{v.address}</span></p>
        <a href={mapsHref(v.lat, v.lng, v.address)} target="_blank" rel="noopener" className="inline-flex min-h-11 w-fit items-center gap-2 border border-border-strong px-4 text-small font-medium hover:bg-ink-100">
          <Icon name="arrowUpRight" size={16} aria-hidden />{a.openMaps}
        </a>
      </section>

      <section className="grid gap-2">
        <h2 className="text-label-lg">{a.whatToDo}</h2>
        <p className="text-body text-fg-muted">{v.todo_i18n[locale]}</p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-label-lg">{a.evidence}</h2>
        <div className="flex flex-wrap gap-2">{v.evidenceRequired.map((e) => <EvidenceChip key={e} kind={e} />)}<EvidenceChip kind="gps" done={!!v.checkin} /></div>
      </section>

      {v.checklist.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-label-lg">{a.checklist} <span className="text-small text-fg-subtle tabular">{v.checklist.filter((x) => x.done).length}/{v.checklist.length}</span></h2>
          <ul className="grid gap-1.5">
            {v.checklist.map((x) => (
              <li key={x.id} className="flex items-center gap-2 text-body">
                <span aria-hidden className={x.done ? "text-success" : "text-fg-subtle"}><Icon name={x.done ? "check" : "minus"} size={16} /></span>
                <span className={x.done ? "line-through text-fg-muted" : ""}>{x.label_i18n[locale]}</span>
                {x.required && <span className="text-eyebrow normal-case text-fg-subtle">· {a.required}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-2 border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-label-lg">{a.client}</h2>
        <p className="flex items-center gap-2"><Icon name="user" size={16} aria-hidden />{v.client.name}</p>
        <p className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 tabular"><Icon name="phone" size={16} aria-hidden />{v.client.phone}</span>
          <a href={`tel:${v.client.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-small font-medium text-on-gold hover:bg-primary-hover">{a.call}</a>
        </p>
        <NeedsConnection online={online}>
          {online
            ? <Link href={localHref(locale, `${wsRoot}/cases/${v.caseRef}`)} className="w-fit text-small font-medium text-link hover:text-link-hover underline underline-offset-4">{fill(a.caseLink, { ref: v.caseRef })}</Link>
            : <span className="text-small text-fg-subtle">{fill(a.caseLink, { ref: v.caseRef })}</span>}
        </NeedsConnection>
      </section>

      <CustodyChip count={v.custodyOpen} since={v.checkin?.at} />

      {v.status !== "cancelled" && v.status !== "declined" && (
        <ActionBar>
          {v.status === "offered" && !v.local.accepted ? (
            <>
              <Button size="lg" className="justify-center" loading={offer.busy} onClick={offer.accept}><Icon name="check" size={18} aria-hidden />{a.accept}</Button>
              <Button size="lg" variant="outline" className="justify-center text-danger" disabled={!online} title={online ? undefined : c.needsConnection} onClick={offer.decline}><Icon name="x" size={18} aria-hidden />{a.decline}</Button>
            </>
          ) : ended ? (
            <p className="flex items-center justify-center gap-2 bg-success-bg px-4 text-small font-medium text-success"><Icon name="check" size={16} aria-hidden />{a.visitDone}</p>
          ) : (
            <ButtonLink href={`${base(`/visits/${v.id}`)}?step=${v.status === "in_progress" ? "work" : "checkin"}`} size="lg" className="justify-center">
              {v.status === "in_progress" ? a.continueVisit : a.startVisit}<Icon name="arrowRight" size={18} aria-hidden />
            </ButtonLink>
          )}
        </ActionBar>
      )}
      {offer.dialog}
    </div>
  );
}

import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { localHref } from "@/shared/i18n/config";
import { formatDate, formatMoney } from "@/shared/format";
import type { ServiceVM } from "@/lib/catalogue";
import type { LdCopy, Update } from "@/content/pages/ld";
import { ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { IcsButton } from "@/components/molecules/site/library";

/** Deadline tile: big day number on a calendar, or a document glyph. */
export function UpdateVisual({ u }: { u: Update }) {
  return u.visual === "calendar" && u.deadline ? (
    <div
      aria-hidden
      className="flex aspect-[4/3] items-center justify-center bg-grad-navy-depth"
    >
      <div className="w-24 overflow-hidden bg-white text-center shadow-lg">
        <div className="h-5 bg-primary" />
        <p className="py-2 font-display text-[2.75rem] leading-none text-navy-700">
          {Number(u.deadline.slice(8))}
        </p>
      </div>
    </div>
  ) : (
    <div
      aria-hidden
      className="flex aspect-[4/3] items-center justify-center bg-tint"
    >
      <span className="relative">
        <Icon name="file" size={72} strokeWidth={1.2} className="text-navy-700" />
        <Icon
          name="check"
          size={22}
          strokeWidth={3}
          className="absolute -right-2 -bottom-1 size-[22px] rounded-full bg-success p-1 text-white"
        />
      </span>
    </div>
  );
}

export function DeadlineBlock({
  u,
  c,
  locale,
}: {
  u: Update;
  c: LdCopy["updates"];
  locale: Locale;
}) {
  if (!u.deadline) return null;
  return (
    <div className="grid content-start gap-2">
      <p className="text-label-lg">{c.deadline}</p>
      <p className="text-h3">
        <time dateTime={u.deadline}>
          {formatDate(u.deadline, locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
      </p>
      <IcsButton
        label={c.addCal}
        file={u.slug}
        uid={`upd-${u.slug}`}
        title={`${u.inst}: ${u.t[locale].title}`}
        description={u.t[locale].changed}
        date={u.deadline}
        className="justify-self-start"
      />
    </div>
  );
}

export function HelpPanel({
  svc,
  c,
  locale,
}: {
  svc: ServiceVM | undefined;
  c: LdCopy["updates"];
  locale: Locale;
}) {
  if (!svc) return null;
  return (
    <div className="grid content-start gap-2">
      <p className="text-label-lg">{c.help}</p>
      <div className="grid gap-3 border border-sky-100 bg-tint p-4">
        <p className="text-body">
          {svc.name}
          {svc.fromFee != null && (
            <>
              <br />
              <span className="text-small">
                {formatMoney(svc.fromFee, "RWF", locale)}
              </span>
            </>
          )}
        </p>
        <ButtonLink
          href={localHref(locale, `/services/${svc.slugs[locale]}`)}
          size="sm"
          dots
          className="justify-self-start"
        >
          {c.getHelp}
          <span className="sr-only">: {svc.name}</span>
        </ButtonLink>
      </div>
    </div>
  );
}

/** One feed entry (v2 card layout, wider help panel). */
export function UpdateCard({
  u,
  c,
  svc,
  locale,
  example,
}: {
  u: Update;
  c: LdCopy["updates"];
  svc: ServiceVM | undefined;
  locale: Locale;
  example: string;
}) {
  const t = u.t[locale];
  return (
    <article className="grid gap-6 border border-border bg-white p-5 md:grid-cols-[1fr_11rem] lg:grid-cols-[1.1fr_11rem_1.3fr_0.9fr_1.1fr] lg:items-start">
      <div className="grid content-start gap-2 lg:border-r lg:border-border lg:pr-5">
        <p className="flex gap-2">
          <span className="bg-secondary px-3 py-1 text-small font-medium text-on-secondary">
            {u.inst}
          </span>
          <span className="bg-ink-100 px-3 py-1 text-small">
            {example}
          </span>
        </p>
        <h3 className="text-h3">
          <Link
            href={localHref(locale, `/updates/${u.slug}`)}
            className="hover:underline"
          >
            {t.title}
          </Link>
        </h3>
        <p className="text-small text-fg-subtle">
          <time dateTime={u.date}>{formatDate(u.date, locale)}</time>
        </p>
      </div>
      <UpdateVisual u={u} />
      <dl className="grid content-start gap-3 text-body md:col-span-2 lg:col-span-1">
        <div>
          <dt className="text-label-lg">{c.changed}</dt>
          <dd className="text-fg-muted">{t.changed}</dd>
        </div>
        <div>
          <dt className="text-label-lg">{c.who}</dt>
          <dd>
            <span className="inline-block border border-navy-100 bg-navy-50 px-3 py-0.5 text-small text-navy-700">
              {t.who}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-label-lg">{c.todo}</dt>
          <dd>
            <ul className="grid gap-1">
              {t.todo.map((x) => (
                <li key={x} className="flex items-center gap-2 text-small">
                  <Icon name="check" size={16} className="text-success-icon" />
                  {x}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <DeadlineBlock u={u} c={c} locale={locale} />
      <HelpPanel svc={svc} c={c} locale={locale} />
    </article>
  );
}

"use client";
import { type ReactNode, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { c4Copy } from "@/content/pages/c4";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localHref, stripLocale } from "@/shared/i18n/config";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Money, StatusPill } from "@/components/atoms/domain";
import { useToast } from "@/components/atoms/toast";
import { c2Copy, fill } from "@/content/pages/c2";
import { uploadCaseDoc } from "@/components/molecules/client/api";
import { toStatus, type Need, type RequestSummary } from "@/components/molecules/client/requests-data";

// Shared bits for the C4 unit (history, notifications, settings, help, bookings, orgs).

export function useC4() {
  const { locale } = useI18n();
  return { c: c4Copy(locale), locale };
}

export function PageHead({
  title,
  lede,
  action,
}: {
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-h2 text-fg-heading">{title}</h1>
        {lede && (
          <p className="mt-2 max-w-xl text-body text-fg-muted">{lede}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/** Settings-style row: icon disc, title + body, trailing action. Stacks on phones. */
export function Panel({
  icon,
  title,
  body,
  action,
  children,
  tone = "white",
  className,
}: {
  icon?: IconName;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  tone?: "white" | "danger";
  className?: string;
}) {
  return (
    <section
      className={cx(
        "p-5 sm:p-6",
        tone === "danger"
          ? "border border-danger/30 bg-danger-bg"
          : "border border-border bg-surface shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        {icon && (
          <span
            aria-hidden
            className={cx(
              "flex size-12 shrink-0 items-center justify-center rounded-full",
              tone === "danger"
                ? "bg-surface text-danger"
                : "bg-navy-50 text-navy-700",
            )}
          >
            <Icon name={icon} size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="text-card-title text-fg-heading">{title}</h2>
          {body && <p className="mt-1 text-body text-fg-muted">{body}</p>}
        </div>
        {action}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="grid gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          className="block h-20 animate-pulse bg-ink-100"
        />
      ))}
    </div>
  );
}

const ITEMS: {
  href: string;
  key: "profile" | "security" | "notifications" | "privacy";
  icon: IconName;
}[] = [
  { href: "/settings", key: "profile", icon: "user" },
  { href: "/settings/security", key: "security", icon: "shield" },
  { href: "/settings/notifications", key: "notifications", icon: "message" },
  { href: "/settings/privacy", key: "privacy", icon: "lock" },
];

/** Settings frame: heading + section nav (rail on desktop, scrollable pills on phones). */
export function SettingsFrame({ children }: { children: React.ReactNode }) {
  const { c, locale } = useC4();
  const path = stripLocale(usePathname());
  return (
    <>
      <PageHead title={c.settings.title} lede={c.settings.lede} />
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr] lg:gap-10">
        <nav
          aria-label={c.settings.title}
          className="overflow-x-auto lg:overflow-visible"
        >
          <ul className="flex gap-2 lg:sticky lg:top-24 lg:flex-col">
            {ITEMS.map((i) => {
              const on = path === i.href;
              return (
                <li key={i.href}>
                  <Link
                    href={localHref(locale, i.href)}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "flex h-11 items-center gap-3 px-4 text-button whitespace-nowrap transition-colors",
                      on
                        ? "bg-secondary text-on-secondary"
                        : "text-fg-muted hover:bg-navy-50 hover:text-navy-700",
                    )}
                  >
                    <Icon name={i.icon} size={18} aria-hidden />
                    {c.settings.nav[i.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}

const MAX_MB = 25;

/** One "Needs you" item with its inline action: upload (document), pay or review (link). */
export function NeedRow({
  need,
  tone = "plain",
}: {
  need: Need;
  tone?: "plain" | "band";
}) {
  const { locale } = useI18n();
  const c = c2Copy(locale);
  const qc = useQueryClient();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!need.done);

  async function upload(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024)
      return toast({
        title: c.req.uploadFailed,
        body: `≤ ${MAX_MB} MB`,
        tone: "danger",
      });
    setBusy(true);
    try {
      await uploadCaseDoc(need.code, f, { need_id: need.id });
      setDone(true);
      toast({ title: c.req.uploaded, body: need.label, tone: "success" });
      qc.invalidateQueries({ queryKey: ["c2"] });
    } catch {
      toast({ title: c.req.uploadFailed, tone: "danger" });
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <li
      className={cx(
        "flex flex-wrap items-center gap-x-4 gap-y-2 py-3",
        tone === "plain" && "border-b border-border last:border-0",
      )}
    >
      <Icon
        name={
          need.kind === "document"
            ? "upload"
            : need.kind === "payment"
              ? "wallet"
              : "file"
        }
        aria-hidden
        className="shrink-0"
      />
      <p className="min-w-0 flex-1 text-body">
        <span className="font-medium">{need.label}</span>
        <span className="text-fg-muted">
          {" "}
          · {need.service} <span className="tabular">{need.code}</span>
        </span>
        {need.amount != null && (
          <>
            {" "}
            · <Money amount={need.amount} className="font-medium" />
          </>
        )}
        {need.dueAt && (
          <span className="block text-small text-fg-subtle">
            {fill(c.dash.due, { date: formatDate(need.dueAt, locale) })}
          </span>
        )}
      </p>
      {done ? (
        <span className="inline-flex items-center gap-1 text-small font-medium text-success">
          <Icon name="check" size={16} aria-hidden />
          {c.req.uploaded}
        </span>
      ) : need.kind === "document" ? (
        <>
          <input
            ref={file}
            type="file"
            hidden
            accept="application/pdf,image/*"
            onChange={(e) => upload(e.target.files?.[0])}
            aria-label={`${c.dash.upload}: ${need.label}`}
          />
          <Button
            size="sm"
            loading={busy}
            onClick={() => file.current?.click()}
          >
            {busy ? c.req.uploading : c.dash.upload}
          </Button>
        </>
      ) : (
        <ButtonLink
          size="sm"
          href={
            need.kind === "payment"
              ? localHref(locale, `/pay/${encodeURIComponent(need.code)}`)
              : localHref(locale, `/requests/${need.code}`)
          }
        >
          {need.kind === "payment" ? c.dash.pay : c.dash.review}
        </ButtonLink>
      )}
    </li>
  );
}

/** Compact request row used on the dashboard (the list page uses DataTable). */
export function RequestRow({ r }: { r: RequestSummary }) {
  const { locale } = useI18n();
  return (
    <li className="border-b border-border last:border-0">
      <Link
        href={localHref(locale, `/requests/${r.code}`)}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-navy-50 focus-visible:bg-navy-50"
      >
        <span className="min-w-0 flex-1 basis-52">
          <span className="block truncate text-label text-fg">{r.service_name}</span>
          <span className="text-small text-fg-subtle tabular">
            {r.code} · {formatDate(r.submitted_at, locale)}
          </span>
        </span>
        <StatusPill status={toStatus(r.status)} />
      </Link>
    </li>
  );
}

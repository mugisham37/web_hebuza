"use client";
// U1 field shell (plan §7.2): starts the engine for field agents, sub-nav, SyncPill, offline/expiry banner,
// update-ready, other-tab notice, and the denied / revoked / storage-error states. Mounted by the field layout.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cx } from "@/shared/format";
import { useSession } from "@/lib/auth/session";
import { localHref } from "@/lib/i18n/provider";
import { useFieldCopy } from "@/lib/field/copy";
import { useFieldMe } from "@/lib/field/api";
import { start, useEngine, applyUpdate } from "@/lib/field/sync";
import { usePrefs } from "@/lib/field/prefs";
import { pendingCount } from "@/lib/field/queue";
import { ButtonLink, Button } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";
import { SyncPill, SyncAnnouncer, OfflineBanner, useFieldBase } from "@/components/atoms/field-agent";
import { ArtPinLock, ArtShieldPhone, FieldEmpty } from "@/components/atoms/field-art";

const TABS = [
  ["", "today"], ["/outbox", "outbox"], ["/expenses", "expenses"], ["/earnings", "earnings"], ["/prepare", "prepare"], ["/settings", "settings"],
] as const;

export function FieldShell({ children }: { children: ReactNode }) {
  const { c, locale } = useFieldCopy();
  const { user } = useSession();
  const me = useFieldMe();
  const eng = useEngine();
  const prefs = usePrefs();
  const base = useFieldBase();
  const path = usePathname();

  useEffect(() => { if (user && me.isFieldAgent) void start(user.id); }, [user, me.isFieldAgent]);
  // Battery saver forces reduced motion on the field root (plan §2.13).
  useEffect(() => {
    document.documentElement.toggleAttribute("data-field-reduced", prefs.battery);
    return () => document.documentElement.removeAttribute("data-field-reduced");
  }, [prefs.battery]);

  if (eng.status === "revoked") {
    return (
      <FieldEmpty art={<ArtShieldPhone />} title={c.revoked.title} body={c.revoked.body}
        action={<ButtonLink href={localHref(locale, "/login?as=agent")} variant="primary" size="lg">{c.revoked.cta}</ButtonLink>} />
    );
  }
  if (me.isPending && !me.offlineOk) {
    return <div className="grid gap-3" aria-busy><Skeleton className="h-10 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  }
  if (!me.isFieldAgent) {
    return (
      <FieldEmpty art={<ArtPinLock />} title={c.denied.title} body={c.denied.body}
        action={<ButtonLink href={localHref(locale, "/agent/profile")} variant="secondary">{c.denied.cta}</ButtonLink>} />
    );
  }

  const active = (suffix: string) => { const href = base(suffix); return suffix ? path.startsWith(href) : path === href || path.startsWith(`${href}/visits`); };
  return (
    <div data-field-root data-motion={prefs.battery ? "reduced" : undefined} className="mx-auto grid max-w-3xl gap-4 [&[data-motion=reduced]_*]:!animate-none [&[data-motion=reduced]_*]:!transition-none">
      <SyncAnnouncer />
      <div className="sticky top-16 z-20 -mx-gutter flex items-center gap-2 border-b border-border bg-bg/95 px-gutter py-2 backdrop-blur lg:-mx-8 lg:px-8">
        <nav aria-label={c.field} className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
          {TABS.map(([suffix, key]) => (
            <Link key={key} href={base(suffix)} aria-current={active(suffix) ? "page" : undefined}
              className={cx("relative flex h-9 shrink-0 items-center gap-1.5 px-3.5 text-small font-medium transition-colors",
                active(suffix) ? "bg-secondary text-on-navy hover:bg-secondary-hover" : "text-fg-muted hover:bg-navy-50 hover:text-navy-700")}>
              {c.nav[key]}
              {key === "outbox" && pendingCount(eng.ops) > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center bg-gold-400 px-1.5 text-[0.7rem] font-semibold text-on-gold tabular">{pendingCount(eng.ops)}</span>}
            </Link>
          ))}
        </nav>
        <SyncPill className="hidden sm:inline-flex" />
      </div>
      <div className="flex justify-end sm:hidden"><SyncPill /></div>
      <OfflineBanner />
      {eng.status === "error" && <p role="alert" className="bg-danger-bg px-4 py-3 text-small text-danger">{c.storeError}</p>}
      {eng.forbidden && <p role="alert" className="bg-danger-bg px-4 py-3 text-small text-danger">{c.forbidden}</p>}
      {eng.otherTab && <p role="status" className="bg-info-bg px-4 py-3 text-small text-info">{c.otherTab}</p>}
      {eng.updateReady && (
        <div role="status" className="flex flex-wrap items-center gap-3 border-l-3 border-gold-400 bg-gold-50 px-4 py-3 text-small text-fg">
          <span className="flex-1 font-medium">{c.updateReady}</span>
          <Button size="sm" disabled={pendingCount(eng.ops) > 0} onClick={() => void applyUpdate().then((ok) => ok && location.reload())}>{c.updateNow}</Button>
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

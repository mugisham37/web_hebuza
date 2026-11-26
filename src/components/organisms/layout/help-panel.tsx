"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Icon } from "@/components/atoms/icon";
import { RichLine } from "@/components/atoms/guide";
import { useI18n } from "@/lib/i18n/provider";
import { localHref, type Locale } from "@/shared/i18n/config";
import type { Workspace } from "@/shared/auth/roles";
import { guidesCopy } from "@/content/guides/copy";
import type { ResolvedGuide } from "@/content/guides/workspaces";
import { buildIndex, searchServices } from "@/lib/site/service-search";
import { GuideView } from "@/components/organisms/site/guide-view";
import { cx } from "@/shared/format";

type Set = {
  workspace: Workspace;
  cats: { key: string; label: string }[];
  guides: ResolvedGuide[];
};
type Load = { sets: Set[] } | "auth" | "error";

// One request per locale per tab; the panel and the welcome card share it.
const cache = new Map<Locale, Promise<Load>>();
function loadGuides(l: Locale): Promise<Load> {
  if (!cache.has(l)) {
    const p = fetch(`/guides-data?locale=${l}`, { credentials: "same-origin" })
      .then(async (r) => {
        if (r.status === 401) {
          await fetch("/api/auth/session", {
            credentials: "same-origin",
          }).catch(() => {});
          const again = await fetch(`/guides-data?locale=${l}`, {
            credentials: "same-origin",
          });
          return again.ok ? ((await again.json()) as { sets: Set[] }) : "auth";
        }
        return r.ok ? ((await r.json()) as { sets: Set[] }) : "error";
      })
      .catch((): Load => "error");
    p.then((v) => {
      if (v === "auth" || v === "error") cache.delete(l);
    });
    cache.set(l, p);
  }
  return cache.get(l)!;
}
function useGuides(l: Locale, enabled: boolean) {
  const [data, setData] = useState<Load | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadGuides(l).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [l, enabled]);
  return data;
}
/** Longest route prefix wins: a guide for /finance/refunds beats one for /finance. */
const score = (g: ResolvedGuide, path: string) =>
  Math.max(
    0,
    ...g.pages.map((p) =>
      path === p || path.startsWith(`${p}/`) ? p.length : 0,
    ),
  );

/** "?" in the dashboard top bar: a right-hand panel with the guides for this page first, search, and the guide itself. */
export function HelpPanel({ workspace }: { workspace: Workspace }) {
  const { locale } = useI18n();
  const c = guidesCopy(locale);
  const dlg = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [q, setQ] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const data = useGuides(locale, opened);
  const path = usePathname().replace(/^\/(rw|en|fr)(?=\/|$)/, "") || "/";
  const sets = useMemo(() => (typeof data === "object" && data ? data.sets : []), [data]);
  const own = sets.find((s) => s.workspace === workspace) ?? sets[0];
  const all = useMemo(() => sets.flatMap((s) => s.guides), [sets]);
  const index = useMemo(
    () =>
      buildIndex(
        all.map((g) => ({
          slug: `${g.workspace}:${g.slug}`,
          path: g.slug,
          name: g.title,
          family: g.catLabel,
          summary: `${g.summary} ${g.keywords ?? ""} ${g.sections.map((s) => s.title).join(" ")}`,
        })),
      ),
    [all],
  );
  const here = (own?.guides ?? [])
    .map((g) => ({ g, s: score(g, path) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.g);
  const hits = q.trim()
    ? searchServices(index, q, 12)
        .map((h) =>
          all.find((g) => `${g.workspace}:${g.slug}` === h.item.slug)!,
        )
        .filter(Boolean)
    : null;
  const open = slug
    ? all.find((g) => `${g.workspace}:${g.slug}` === slug)
    : undefined;
  const allHref = localHref(
    locale,
    `${workspace === "client" ? "/dashboard" : `/${workspace}`}/guides`,
  );

  const row = (g: ResolvedGuide) => (
    <li key={`${g.workspace}:${g.slug}`}>
      <button
        type="button"
        onClick={() => setSlug(`${g.workspace}:${g.slug}`)}
        className="group flex w-full items-start gap-3 border border-border bg-white p-3.5 text-left transition-colors hover:border-navy-300"
      >
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-label text-fg-heading group-hover:underline">
            {g.title}
          </span>
          <span className="line-clamp-2 text-small text-fg-muted">
            {g.summary}
          </span>
        </span>
        <Icon
          name="chevronRight"
          size={18}
          className="mt-0.5 shrink-0 text-navy-700"
        />
      </button>
    </li>
  );

  return (
    <>
      <button
        type="button"
        data-guide="help-button"
        onClick={() => {
          setOpened(true);
          dlg.current?.showModal();
        }}
        aria-label={c.help}
        title={c.help}
        className="flex h-10 items-center gap-1.5 px-2.5 text-small font-medium text-navy-900 hover:bg-navy-50"
      >
        <span
          aria-hidden
          data-round
          className="flex size-6 items-center justify-center rounded-full border-2 border-navy-700 text-[0.8125rem] font-bold"
        >
          ?
        </span>
        <span className="hidden md:inline">{c.help}</span>
      </button>
      <dialog
        ref={dlg}
        aria-label={c.helpTitle}
        onClose={() => setSlug(null)}
        onClick={(e) => e.target === e.currentTarget && dlg.current?.close()}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-bg p-0 backdrop:bg-ink-950/40 sm:w-[min(100vw,30rem)]"
      >
        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
          <header className="grid gap-3 border-b border-border bg-white px-5 pt-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              {open ? (
                <button
                  type="button"
                  onClick={() => setSlug(null)}
                  className="inline-flex h-9 items-center gap-1.5 text-small text-link"
                >
                  <Icon name="chevronLeft" size={16} />
                  {c.back}
                </button>
              ) : (
                <p className="text-h3 text-fg-heading">{c.helpTitle}</p>
              )}
              <button
                type="button"
                onClick={() => dlg.current?.close()}
                aria-label={c.close}
                className="flex size-9 items-center justify-center hover:bg-navy-50"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            {!open && (
              <label className="relative block">
                <span className="sr-only">{c.search}</span>
                <Icon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-navy-700"
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={c.search}
                  className="h-11 w-full border border-border-strong bg-white pr-3 pl-10 text-small focus:border-gold-400 focus:outline-none"
                />
              </label>
            )}
          </header>
          <div className="overflow-y-auto px-5 py-5">
            {data === null ? (
              <p className="text-small text-fg-muted">{c.loading}</p>
            ) : data === "auth" ? (
              <p className="text-small text-fg-muted">{c.signInAgain}</p>
            ) : data === "error" ? (
              <p className="text-small text-fg-muted">{c.noneTitle}</p>
            ) : open ? (
              <GuideView g={open} copy={c} compact />
            ) : hits ? (
              hits.length ? (
                <ul className="grid gap-2">{hits.map(row)}</ul>
              ) : (
                <p className="text-small text-fg-muted">{c.noneTitle}</p>
              )
            ) : (
              <div className="grid gap-6">
                {here.length > 0 && (
                  <section className="grid gap-2">
                    <h3 className="text-eyebrow text-fg-subtle uppercase">
                      {c.forThisPage}
                    </h3>
                    <ul className="grid gap-2">{here.slice(0, 6).map(row)}</ul>
                  </section>
                )}
                {own && (
                  <section className="grid gap-2">
                    <h3 className="text-eyebrow text-fg-subtle uppercase">
                      {c.startHere}
                    </h3>
                    <ul className="grid gap-2">
                      {own.guides
                        .filter((g) => g.start && !here.includes(g))
                        .slice(0, 5)
                        .map(row)}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-5 py-3.5">
            {open ? (
              <Link
                href={`${allHref}?ws=${open.workspace}&g=${open.slug}`}
                onClick={() => dlg.current?.close()}
                className="text-small font-medium text-link hover:underline"
              >
                {c.openFull} →
              </Link>
            ) : (
              <Link
                href={allHref}
                onClick={() => dlg.current?.close()}
                className="text-small font-medium text-link hover:underline"
              >
                {c.allInDashboard} →
              </Link>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}

const subscribe = () => () => {};
/** First visit to a dashboard: a dismissible card with its "start here" guides (remembered per browser and dashboard). */
export function GuidesWelcome({ workspace }: { workspace: Workspace }) {
  const { locale } = useI18n();
  const c = guidesCopy(locale);
  const key = `guides-welcome:${workspace}`;
  const seen = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return !!localStorage.getItem(key);
      } catch {
        return true;
      }
    },
    () => true,
  );
  const [hidden, setHidden] = useState(false);
  const data = useGuides(locale, !seen && !hidden);
  const set =
    typeof data === "object" && data
      ? data.sets.find((s) => s.workspace === workspace)
      : undefined;
  const starts = set?.guides.filter((g) => g.start).slice(0, 3) ?? [];
  if (seen || hidden || !starts.length) return null;
  const close = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    setHidden(true);
  };
  const base = localHref(
    locale,
    `${workspace === "client" ? "/dashboard" : `/${workspace}`}/guides`,
  );
  return (
    <aside
      aria-label={c.welcomeTitle}
      className="mb-6 grid gap-3 border-l-[3px] border-navy-700 bg-sky-50 p-4 md:flex md:items-center md:gap-5"
    >
      <p className="flex shrink-0 items-center gap-2 text-label text-navy-900">
        <Icon name="info" size={18} />
        {c.welcomeTitle}
      </p>
      <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
        {starts.map((g) => (
          <li key={g.slug}>
            <Link
              href={`${base}?ws=${workspace}&g=${g.slug}`}
              onClick={close}
              className={cx(
                "inline-flex h-9 items-center border border-navy-200 bg-white px-3 text-small text-navy-900 hover:border-navy-700",
              )}
            >
              <RichLine text={g.title} />
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={close}
        className="h-9 shrink-0 px-3 text-small text-fg-muted hover:text-fg-heading"
      >
        {c.dismiss}
      </button>
    </aside>
  );
}

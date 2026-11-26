"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/atoms/icon";
import { useI18n } from "@/lib/i18n/provider";
import {
  setUrlParams,
  useUrlParams,
} from "@/components/molecules/site/library";
import { GuidesBrowser } from "@/components/organisms/site/guides-browser";
import { GuideView } from "@/components/organisms/site/guide-view";
import { guidesCopy, fill } from "@/content/guides/copy";
import type { ResolvedGuide } from "@/content/guides/workspaces";
import type { Workspace } from "@/shared/auth/roles";
import { waLink } from "@/content/marketing";
import { cx } from "@/shared/format";

type Set = {
  workspace: Workspace;
  cats: { key: string; label: string }[];
  guides: ResolvedGuide[];
};
const searchText = (g: ResolvedGuide) =>
  [
    g.keywords,
    ...g.sections.flatMap((s) => [
      s.title,
      s.intro,
      ...(s.steps ?? []).map((x) => x.text.replace(/\*\*/g, "")),
      ...(s.tips ?? []),
    ]),
  ]
    .filter(Boolean)
    .join(" ");

/**
 * In-dashboard Guides page. One tab per dashboard the person can open (system administrators see every dashboard),
 * "start here" cards, then search + topics; a guide opens in place (?g=slug) so the side menu stays put.
 */
export function WorkspaceGuides({
  sets,
  current,
}: {
  sets: Set[];
  current: Workspace;
}) {
  const { t, locale } = useI18n();
  const c = guidesCopy(locale);
  const path = usePathname();
  const params = useUrlParams();
  const ws =
    (params.get("ws") as Workspace | null) ??
    (sets.some((s) => s.workspace === current) ? current : sets[0]?.workspace);
  const set = sets.find((s) => s.workspace === ws) ?? sets[0];
  const open = set?.guides.find((g) => g.slug === params.get("g"));
  if (!set) return <p className="text-body text-fg-muted">{c.noneTitle}</p>;
  const href = (g: ResolvedGuide) => `${path}?ws=${g.workspace}&g=${g.slug}`;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <p className="text-eyebrow text-fg-subtle uppercase">{c.helpTitle}</p>
        <h1 className="text-h2 text-fg-heading">
          {open ? t(`workspace.${set.workspace}`) : c.title}
        </h1>
        {!open && (
          <p className="max-w-2xl text-body text-fg-muted">{c.wsSub}</p>
        )}
      </header>

      {sets.length > 1 && (
        <div
          role="tablist"
          aria-label={c.dashboards}
          className="no-scrollbar -mx-gutter flex gap-1 overflow-x-auto border-b border-border px-gutter lg:mx-0 lg:px-0"
        >
          {[...sets].sort((a, b) => Number(b.workspace === current) - Number(a.workspace === current)).map((s) => (
            <button
              key={s.workspace}
              type="button"
              role="tab"
              aria-selected={s.workspace === set.workspace}
              onClick={() =>
                setUrlParams({
                  ws: s.workspace,
                  g: null,
                  q: null,
                  cat: null,
                  page: null,
                })
              }
              className={cx(
                "-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-button transition-colors",
                s.workspace === set.workspace
                  ? "border-navy-700 text-navy-900"
                  : "border-transparent text-fg-muted hover:text-fg-heading",
              )}
            >
              {t(`workspace.${s.workspace}`)}
              <span className="bg-ink-100 px-1.5 text-eyebrow tabular">
                {s.guides.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {open ? (
        <div className="grid gap-6">
          <Link
            href={`${path}?ws=${set.workspace}`}
            className="inline-flex w-fit items-center gap-1.5 text-small text-link hover:underline"
          >
            <Icon name="chevronLeft" size={16} />
            {c.back}
          </Link>
          <div className="border border-border bg-white p-5 md:p-8">
            <GuideView g={open} copy={c} />
          </div>
        </div>
      ) : (
        <>
          {set.guides.some((g) => g.start) && (
            <section aria-labelledby="start-h" className="grid gap-3">
              <h2 id="start-h" className="text-label-lg text-fg-heading">
                {c.startHere}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {set.guides
                  .filter((g) => g.start)
                  .map((g, i) => (
                    <li key={g.slug}>
                      <Link
                        href={href(g)}
                        className="group flex h-full items-start gap-3 border border-border bg-white p-4 transition-colors hover:border-navy-300"
                      >
                        <span
                          aria-hidden
                          className="flex size-8 shrink-0 items-center justify-center bg-navy-700 text-label text-primary tabular"
                        >
                          {i + 1}
                        </span>
                        <span className="grid gap-1">
                          <span className="text-label text-fg-heading group-hover:underline">
                            {g.title}
                          </span>
                          <span className="text-small text-fg-muted">
                            {fill(c.read, { n: g.minutes })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}
          <GuidesBrowser
            key={set.workspace}
            items={set.guides.map((g) => ({
              slug: g.slug,
              href: href(g),
              cat: g.cat,
              title: g.title,
              summary: g.summary,
              text: searchText(g),
              minutes: fill(c.read, { n: g.minutes }),
              popular: g.start,
            }))}
            cats={set.cats.filter((k) =>
              set.guides.some((g) => g.cat === k.key),
            )}
            copy={c}
            waHref={waLink("Muraho HEBUZA")}
          />
        </>
      )}
    </div>
  );
}

import type { Locale } from "@/shared/i18n/config";
import { localHref } from "@/shared/i18n/config";
import { waLink } from "@/content/marketing";
import { guidesCopy, fill } from "@/content/guides/copy";
import { guideSearchText, guideText } from "@/content/guides";
import type { Guide, GuideCat } from "@/content/guides/types";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { HighlightWord, ZigzagBand } from "@/components/atoms/brand";
import { Breadcrumb } from "@/components/organisms/site/sections";
import { GuidesBrowser } from "@/components/organisms/site/guides-browser";

/** Guides index (public /guides or team /guides/team): hero with the other audience's door, then the searchable list. */
export function GuidesHome({
  locale,
  guides,
  cats,
  team,
}: {
  locale: Locale;
  guides: Guide[];
  cats: readonly GuideCat[];
  team?: boolean;
}) {
  const c = guidesCopy(locale);
  const L = (p: string) => localHref(locale, p);
  const base = team ? "/guides/team" : "/guides";
  const items = [...guides]
    .sort((a, b) => Number(!!b.popular) - Number(!!a.popular))
    .map((g) => {
      const t = guideText(g, locale);
      return {
        slug: g.slug,
        href: L(`${base}/${g.slug}`),
        cat: g.cat,
        title: t.title,
        summary: t.summary,
        text: guideSearchText(t),
        minutes: fill(c.read, { n: g.minutes }),
        popular: g.popular,
      };
    });
  const words = (team ? c.teamTitle : c.title).split(" ");
  const last = words.pop();
  return (
    <>
      <section className="px-gutter pt-[calc(var(--header-h)+2.5rem)] pb-12 lg:pb-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
          <div className="grid gap-4">
            <Breadcrumb items={team ? [{ label: c.tag, href: L("/guides") }, { label: c.teamTitle }] : [{ label: c.tag }]} />
            <span>
              <Tag variant="navy" className="uppercase">
                {team ? c.forTeam : c.forClients}
              </Tag>
            </span>
            <h1 className="text-[clamp(2.25rem,1.6rem+2.6vw,3.75rem)] leading-[1.04] tracking-[-0.04em]">
              {words.join(" ")} <HighlightWord>{last}</HighlightWord>
            </h1>
            <p className="max-w-xl text-lead text-fg-muted">
              {team ? c.teamSub : c.sub}
            </p>
          </div>
          {/* The other audience's door. */}
          <div className="theme-dark grid gap-4 bg-navy-700 p-6 text-white">
            <p className="flex items-center gap-2 text-label">
              <Icon
                name={team ? "users" : "briefcase"}
                size={18}
                className="text-primary"
              />
              {team ? c.forClients : c.forTeam}
            </p>
            <p className="text-small text-white/75">
              {team ? c.sub : c.teamSub}
            </p>
            <ButtonLink
              href={L(team ? "/guides" : "/guides/team")}
              variant="primary"
              dots
              className="justify-center"
            >
              {team ? c.tag : c.teamCta}
            </ButtonLink>
          </div>
        </div>
      </section>
      <ZigzagBand from="var(--color-white)" to="var(--color-sky-100)" />
      <section className="bg-sky-100 px-gutter py-[var(--spacing-section-sm)]">
        <div className="container-page">
          <GuidesBrowser
            items={items}
            cats={cats.map((k) => ({ key: k, label: c.cats[k] }))}
            waHref={waLink("Muraho HEBUZA")}
            copy={{ ...c, whatsapp: c.whatsapp }}
          />
        </div>
      </section>
      <ZigzagBand from="var(--color-sky-100)" to="var(--color-white)" />
    </>
  );
}

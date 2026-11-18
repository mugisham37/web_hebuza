// /{locale}/rss.xml — published regulatory updates (the public news feed, spec cms §routes) in that locale.
import { hasLocale } from "@/shared/i18n/config";
import { SITE_URL } from "@/lib/site";
import { getUpdates } from "@/lib/marketing/cms/read";
import { getLd } from "@/content/pages/ld";

const esc = (s: string) => s.replace(/[<>&'"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

export async function GET(_req: Request, ctx: { params: Promise<{ locale: string }> }) {
  const { locale } = await ctx.params;
  if (!hasLocale(locale)) return new Response("Not found", { status: 404 });
  const u = getLd(locale).updates;
  const items = [...(await getUpdates())].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50).map((x) => {
    const link = `${SITE_URL}/${locale}/updates/${x.slug}`;
    return `<item><title>${esc(`${x.inst}: ${x.t[locale].title}`)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${new Date(x.date).toUTCString()}</pubDate><description>${esc(x.t[locale].changed)}</description></item>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(u.tag)}</title><link>${SITE_URL}/${locale}/updates</link><description>${esc(u.meta)}</description><language>${locale}</language><atom:link href="${SITE_URL}/${locale}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

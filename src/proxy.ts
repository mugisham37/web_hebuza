// Next 16 proxy (ex-middleware): locale routing + workspace route guards.
// Guards are a routing convenience; every API call is still authorised server-side (spec/02 §4.1).
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, matchLocale, LOCALE_COOKIE } from "@/shared/i18n/config";
import { PUBLIC_PLANNED, PUBLIC_PREFIXES } from "@/lib/routes";
import type { Redirect } from "@/shared/marketing/types";
import { accessClaims, ACCESS_COOKIE } from "@/lib/auth/claims";
import { normalizeRoles, workspaceForPath, mayEnter, homeFor } from "@/shared/auth/roles";

const REFRESH_COOKIE = "hebuza_refresh";
/** Old app paths kept working for one release (spec/02 §5). */
/** First path segments that can match a route. Root loading.tsx starts streaming before notFound() (soft 404), so unknown paths 404 here via the prerendered /_not-found (a dynamic target 200s on first render).
 * shortcut: first segment only (e.g. /services/bogus is still a soft 404), upgrade to a full route manifest if SEO needs it. */
const KNOWN = new Set(["", "agent", "billing", "bookings", "claim", "dashboard", "design", "documents", "exec", "finance", "marketing", "assistant", "forgot", "history", "how-it-works", "join", "login", "notifications", "ops", "orgs", "partners", "procurement", "requests", "reset", "services", "settings", "signup", "system", "verify", "work", "join-us", "campaign", "lp", "team", "help", "messages", "deliverables", "unsubscribe", ...PUBLIC_PREFIXES, ...PUBLIC_PLANNED.map((p) => p.split("/")[1])]);
/** Static-content slugs: unknown ones 404 here (PPR serves a 200 shell for unknown params before notFound() can run).
 * Live slugs + CMS redirects come from GET /api/content/manifest (60 s memo). Until one load succeeds the slug guard is
 * off (pages still notFound() themselves). Service and category slugs are not checked: the live catalogue changes them. */
const CMS_ROUTE: Record<string, string> = { updates: "regulatory_update", campaign: "landing_page", legal: "legal_doc" };
let live: { at: number; slugs: Record<string, Set<string>>; redirects: Pick<Redirect, "from" | "to" | "code">[] } = { at: 0, slugs: {}, redirects: [] };
async function cms() {
  if (Date.now() - live.at < 60_000 || !process.env.API_URL) return live;
  live.at = Date.now(); // one refresh per window even when the API is down
  const r = await fetch(`${process.env.API_URL}/api/content/manifest`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
  if (!r?.ok) return live;
  const { data } = (await r.json()) as { data: { pages: { path: string; type: string }[]; redirects: Pick<Redirect, "from" | "to" | "code">[] } };
  const slugs: Record<string, Set<string>> = Object.fromEntries(Object.keys(CMS_ROUTE).map((k) => [k, new Set<string>()]));
  for (const p of data.pages) {
    const [, , route, slug] = p.path.split("/");
    if (CMS_ROUTE[route] === p.type && slug) slugs[route].add(slug);
  }
  live = { at: live.at, slugs, redirects: data.redirects };
  return live;
}
/** Non-locale handlers (preview, tracked links, hooks, dev CMS) bypass locale routing. */
const RAW = new Set(["preview", "hooks", "c", "r", "health", "guides-data"]);
const unknownSlug = (seg: string[], SLUGS: Record<string, Set<string>>) =>
  (seg.length === 2 && SLUGS[seg[0]] && !SLUGS[seg[0]].has(seg[1])) ||
  seg.length > (seg[0] === "services" && seg[1] === "c" ? 3 : 2) && (seg[0] in SLUGS || seg[0] === "services");
const LEGACY_REDIRECTS: Record<string, string> = { "/admin": "/ops", "/dashboard/work": "/work",
  // Stage 8 §7.2 journey naming
  "/work-with-us": "/join-us", "/join/agent": "/join", "/sign-in/agent": "/login?as=agent",
  // spec cms §routes: /news is served by /updates (the only published news feed; `article` type has no public reader yet).
  "/news": "/updates",
  // Guides moved from /knowledge (old CMS menus still link there).
  "/knowledge": "/guides" };

/** A redirect target may carry its own query (/login?as=agent): merge the incoming one instead of appending a second "?". */
const withSearch = (to: string, search: string) => (search && to.includes("?") ? `&${search.slice(1)}` : search);

// Origin protection (Phase L): with ORIGIN_AUTH_SECRET set, only requests through Cloudflare (Transform Rule adds
// x-origin-auth) or Railway's health check (Host healthcheck.railway.app, unroutable from the public edge) get through.
function originAuthOk(request: NextRequest): boolean {
  const secret = process.env.ORIGIN_AUTH_SECRET;
  if (!secret || request.headers.get("host") === "healthcheck.railway.app") return true;
  const got = request.headers.get("x-origin-auth") ?? "";
  let diff = got.length ^ secret.length; // constant-time compare
  for (let i = 0; i < secret.length; i++) diff |= got.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export async function proxy(request: NextRequest) {
  if (!originAuthOk(request)) return new NextResponse("Forbidden", { status: 403 });
  const { pathname, search } = request.nextUrl;
  const [, first, ...rest] = pathname.split("/");
  if (RAW.has(first)) return NextResponse.next();

  // 1. Locale prefix: /services → /{cookie | Accept-Language | rw}/services
  if (!hasLocale(first)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = hasLocale(cookieLocale) ? cookieLocale : matchLocale(request.headers.get("accept-language"));
    const legacy = Object.entries(LEGACY_REDIRECTS).find(([from]) => pathname === from || pathname.startsWith(`${from}/`));
    const path = legacy ? pathname.replace(legacy[0], legacy[1]) : pathname;
    return NextResponse.redirect(new URL(`/${locale}${path === "/" ? "" : path}${withSearch(path, search)}`, request.url));
  }

  const locale = first;
  const path = `/${rest.join("/")}`;
  const legacyHit = Object.entries(LEGACY_REDIRECTS).find(([from]) => path === from || path.startsWith(`${from}/`));
  if (legacyHit) { const to = path.replace(legacyHit[0], legacyHit[1]); return NextResponse.redirect(new URL(`/${locale}${to}${withSearch(to, search)}`, request.url)); }
  const workspace = workspaceForPath(path);
  // D-06: /lp/<slug> (journey/spec naming) is an alias of the canonical /campaign/<slug>.
  if (rest[0] === "lp" && rest[1]) return NextResponse.redirect(new URL(`/${locale}/campaign/${rest[1]}${search}`, request.url), 308);
  // CMS redirects (slug renames, archives). shortcut: hit counts aren't recorded from the proxy; log hops if editors need them.
  const manifest = await cms();
  const hop = manifest.redirects.find((r) => r.from === pathname);
  if (hop) return NextResponse.redirect(new URL(`${hop.to}${search}`, request.url), hop.code);

  if (!KNOWN.has(rest[0] ?? "") || unknownSlug(rest.filter(Boolean), manifest.slugs)) return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  const response = NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  // Old team-guides address → the signed-in person's own dashboard guides (or sign in first).
  if (rest[0] === "guides" && rest[1] === "team") {
    const roles = normalizeRoles(((await accessClaims(request.cookies.get(ACCESS_COOKIE)?.value)) ?? {}) as Parameters<typeof normalizeRoles>[0]);
    const home = roles.length ? homeFor(roles) : null;
    if (!home) { const login = new URL(`/${locale}/login`, request.url); login.searchParams.set("next", `/${locale}/guides/team`); return NextResponse.redirect(login); }
    return NextResponse.redirect(new URL(`/${locale}${home === "/dashboard" ? "/dashboard" : home}/guides`, request.url));
  }
  if (!workspace) return response; // public or auth page

  // 2. Workspace guard
  const claims = await accessClaims(request.cookies.get(ACCESS_COOKIE)?.value);
  const roles = claims ? normalizeRoles(claims as Parameters<typeof normalizeRoles>[0]) : [];
  const hasRefresh = request.cookies.has(REFRESH_COOKIE);

  if (roles.length === 0) {
    // Expired access token but a refresh cookie: let the page load; the client refreshes via /api/auth/session.
    if (hasRefresh) return response;
    // Everyone signs in at /login; ?as=<workspace> themes it for that role (UI hint only).
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set("as", workspace);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (!mayEnter(roles, workspace, path)) {
    return NextResponse.redirect(new URL(`/${locale}${homeFor(roles)}`, request.url));
  }
  return response;
}

export const config = {
  // Skip API proxying, Next internals, metadata files and anything with a file extension (public assets).
  matcher: ["/((?!api|_next/static|_next/image|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)"],
};


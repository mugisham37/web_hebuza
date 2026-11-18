// Next 16 proxy (ex-middleware): locale routing + workspace route guards.
// Guards are a routing convenience; every API call is still authorised server-side (spec/02 §4.1).
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, matchLocale, LOCALE_COOKIE } from "@/shared/i18n/config";
import { PUBLIC_PLANNED, PUBLIC_PREFIXES } from "@/lib/routes";
import { GUIDES, UPDATES, CAMPAIGNS } from "@/content/pages/ld";
import type { Redirect } from "@/shared/marketing/types";
import { LEGAL_DOCS } from "@/content/pages/lc";
import { FAMILIES } from "@/content/families";
import { importSPKI, jwtVerify, decodeJwt, type JWTPayload } from "jose";
import { normalizeRoles, workspaceForPath, mayEnter, homeFor } from "@/shared/auth/roles";

const ACCESS_COOKIE = "hebuza_access";
const REFRESH_COOKIE = "hebuza_refresh";
/** Old app paths kept working for one release (spec/02 §5). */
/** First path segments that can match a route. Root loading.tsx starts streaming before notFound() (soft 404), so unknown paths 404 here via the prerendered /_not-found (a dynamic target 200s on first render).
 * shortcut: first segment only (e.g. /services/bogus is still a soft 404), upgrade to a full route manifest if SEO needs it. */
const KNOWN = new Set(["", "agent", "billing", "bookings", "claim", "dashboard", "design", "documents", "exec", "finance", "marketing", "assistant", "forgot", "history", "how-it-works", "join", "login", "notifications", "ops", "orgs", "partners", "procurement", "requests", "reset", "services", "settings", "signup", "system", "verify", "work", "join-us", "campaign", "lp", "team", "help", "messages", "deliverables", "unsubscribe", ...PUBLIC_PREFIXES, ...PUBLIC_PLANNED.map((p) => p.split("/")[1])]);
/** Static-content slugs: unknown ones 404 here (PPR serves a 200 shell for unknown params before notFound() can run).
 * The seed is the fallback when the CMS read below fails; live slugs come from cms() (60 s memo).
 * Service slugs are not checked: the live catalogue can add services without a redeploy. */
const SEED: Record<string, Set<string>> = {
  knowledge: new Set(GUIDES.map((g) => g.slug)),
  updates: new Set(UPDATES.map((u) => u.slug)),
  campaign: new Set(CAMPAIGNS.map((c) => c.slug)),
  legal: new Set<string>(LEGAL_DOCS),
};
/** Slug manifest (seed content; the future backend can serve live CMS slugs + redirects here). */
const CMS_ROUTE: Record<string, string> = { knowledge: "guide", updates: "regulatory_update", campaign: "landing_page" };
let live: { at: number; slugs: Record<string, Set<string>>; redirects: Redirect[] } | null = null;
async function cms() {
  if (live && Date.now() - live.at < 60_000) return live;
  live = { at: Date.now(), slugs: SEED, redirects: [] }; // dummy: seed slugs, no CMS redirects until the backend exists
  return live;
}
/** Non-locale handlers (preview, tracked links, hooks, dev CMS) bypass locale routing. */
const RAW = new Set(["preview", "hooks", "c", "r", "health"]);
const FAMILY_SLUGS = new Set(FAMILIES.map((f) => f.slug));
const unknownSlug = (seg: string[], SLUGS: Record<string, Set<string>>) =>
  (seg.length === 2 && SLUGS[seg[0]] && !SLUGS[seg[0]].has(seg[1])) ||
  (seg[0] === "services" && seg[1] === "c" && seg.length === 3 && !FAMILY_SLUGS.has(seg[2])) ||
  seg.length > (seg[0] === "services" && seg[1] === "c" ? 3 : 2) && (seg[0] in SLUGS || seg[0] === "services");
const LEGACY_REDIRECTS: Record<string, string> = { "/admin": "/ops", "/dashboard/work": "/work",
  // Stage 8 §7.2 journey naming
  "/work-with-us": "/join-us", "/join/agent": "/join", "/sign-in/agent": "/team/sign-in",
  // spec cms §routes: /news is served by /updates (the only published news feed; `article` type has no public reader yet).
  "/news": "/updates" };

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, first, ...rest] = pathname.split("/");
  if (RAW.has(first)) return NextResponse.next();

  // 1. Locale prefix: /services → /{cookie | Accept-Language | rw}/services
  if (!hasLocale(first)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = hasLocale(cookieLocale) ? cookieLocale : matchLocale(request.headers.get("accept-language"));
    const legacy = Object.entries(LEGACY_REDIRECTS).find(([from]) => pathname === from || pathname.startsWith(`${from}/`));
    const path = legacy ? pathname.replace(legacy[0], legacy[1]) : pathname;
    return NextResponse.redirect(new URL(`/${locale}${path === "/" ? "" : path}${search}`, request.url));
  }

  const locale = first;
  const path = `/${rest.join("/")}`;
  const legacyHit = Object.entries(LEGACY_REDIRECTS).find(([from]) => path === from || path.startsWith(`${from}/`));
  if (legacyHit) return NextResponse.redirect(new URL(`/${locale}${path.replace(legacyHit[0], legacyHit[1])}${search}`, request.url));
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
  if (!workspace) return response; // public or auth page

  // 2. Workspace guard
  const claims = await accessClaims(request.cookies.get(ACCESS_COOKIE)?.value);
  const roles = claims ? normalizeRoles(claims as Parameters<typeof normalizeRoles>[0]) : [];
  const hasRefresh = request.cookies.has(REFRESH_COOKIE);

  if (roles.length === 0) {
    // Expired access token but a refresh cookie: let the page load; the client refreshes via /api/auth/session.
    if (hasRefresh) return response;
    // Staff workspaces sign in at /team/sign-in (spec/02 §3); clients and freelancers at /login.
    const login = new URL(`/${locale}${workspace === "client" || workspace === "work" ? "/login" : "/team/sign-in"}`, request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (!mayEnter(roles, workspace, path)) {
    return NextResponse.redirect(new URL(`/${locale}${homeFor(roles)}`, request.url));
  }
  // Staff MFA enforcement (F-IAM-05): un-enrolled staff go to setup. An absent `mfa_enrolled` claim (auth.service accessToken) fails closed in production.
  const mfa = claims?.mfa_enrolled;
  if (roles.some((r) => r.startsWith("staff:") || r === "ext:agent") && (mfa === false || (mfa === undefined && process.env.NODE_ENV === "production"))) {
    const setup = new URL(`/${locale}/team/mfa/setup`, request.url);
    setup.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(setup);
  }
  return response;
}

export const config = {
  // Skip API proxying, Next internals, metadata files and anything with a file extension (public assets).
  matcher: ["/((?!api|_next/static|_next/image|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)"],
};

// Verify the access JWT with the API's EdDSA public key (same iss/aud as core/auth/tokens.ts). Without JWT_PUBLIC_KEY
// (dummy-data mode) fall back to decoding only. Invalid/expired → null (treated as signed out).
let pub: ReturnType<typeof importSPKI> | undefined;
async function accessClaims(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null;
  const pem = process.env.JWT_PUBLIC_KEY;
  try {
    if (!pem) return decodeJwt(token);
    pub ??= importSPKI(pem.replace(/\\n/g, "\n"), "EdDSA");
    return (await jwtVerify(token, await pub, { issuer: "hebuza", audience: "hebuza-api", algorithms: ["EdDSA"] })).payload;
  } catch { return null; }
}

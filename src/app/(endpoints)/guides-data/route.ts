import { cookies } from "next/headers";
import { hasLocale } from "@/shared/i18n/config";
import { ACCESS_COOKIE, rolesFromToken } from "@/lib/auth/claims";
import { guidesFor } from "@/content/guides/workspaces";

// GET /guides-data?locale=rw → the dashboard guides this person may read (verified access cookie; sysadmins get every set).
// Signed out / expired → 401 so the panel can ask the session to refresh. Never cached: the answer depends on roles.
export async function GET(req: Request) {
  const roles = await rolesFromToken((await cookies()).get(ACCESS_COOKIE)?.value);
  if (!roles.length) return Response.json({ error: "unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const q = new URL(req.url).searchParams.get("locale");
  const locale = hasLocale(q) ? q : "en";
  return Response.json({ sets: guidesFor(roles, locale) }, { headers: { "Cache-Control": "private, no-store" } });
}

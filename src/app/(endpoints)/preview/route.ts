// CMS draft preview (F-CMS-17): the admin's preview link lands here with an encrypted token from the API.
import { cookies, draftMode } from "next/headers";
import { PREVIEW_COOKIE, previewPath } from "@/lib/marketing/cms/preview";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const r = token && process.env.API_URL
    ? await fetch(`${process.env.API_URL}/api/content/preview?token=${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null)
    : null;
  if (!r?.ok) return new Response("This preview link is not valid or has expired.", { status: 401 });
  const { data } = (await r.json()) as { data: { entry: { type: string; key: string; variants: Record<string, { slug: string } | undefined> }; lang: "rw" | "en" | "fr" } };
  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 3600 });
  return Response.redirect(new URL(previewPath(data.entry, data.lang), req.url), 303);
}

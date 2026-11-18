// Short links (/r/:code referral, /c/:code campaign): the API resolves the target and counts the click.
// Without a backend (dummy-data mode) they fall back to the home page with UTM tags.
const fallback = (kind: "r" | "c", code: string) =>
  kind === "r" ? `/?utm_source=referral&utm_medium=link&ref=${encodeURIComponent(code)}` : `/?utm_source=campaign&utm_campaign=${encodeURIComponent(code)}`;

export async function resolveLink(req: Request, kind: "r" | "c", code: string) {
  let target = fallback(kind, code);
  if (process.env.API_URL) {
    const r = await fetch(`${process.env.API_URL}/api/links/${kind}/${encodeURIComponent(code)}`, { cache: "no-store" }).catch(() => null);
    const url = r?.ok ? ((await r.json()) as { data?: { url?: string } }).data?.url : undefined;
    if (url?.startsWith("/")) target = url; // same-site targets only (no open redirect)
  }
  return Response.redirect(new URL(target, req.url), 302);
}

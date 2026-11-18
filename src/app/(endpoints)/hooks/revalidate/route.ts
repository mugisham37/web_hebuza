// CMS publish → the API (cms.revalidate job) POSTs {tags} here signed `t=<ms>,v1=HMAC-SHA256(REVALIDATE_SECRET, "t.body")`.
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const body = await req.text();
  const sig = Object.fromEntries((req.headers.get("x-revalidate-signature") ?? "").split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(sig.t);
  if (!secret || !sig.v1 || !Number.isFinite(t) || Math.abs(Date.now() - t) > 5 * 60_000) return new Response("Unauthorized", { status: 401 });
  const want = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  if (want.length !== sig.v1.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig.v1))) return new Response("Unauthorized", { status: 401 });
  const { tags } = JSON.parse(body) as { tags?: unknown };
  for (const tag of Array.isArray(tags) ? tags.filter((x): x is string => typeof x === "string").slice(0, 50) : []) revalidateTag(tag, "max");
  return Response.json({ ok: true });
}

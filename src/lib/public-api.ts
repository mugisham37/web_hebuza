import "server-only";
import { cacheLife } from "next/cache";

/**
 * Public API read for `'use cache'` functions (catalogue, CMS). 404 → null. When the API can't be reached during
 * `next build` the result is `empty` with a seconds-long cache life, so the page is regenerated on its first request
 * instead of failing the build or baking an empty page for hours; at runtime a failure throws to the error boundary.
 */
export async function publicGet<T>(path: string, empty: T): Promise<T | null> {
  const r = process.env.API_URL ? await fetch(`${process.env.API_URL}/api${path}`).catch(() => null) : null;
  if (r?.status === 404) return null;
  if (r?.ok) {
    cacheLife("hours"); // the API's cms.revalidate webhook drops the tags on publish, so hours is only a backstop
    return ((await r.json()) as { data: T }).data;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    cacheLife("seconds");
    return empty;
  }
  throw new Error(`Public API ${path} unavailable (${r?.status ?? "unreachable"})`);
}

"use client";
// Lane CONTENT data hooks (plan 10 §9.2 CMS admin + media/tracking/health). Keys under mktKeys.cms.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { mktKeys, qs } from "./api";
import type {
  BlockShape, CmsComment, CmsEntry, CmsRow, CmsType, CmsVariant, CmsVersion, KbState, Locale, MediaAsset, NavLocation, NavNode,
  NotFoundHit, PublishBlocker, Redirect, SiteSettings, TypeMeta,
} from "@/shared/marketing/types";
import { api, unwrap } from "@/lib/api/client";
import { putPresigned } from "@/lib/api/upload";
import type { components } from "@/lib/api/schema";
import { hdr } from "@/lib/marketing/api";

export type EntryDetail = CmsEntry & { kb: KbState; blockers: PublishBlocker[]; lock?: { holder: string; since: string } };
export type Tracking = { ga4Id: string; gscToken: string; adsIds: string[]; pixelId: string; sitemap: { generatedAt: string; urls: Record<Locale, number> }; events: { name: string; count: number; lastAt?: string }[] };
export type Health = { broken: { url: string; foundOn: string; entryId?: string; blockId?: string; status: number }[]; speed: { id: string; at: string; page: string; lcp: number; cls: number; inp: number }[] };
export type LandingPerf = { visits: number; starts: number; submissions: number; bySource: { source: string; visits: number; leads: number }[]; leads: { id: string; name: string; at: string }[]; events: { name: string; wired: boolean; lastAt?: string }[] };
export type KnowledgeInsights = { helpful: { entryId: string; title: string; yes: number; no: number }[]; zeroResults: { q: string; locale: Locale; n: number }[] };

const LIST_STALE = 30_000;

export const useEntries = (f: { type?: CmsType | string; status?: string; locale?: string; q?: string }) =>
  useQuery({ queryKey: mktKeys.cms("entries", f), queryFn: () => unwrap<{ items: CmsRow[]; total: number }>(api.GET("/api/admin/cms/entries", { params: { query: toQuery(qs(f)) } })), staleTime: LIST_STALE });
export const useEntry = (id: string) => useQuery({ queryKey: mktKeys.cms("entry", id), queryFn: () => unwrap<EntryDetail>(api.GET("/api/admin/cms/entries/{id}", { params: { path: { id } } })) });
export const useVersions = (id: string) => useQuery({ queryKey: mktKeys.cms("versions", id), queryFn: () => unwrap<{ items: CmsVersion[] }>(api.GET("/api/admin/cms/entries/{id}/versions", { params: { path: { id } } })) });
export const useComments = (id: string) => useQuery({ queryKey: mktKeys.cms("comments", id), queryFn: () => unwrap<{ items: CmsComment[] }>(api.GET("/api/admin/cms/entries/{id}/comments", { params: { path: { id } } })) });

/** Every CMS write: invalidates the whole cms subtree on settle. */
function useCmsMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: mktKeys.cms() }) });
}
export const useCreateEntry = () => useCmsMutation((v: { type: CmsType; locale: Locale; title: string; key?: string }) => unwrap<CmsEntry>(api.POST("/api/admin/cms/entries", { body: v })));
export const useDuplicate = () => useCmsMutation((id: string) => unwrap<CmsEntry>(api.POST("/api/admin/cms/entries/{id}/duplicate", { params: { path: { id } } })));
export const patchEntry = (id: string, body: { blocks?: BlockShape[]; meta?: TypeMeta; serviceSlugs?: string[]; tags?: string[]; aiApproved?: boolean; reviewBy?: string; serviceFacts?: boolean }, version: number) =>
  unwrap<CmsEntry>(api.PATCH("/api/admin/cms/entries/{id}", { params: { path: { id } }, body: body, headers: hdr({ ifMatch: version }) }));
export const putVariant = (id: string, lang: Locale, body: Partial<CmsVariant>, version: number) =>
  unwrap<CmsVariant>(api.PUT("/api/admin/cms/entries/{id}/variants/{lang}", { params: { path: { id, lang } }, body: body, headers: hdr({ ifMatch: version }) }));
export const lockEntry = (id: string) => unwrap<{ holder: string; since: string }>(api.POST("/api/admin/cms/entries/{id}/lock", { params: { path: { id } }, body: {} }));
export const unlockEntry = (id: string) => unwrap<null>(api.DELETE("/api/admin/cms/entries/{id}/lock", { params: { path: { id } } }));
export const previewToken = (id: string, lang: Locale) => unwrap<{ token: string; url: string; expiresAt: string }>(api.GET("/api/admin/cms/entries/{id}/preview-token", { params: { path: { id }, query: toQuery(`lang=${lang}`) } }));

export const useWorkflow = (id: string) => ({
  submit: useCmsMutation((v: { reviewerId: string; langs: Locale[] }) => unwrap(api.POST("/api/admin/cms/entries/{id}/submit", { params: { path: { id } }, body: v }))),
  approve: useCmsMutation((v: { langs: Locale[] }) => unwrap(api.POST("/api/admin/cms/entries/{id}/approve", { params: { path: { id } }, body: v }))),
  requestChanges: useCmsMutation((v: { comment: string }) => unwrap(api.POST("/api/admin/cms/entries/{id}/request-changes", { params: { path: { id } }, body: v }))),
  publish: useCmsMutation((v: { langs: Locale[]; fallback?: boolean }) => unwrap<{ tags: string[] }>(api.POST("/api/admin/cms/entries/{id}/publish", { params: { path: { id } }, body: v }))),
  schedule: useCmsMutation((v: { at: string; langs: Locale[] }) => unwrap(api.POST("/api/admin/cms/entries/{id}/schedule", { params: { path: { id } }, body: v }))),
  unschedule: useCmsMutation(() => unwrap(api.POST("/api/admin/cms/entries/{id}/unschedule", { params: { path: { id } }, body: {} }))),
  unpublish: useCmsMutation(() => unwrap(api.POST("/api/admin/cms/entries/{id}/unpublish", { params: { path: { id } }, body: {} }))),
  archive: useCmsMutation((v: { redirectTo: string }) => unwrap(api.POST("/api/admin/cms/entries/{id}/archive", { params: { path: { id } }, body: v }))),
  restore: useCmsMutation((v: { version: number; lang: Locale }) => unwrap(api.POST("/api/admin/cms/entries/{id}/restore/{version}", { params: { path: { id, version: String(v.version) }, query: toQuery(`lang=${v.lang}`) } }))),
  translate: useCmsMutation((v: { from: Locale; to: Locale }) => unwrap<CmsVariant>(api.POST("/api/admin/cms/entries/{id}/translate", { params: { path: { id } }, body: v }))),
  comment: useCmsMutation((v: { blockId?: string; body: string; language?: Locale }) => unwrap<CmsComment>(api.POST("/api/admin/cms/entries/{id}/comments", { params: { path: { id } }, body: v }))),
  resolve: useCmsMutation((v: { cid: string; resolved: boolean }) => unwrap(api.PATCH("/api/admin/cms/comments/{id}", { params: { path: { id: v.cid } }, body: { resolved: v.resolved } }))),
});

// ---- nav, settings, redirects, 404 (CMS store, lane CMS)
export const useNav = (loc: NavLocation) => useQuery({ queryKey: mktKeys.cms("nav", loc), queryFn: () => unwrap<{ items: NavNode[] }>(api.GET("/api/admin/cms/nav/{loc}", { params: { path: { loc } } })) });
export const useSaveNav = (loc: NavLocation) => useCmsMutation((items: NavNode[]) => unwrap(api.PUT("/api/admin/cms/nav/{loc}", { params: { path: { loc } }, body: { items } })));
export const useSiteSettings = () => useQuery({ queryKey: mktKeys.cms("settings"), queryFn: () => unwrap<SiteSettings>(api.GET("/api/admin/cms/site-settings")) });
export const useSaveSettings = () => useCmsMutation((s: SiteSettings) => unwrap(api.PUT("/api/admin/cms/site-settings", { body: s })));
export const useRedirects = () => useQuery({ queryKey: mktKeys.cms("redirects"), queryFn: () => unwrap<{ items: Redirect[] }>(api.GET("/api/admin/cms/redirects")) });
export const useSaveRedirect = () => useCmsMutation((r: Partial<Redirect> & { from: string; to: string }) => (r.id ? unwrap(api.PATCH("/api/admin/cms/redirects/{id}", { params: { path: { id: r.id } }, body: r })) : unwrap(api.POST("/api/admin/cms/redirects", { body: r }))));
export const useDeleteRedirect = () => useCmsMutation((id: string) => unwrap(api.DELETE("/api/admin/cms/redirects/{id}", { params: { path: { id } } })));
export const useNotFound = () => useQuery({ queryKey: mktKeys.cms("404"), queryFn: () => unwrap<{ items: NotFoundHit[] }>(api.GET("/api/admin/cms/not-found")) });

// ---- media, tracking, health (marketing.content.ts)
export const useMedia = () => useQuery({ queryKey: mktKeys.cms("media"), queryFn: () => unwrap<{ items: MediaAsset[] }>(api.GET("/api/admin/cms/media")), staleTime: LIST_STALE });
/** Presigned upload: reserve a staging PUT, send the bytes to storage, then complete (sniff + re-encode server-side). */
export const useUploadMedia = () =>
  useCmsMutation(async (v: { file: File; replaceId?: string; alt?: MediaAsset["alt"] }) => {
    const mime = v.file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
    const p = await unwrap<components["schemas"]["MediaPresignResponse"]>(api.POST("/api/admin/cms/media", { body: { filename: v.file.name, mime, size: v.file.size, alt: v.alt, replaceId: v.replaceId } }));
    await putPresigned(p.upload.url, v.file, mime);
    return unwrap<MediaAsset>(api.POST("/api/admin/cms/media/{id}/complete", { params: { path: { id: p.id } } }));
  });
export const usePatchMedia = () => useCmsMutation((v: { id: string } & Partial<MediaAsset>) => unwrap<MediaAsset>(api.PATCH("/api/admin/cms/media/{id}", { params: { path: { id: v.id } }, body: v })));
export const useDeleteMedia = () => useCmsMutation((id: string) => unwrap(api.DELETE("/api/admin/cms/media/{id}", { params: { path: { id } } })));
export const useTracking = () => useQuery({ queryKey: mktKeys.cms("tracking"), queryFn: () => unwrap<Tracking>(api.GET("/api/admin/mkt/tracking")) });
export const useSaveTracking = () => useCmsMutation((t: Pick<Tracking, "ga4Id" | "gscToken" | "adsIds" | "pixelId">) => unwrap<Tracking>(api.PUT("/api/admin/mkt/tracking", { body: t })));
export const useHealth = () => useQuery({ queryKey: mktKeys.cms("health"), queryFn: () => unwrap<Health>(api.GET("/api/admin/mkt/health")), staleTime: 5 * 60_000 });
export const useRunSpeed = () => useCmsMutation((page: string) => unwrap(api.POST("/api/admin/mkt/health/speed", { body: { page } })));
export const useLandingPerf = (id: string, range: string) => useQuery({ queryKey: mktKeys.cms("perf", id, range), queryFn: () => unwrap<LandingPerf>(api.GET("/api/admin/mkt/landing/{id}/performance", { params: { path: { id }, query: toQuery(qs({ range })) } })), staleTime: 5 * 60_000 });
export const useKnowledgeInsights = () => useQuery({ queryKey: mktKeys.cms("kinsights"), queryFn: () => unwrap<KnowledgeInsights>(api.GET("/api/admin/mkt/knowledge/insights")), staleTime: 5 * 60_000 });

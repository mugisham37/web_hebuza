import { api, unwrap } from "@/lib/api/client";
import { putPresigned } from "@/lib/api/upload";
import type { components } from "@/lib/api/schema";

type Upload = { url: string; key: string; expiresAt: string };
type LibMime = components["schemas"]["LibUploadDto"]["mime"];
type LibMeta = Omit<components["schemas"]["LibUploadDto"], "filename" | "mime" | "size">;

/** Library upload: declare → PUT bytes to the presigned URL → confirm so scanning/finalize runs now. */
export async function uploadLibraryDoc(file: File, meta: LibMeta = {}) {
  const mime = (file.type || "application/octet-stream") as LibMime; // server rejects unsupported types (422)
  const doc = await unwrap<LibDoc & { upload: Upload }>(api.POST("/api/me/documents", { body: { filename: file.name, mime, size: file.size, ...meta } }));
  await putPresigned(doc.upload.url, file, mime);
  await unwrap(api.POST("/api/documents/{id}/complete", { params: { path: { id: doc.documentId } } }));
  return doc;
}

type CaseMeta = Pick<components["schemas"]["CaseUploadDto"], "need_id" | "requirement_key">;

/** Case document upload: declare on the request → PUT bytes → confirm. */
export async function uploadCaseDoc(code: string, file: File, meta: CaseMeta = {}) {
  const mime = (file.type || "application/octet-stream") as LibMime; // server rejects unsupported types (422)
  const u = await unwrap<{ id: string; code: string; upload: Upload }>(api.POST("/api/applications/{code}/documents", { params: { path: { code } }, body: { filename: file.name, mime, size: file.size, ...meta } }));
  await putPresigned(u.upload.url, file, mime);
  await unwrap(api.POST("/api/documents/{id}/complete", { params: { path: { id: u.id } } }));
  return u;
}

/** Library item from GET /api/me/documents, plus the spec's ★ expiresOn. */
export type LibDoc = components["schemas"]["ClientDocumentItemResponse"] & {
  expiresOn?: string | null;
};

export const REF = /^HBZ-[A-Z0-9]{6}$/;

export function daysUntil(date: string, now = Date.now()) {
  return Math.ceil((new Date(date).getTime() - now) / 86_400_000);
}

export const kb = (bytes: number) =>
  `${Math.max(1, Math.round(bytes / 1024))} KB`;

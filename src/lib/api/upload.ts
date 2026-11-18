// Direct-to-storage upload: ask the API for a presigned PUT (POST /api/uploads), send the bytes straight to object
// storage, return the stable same-origin href (/api/files/:id/:name → short-lived signed URL). Bytes never cross the API.
import { api, ApiError, unwrap } from "./client";

export type Uploaded = { id: string; href: string; name: string; mime: string; size: number };
type Presigned = Uploaded & { upload: { url: string; key: string; expiresAt: string } };

/** PUT the bytes to a presigned URL; shared by every upload flow (library, case docs, chat, field, work). */
export async function putPresigned(url: string, file: Blob, contentType: string) {
  const r = await fetch(url, { method: "PUT", body: file, headers: { "content-type": contentType } });
  if (!r.ok) throw new ApiError(r.status, "upload_failed", "Upload failed. Please try again.", null);
}

export async function uploadFile(file: Blob, purpose: string, name = (file as File).name ?? "upload"): Promise<Uploaded> {
  const contentType = file.type || "application/octet-stream";
  const p = await unwrap<Presigned>(
    api.POST("/api/uploads", { body: { purpose, name, contentType, size: file.size } }),
  );
  await putPresigned(p.upload.url, file, contentType);
  const { upload: _, ...out } = p;
  return out;
}

/** MIME types the API accepts for uploads (UploadIn.mime); anything else is rejected server-side with 422. */
export type UploadMime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/heic";
export const asMime = (t: string) => t as UploadMime;

/** Display name from an upload href. */
export const uploadName = (href: string) => decodeURIComponent(href.split("/").pop() ?? href);

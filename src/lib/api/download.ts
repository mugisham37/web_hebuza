// Same-origin file download (statements, exports, transcripts): cookies ride along, bytes saved via a blob link.
import { ApiError } from "./client";

export async function download(path: string, name: string) {
  const r = await fetch(path, { credentials: "include" });
  if (!r.ok) throw new ApiError(r.status, "download_failed", r.statusText || "Download failed", r.headers.get("x-request-id"));
  const url = URL.createObjectURL(await r.blob());
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

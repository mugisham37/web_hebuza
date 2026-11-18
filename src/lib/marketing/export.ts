// Pure CSV/export helpers live in @/shared/marketing/export; this adds the browser download (web only).
export * from "@/shared/marketing/export";

/** Browser download of a CSV string. */
export function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

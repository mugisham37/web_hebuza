// C09–C11 mocks. /api/me/documents* and /api/me/subscription follow schema.d.ts; the rest are spec ★ endpoints
// (deliverables-and-review §11, documents §11) or assumed FIN client endpoints, not on the server yet.
// Placeholder data only. Upload a file named "dup.pdf" → 409 duplicate; label "fail" → 500.
import { http, HttpResponse, delay } from "msw";
import { unverifiedGate } from "./handlers-auth";
import type { LibDoc } from "@/components/molecules/client/api";
import type { DlvGroup } from "@/components/organisms/client/deliverables";
import type { Invoice, PayMethod, Quote, Receipt } from "@/components/organisms/client/billing";

const ok = <T,>(data: T) => HttpResponse.json({ success: true, message: "OK", errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json({ success: false, message, errorType, data: null }, { status });

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const ver = (v: number, name: string, at: string, size = 245_000) => ({ version: v, originalFilename: name, mimeType: "image/png", fileSizeBytes: size, uploadedAt: at });
const doc = (id: string, label: string, kind: string, at: string, extra: Partial<LibDoc> = {}): LibDoc => ({
  documentId: id, originalFilename: `${id}.png`, label, kind, mimeType: "image/png", fileSizeBytes: 245_000,
  currentVersion: 1, createdAt: at, updatedAt: at, previewable: true, usedIn: [], versions: [ver(1, `${id}.png`, at)], expiresOn: null, ...extra,
});

let docs: LibDoc[] = [
  doc("doc-id", "National ID card", "identity", day(-30), { expiresOn: day(900).slice(0, 10) }),
  doc("doc-rdb", "Business registration certificate", "company", day(-5), {
    currentVersion: 2, expiresOn: day(20).slice(0, 10),
    versions: [ver(2, "doc-rdb.png", day(-5)), ver(1, "doc-rdb-old.png", day(-8), 198_000)],
    usedIn: [{ code: "HBZ-WMVX19", serviceName: "VAT registration", applicationDocumentId: "ad-1", requirementKey: "rdb", version: 2, isCurrent: true, qcStatus: "accepted", status: "in_progress" }],
  }),
  doc("doc-tax", "Tax clearance certificate", "tax", day(-60), { expiresOn: day(-3).slice(0, 10) }),
];

let dlv: DlvGroup[] = [
  { code: "HBZ-K2M9QA", service: "Company registration", state: "ready", step: 5, totalSteps: 5, review: null, files: [
    { id: "dl-1", title: "Certificate of incorporation.pdf", mime: "image/svg+xml", sizeBytes: 324_000, version: 1, issuedAt: day(-1), issuer: "RDB" },
    { id: "dl-2", title: "TIN certificate.pdf", mime: "image/svg+xml", sizeBytes: 198_000, version: 1, issuedAt: day(-1), issuer: "RDB" },
  ] },
  { code: "HBZ-ACTN01", service: "Trademark filing", state: "locked", step: 4, totalSteps: 5, balance: 5000, currency: "RWF", files: [
    { id: "dl-3", title: "Trademark filing receipt.pdf", mime: "image/svg+xml", sizeBytes: 120_000, version: 1, issuedAt: day(-2), issuer: null },
  ] },
  { code: "HBZ-WMVX19", service: "VAT registration", state: "in_progress", step: 3, totalSteps: 5, expectedAt: day(4), files: [] },
];

const invoices: Invoice[] = [
  { number: "INV-2026-00431", service: "VAT registration", requestCode: "HBZ-WMVX19", issuedAt: day(-1), dueAt: day(5), amount: 3000, currency: "RWF", status: "due" },
  { number: "INV-2026-00425", service: "Trademark filing", requestCode: "HBZ-ACTN01", issuedAt: day(-20), dueAt: day(-6), amount: 5000, currency: "RWF", status: "overdue" },
  { number: "INV-2026-00412", service: "Business licence", issuedAt: day(-30), dueAt: day(-25), amount: 45000, currency: "RWF", status: "paid" },
  { number: "INV-2026-00387", service: "Tax compliance", issuedAt: day(-40), dueAt: day(-35), amount: 28000, currency: "RWF", status: "refund_pending", refundAmount: 8000 },
];
const receipts: Receipt[] = [
  { number: "RCT-2026-00198", invoiceNumber: "INV-2026-00412", paidAt: day(-26), amount: 45000, currency: "RWF", method: "MTN MoMo" },
  { number: "RCT-2026-00171", invoiceNumber: "INV-2026-00387", paidAt: day(-36), amount: 28000, currency: "RWF", method: "Card" },
];
let quotes: Quote[] = [
  { number: "QT-2026-0057", service: "Annual audit", issuedAt: day(-2), expiresAt: day(12), amount: 150000, currency: "RWF", status: "pending", note: "Placeholder scope: financial statements for one year." },
  { number: "QT-2026-0049", service: "Work permit", issuedAt: day(-20), expiresAt: day(-5), amount: 60000, currency: "RWF", status: "expired" },
];
let methods: PayMethod[] = [
  { id: "pm-1", kind: "momo", label: "MTN MoMo", last4: "0000", primary: true },
  { id: "pm-2", kind: "card", label: "Visa", last4: "4242", primary: false },
];

const SVG = (title: string) =>
  new HttpResponse(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fff"/><text x="300" y="120" font-family="sans-serif" font-size="28" text-anchor="middle">${title.replace(/[<&]/g, "")}</text>${Array.from({ length: 14 }, (_, i) => `<rect x="80" y="${200 + i * 32}" width="${440 - (i % 3) * 60}" height="10" fill="#ddd"/>`).join("")}</svg>`,
    { headers: { "content-type": "image/svg+xml" } },
  );
const find = (id: unknown) => docs.find((d) => d.documentId === id);

export const handlers = [
  http.get("/api/me/documents", async () => { await delay(300); return ok({ documents: docs }); }),
  http.post("/api/me/documents", async ({ request }) => {
    await delay(900);
    const fd = await request.formData();
    const file = fd.get("file") as File;
    if (fd.get("label") === "fail") return fail(500, "server_error", "Upload failed.");
    if (file.name === "dup.pdf" && fd.get("allowDuplicate") !== "true") return fail(409, "duplicate", "Possible duplicate.");
    const now = new Date().toISOString();
    const d = doc(`doc-${Date.now()}`, String(fd.get("label") || file.name), String(fd.get("kind") || ""), now, {
      originalFilename: file.name, mimeType: file.type || "application/octet-stream", fileSizeBytes: file.size,
      versions: [{ version: 1, originalFilename: file.name, mimeType: file.type, fileSizeBytes: file.size, uploadedAt: now }],
    });
    docs = [d, ...docs];
    return ok(d);
  }),
  http.patch("/api/me/documents/:id", async ({ params, request }) => {
    const d = find(params.id);
    if (!d) return fail(404, "not_found", "Not found.");
    Object.assign(d, (await request.json()) as Partial<LibDoc>);
    return ok(d);
  }),
  http.delete("/api/me/documents/:id", async ({ params }) => {
    await delay(300);
    const d = find(params.id);
    if (d?.usedIn?.some((u) => u.status === "in_progress")) return fail(409, "in_use", "Attached to an open request.");
    docs = docs.filter((x) => x !== d);
    return ok({ deleted: true });
  }),
  http.post("/api/me/documents/:id/attach", async ({ params, request }) => {
    const d = find(params.id);
    const { code } = (await request.json()) as { code: string };
    if (!d) return fail(404, "not_found", "Not found.");
    d.usedIn = [...(d.usedIn ?? []), { code, serviceName: "Request", applicationDocumentId: `ad-${Date.now()}`, requirementKey: "other", version: d.currentVersion, isCurrent: true, qcStatus: "pending", status: "in_progress" }];
    return ok(d);
  }),
  http.get("/api/me/documents/:id/download", ({ params }) => SVG(find(params.id)?.label ?? "Document")),

  http.get("/api/me/deliverables", async () => { await delay(300); return ok({ requests: dlv }); }),
  http.get("/api/deliverables/:id/preview", ({ params }) => SVG(String(params.id))),
  http.get("/api/deliverables/:id/download", ({ params }) =>
    unverifiedGate() ?? (dlv.some((g) => g.state === "ready" && g.files.some((f) => f.id === params.id)) ? SVG(String(params.id)) : fail(403, "forbidden", "Not released."))),
  http.post("/api/deliverables/:id/receipt", async ({ params, request }) => {
    const { ok: good } = (await request.json()) as { ok: boolean };
    dlv = dlv.map((g) => (g.files.some((f) => f.id === params.id) ? { ...g, review: good ? "accepted" : "changes_requested" } : g));
    return ok({ recorded: true });
  }),

  http.post("/api/me/deliverables/:code/rating", async ({ params, request }) => {
    const { stars } = (await request.json()) as { stars: number };
    if (!(stars >= 1 && stars <= 5)) return fail(422, "validation", "Rating must be 1–5.");
    dlv = dlv.map((g) => (g.code === params.code ? { ...g, rating: stars } : g));
    return ok({ recorded: true });
  }),

  http.get("/api/me/quotations", async () => { await delay(300); return ok({ quotations: quotes }); }),
  http.post("/api/me/quotations/:no/:action", async ({ params, request }) => {
    await delay(400);
    const q = quotes.find((x) => x.number === params.no);
    if (!q) return fail(404, "not_found", "Not found.");
    if (q.status !== "pending") return fail(409, "conflict", "This quotation can no longer be changed.");
    const { reason } = (await request.json().catch(() => ({}))) as { reason?: string };
    if (params.action === "decline" && !reason?.trim()) return fail(422, "validation", "A reason is required.");
    quotes = quotes.map((x) => (x === q ? { ...q, status: params.action === "accept" ? "accepted" : "declined" } : x));
    return ok({ updated: true });
  }),

  http.get("/api/me/invoices", async () => { await delay(300); return ok({ invoices, creditBalance: 0 }); }),
  http.get("/api/me/receipts", async () => { await delay(300); return ok({ receipts }); }),
  http.get("/api/me/subscription", () => ok({ enrolled: false, status: "none" })),
  http.get("/api/me/payment-methods", async () => { await delay(200); return ok({ methods }); }),
  http.delete("/api/me/payment-methods/:id", ({ params }) => { methods = methods.filter((m) => m.id !== params.id); return ok({ deleted: true }); }),
];

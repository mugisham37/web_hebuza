// MSW handlers: public catalogue, plans, public settings, admin catalogue mutations, document vaults (shared/my/papers)
// and client application helpers. Catalogue data = src/content/seed (same snapshot the public pages render).
import { http, HttpResponse, delay } from "msw";
import seedServices from "@/content/seed/services.json";
import seedPlans from "@/content/seed/plans.json";
import seedDetails from "@/content/seed/service-details.json";

const ok = <T>(data: T, message = "OK") =>
  HttpResponse.json({ success: true, message, errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );
const file = (name: string, type = "application/pdf") =>
  new HttpResponse(`Demo file: ${name}`, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${name}"`,
    },
  });
const now = () => new Date().toISOString();
const day = (d: number) => new Date(Date.now() + d * 864e5).toISOString();
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

// ---- catalogue (module state so admin edits show on public reads in-session)
type Row = Record<string, unknown>;
type Svc = Row & {
  slug: string;
  status: string;
  category_ref: Row | null;
  subcategory_ref: Row | null;
};
const SERVICES: Svc[] = structuredClone(
  (seedServices as unknown as { data: { services: Svc[] } }).data.services,
);
const DETAILS = seedDetails as Record<string, Row>;
const uniq = (rows: (Row | null)[]) => [
  ...new Map(rows.filter(Boolean).map((r) => [r!.id as string, r!])).values(),
];
const CATEGORIES: Row[] = uniq(SERVICES.map((s) => s.category_ref));
const SUBCATEGORIES: Row[] = uniq(SERVICES.map((s) => s.subcategory_ref));
const isPublic = (s: Svc) => s.status === "published" || s.status === "paused";
const detail = (s: Svc) => ({
  description: null,
  description_rw: null,
  description_en: null,
  description_fr: null,
  steps: [],
  requirements: [],
  ...DETAILS[s.slug],
  ...s,
});
const withCounts = (c: Row) => ({
  ...c,
  service_count: SERVICES.filter((s) => s.category_ref?.id === c.id).length,
  subcategory_count: SUBCATEGORIES.filter((x) => x.category_id === c.id).length,
});

const PLANS = structuredClone(
  (seedPlans as unknown as { data: { plans: Row[] } }).data.plans,
);
const DEADLINES: Record<string, { mode: string; rules: Row[] }> = {};

// ---- document vaults
type Shared = {
  documentId: string;
  title: string;
  description: string | null;
  originalFilename: string;
  sizeBytes: number;
  fromAdmin: boolean;
  uploadedByName: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  uploadedAt: string;
};
const shared = (
  title: string,
  fn: string,
  fromAdmin: boolean,
  status = "pending",
  d = -3,
): Shared => ({
  documentId: uid("sd"),
  title,
  description: null,
  originalFilename: fn,
  sizeBytes: 184_000,
  fromAdmin,
  uploadedByName: fromAdmin ? "Hebuza Ops" : "Aline Uwase",
  status,
  reviewNote: null,
  reviewedAt: null,
  uploadedAt: day(d),
});
const MEMBERS: Record<
  string,
  { memberName: string; memberRole: string; documents: Shared[] }
> = {
  "mock-client": {
    memberName: "Aline Uwase",
    memberRole: "client",
    documents: [
      shared(
        "National ID (front & back)",
        "national-id.pdf",
        false,
        "accepted",
        -12,
      ),
      shared("RDB certificate", "rdb-certificate.pdf", false),
      shared(
        "Signed engagement letter",
        "engagement-letter.pdf",
        true,
        "accepted",
        -5,
      ),
    ],
  },
};
const member = (id: string) =>
  (MEMBERS[id] ??= {
    memberName: "Member",
    memberRole: "client",
    documents: [],
  });
const sharedOut = (id: string) => ({ memberId: id, ...member(id) });
const MY_ID = "me";
const PAPER_KINDS = [
  "rdb_certificate",
  "tin_certificate",
  "bank_details",
  "signed_agreement",
];
const PAPERS = PAPER_KINDS.map((kind, i) => ({
  kind,
  documentId: i < 2 ? uid("pp") : null,
  originalFilename: i < 2 ? `${kind}.pdf` : null,
  fileSizeBytes: i < 2 ? 120_000 : null,
  uploadedAt: i < 2 ? day(-20) : null,
  uploadedByName: i < 2 ? "Partner admin" : null,
  status: i === 0 ? "accepted" : i === 1 ? "pending" : "missing",
  reviewNote: null as string | null,
  reviewedAt: i === 0 ? day(-18) : null,
}));
const papersOut = () => ({
  partnerId: "mock-partner",
  orgName: "Kigali Legal Partners",
  documents: PAPERS,
  papersStatus: PAPERS.every((p) => p.status === "accepted")
    ? "complete"
    : PAPERS.some((p) => p.status === "missing")
      ? "incomplete"
      : "in_review",
});

type AppDoc = {
  document_id: string;
  application_id: string;
  requirement_key: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_by: string | null;
  uploaded_by_role: string;
  version: number;
  qc_status: string;
  qc_notes: null;
  is_active: boolean;
  created_at: string;
  vault_document_id: string | null;
  vault_version: number | null;
  source: string;
  vault_label: string | null;
  vault_saved_at: string | null;
};
const APP_DOCS: Record<string, AppDoc[]> = {};
const appDoc = (
  code: string,
  key: string,
  fn: string,
  vault: string | null = null,
): AppDoc => ({
  document_id: uid("ad"),
  application_id: code,
  requirement_key: key,
  original_filename: fn,
  mime_type: "application/pdf",
  file_size_bytes: 210_000,
  uploaded_by: "mock-client",
  uploaded_by_role: "client",
  version: 1,
  qc_status: "pending",
  qc_notes: null,
  is_active: true,
  created_at: now(),
  vault_document_id: vault,
  vault_version: vault ? 1 : null,
  source: vault ? "vault" : "upload",
  vault_label: vault ? fn : null,
  vault_saved_at: vault ? now() : null,
});
const appDocs = (code: string) =>
  (APP_DOCS[code] ??= [appDoc(code, "national_id", "national-id.pdf")]);
const CANCELLED = new Set<string>();

/** Looks up the vault doc via the existing /api/me/documents mock so ids agree with the library screen. */
const vaultDoc = async (id: string) => {
  const r = await fetch("/api/me/documents")
    .then((x) => x.json())
    .catch(() => null);
  return (
    ((r?.data?.documents ?? []) as Row[]).find((d) => d.documentId === id) ??
    null
  );
};
const formFile = async (request: Request) => {
  const fd = await request.formData();
  const f = fd.get("file");
  return { fd, f: f instanceof File ? f : null };
};

type P = { params: Record<string, unknown>; request: Request };
const taxonomy = (list: Row[]) => ({
  create: async ({ request }: P) => {
    const b = (await request.json()) as Row;
    if (!b.slug || !b.name_en)
      return fail(422, "validation", "Name and slug are required.");
    if (list.some((x) => x.slug === b.slug))
      return fail(409, "conflict", "Slug already in use.");
    const r = {
      description: null,
      icon: null,
      color: null,
      sort_order: list.length,
      is_active: true,
      ...b,
      id: uid("scat"),
    };
    list.push(r);
    return ok(r, "Created.");
  },
  patch: async ({ params, request }: P) => {
    const r = list.find((x) => x.id === params.id);
    if (!r) return fail(404, "not_found", "Not found.");
    Object.assign(r, (await request.json()) as Row);
    return ok(r);
  },
  remove: ({ params }: P) => {
    const i = list.findIndex((x) => x.id === params.id);
    if (i < 0) return fail(404, "not_found", "Not found.");
    if (
      SERVICES.some(
        (s) =>
          s.category_ref?.id === params.id ||
          s.subcategory_ref?.id === params.id,
      )
    )
      return fail(409, "conflict", "Still used by services.");
    list.splice(i, 1);
    return ok({ id: params.id, deleted: true });
  },
});
const CAT = taxonomy(CATEGORIES);
const SUB = taxonomy(SUBCATEGORIES);

export const handlers = [
  // ---- public catalogue
  http.get("*/api/services", () =>
    ok({ services: SERVICES.filter(isPublic) }, "Services retrieved."),
  ),
  http.get("*/api/services/:slug", ({ params }) => {
    const s = SERVICES.find((x) => x.slug === params.slug && isPublic(x));
    return s
      ? ok(detail(s), "Service retrieved.")
      : fail(404, "not_found", "Service not found.");
  }),
  http.get("*/api/service-categories", () =>
    ok({
      categories: CATEGORIES.filter((c) => c.is_active !== false).map(
        withCounts,
      ),
    }),
  ),
  http.get("*/api/service-subcategories", () =>
    ok({ subcategories: SUBCATEGORIES.filter((c) => c.is_active !== false) }),
  ),
  http.get("*/api/plans", () =>
    ok(
      { plans: PLANS.filter((p) => p.isActive && p.isPublic) },
      "Plans retrieved.",
    ),
  ),
  http.get("*/api/plans/:id", ({ params }) => {
    const plan = PLANS.find((p) => p.planId === params.id);
    if (!plan) return fail(404, "not_found", "Plan not found.");
    const reason = plan.archivedAt
      ? "archived"
      : !plan.isActive
        ? "inactive"
        : plan.kind === "trial"
          ? "trial"
          : plan.kind === "free"
            ? "free"
            : null;
    return ok({ plan, purchasable: !reason, unavailableReason: reason });
  }),
  http.get("*/api/me/subscription/plans", () =>
    ok({ plans: PLANS.filter((p) => p.isActive && p.kind === "paid") }),
  ),
  http.get("*/api/platform/public-settings", () =>
    ok(
      {
        paymentsEnabled: true,
        guestApps: true,
        acceptNewApps: true,
        maintenanceMode: false,
      },
      "Public settings retrieved.",
    ),
  ),

  // ---- admin categories / subcategories
  // shortcut: GET lists live in handlers-ops-e (own state), so creates here don't show there; merge worlds when ops-e exports its state.
  http.post("*/api/admin/service-categories", CAT.create),
  http.patch("*/api/admin/service-categories/:id", CAT.patch),
  http.delete("*/api/admin/service-categories/:id", CAT.remove),
  http.post("*/api/admin/service-subcategories", SUB.create),
  http.patch("*/api/admin/service-subcategories/:id", SUB.patch),
  http.delete("*/api/admin/service-subcategories/:id", SUB.remove),

  // ---- admin services
  http.patch(
    "*/api/admin/services/:slug/status",
    async ({ params, request }) => {
      const s = SERVICES.find((x) => x.slug === params.slug);
      if (!s) return fail(404, "not_found", "Service not found.");
      s.status = ((await request.json()) as { status: string }).status;
      return ok(detail(s));
    },
  ),
  http.get("*/api/admin/services/:slug/deadlines", ({ params }) => {
    const slug = String(params.slug);
    const d = DEADLINES[slug] ?? { mode: "none", rules: [] };
    return ok({ serviceId: `svc-${slug}`, slug, ...d });
  }),
  http.put(
    "*/api/admin/services/:slug/deadlines",
    async ({ params, request }) => {
      const slug = String(params.slug);
      const b = (await request.json()) as { mode: string; rules?: Row[] };
      if (!["none", "calendar", "admin"].includes(b.mode))
        return fail(422, "validation", "Invalid mode.");
      DEADLINES[slug] = {
        mode: b.mode,
        rules: (b.rules ?? []).map((r) => ({
          active: true,
          remindOffsets: [],
          ...r,
          id: (r.id as string) ?? uid("dl"),
          nextDates: [day(30).slice(0, 10)],
        })),
      };
      return ok({ serviceId: `svc-${slug}`, slug, ...DEADLINES[slug] });
    },
  ),
  http.patch("*/api/admin/services/:slug", async ({ params, request }) => {
    const s = SERVICES.find((x) => x.slug === params.slug);
    if (!s) return fail(404, "not_found", "Service not found.");
    Object.assign(s, (await request.json()) as Row);
    return ok(detail(s));
  }),
  http.delete("*/api/admin/services/:slug", ({ params }) => {
    const s = SERVICES.find((x) => x.slug === params.slug);
    if (!s) return fail(404, "not_found", "Service not found.");
    s.status = "archived";
    return ok({
      slug: s.slug,
      service_id: s.service_id as string,
      status: s.status,
    });
  }),

  // ---- shared documents (admin ↔ member) and the admin's own vault
  http.get("*/api/admin/shared-documents/pending", () =>
    ok({
      pending: Object.values(MEMBERS)
        .flatMap((m) => m.documents)
        .filter((d) => !d.fromAdmin && d.status === "pending").length,
    }),
  ),
  http.get("*/api/admin/my-documents", () => ok(sharedOut(MY_ID))),
  http.post("*/api/admin/my-documents", async ({ request }) => {
    const { fd, f } = await formFile(request);
    if (!f) return fail(422, "validation", "file is required");
    member(MY_ID).documents.unshift({
      ...shared(String(fd.get("title") || f.name), f.name, true, "accepted", 0),
      sizeBytes: f.size,
      description: (fd.get("description") as string) || null,
    });
    return ok(sharedOut(MY_ID), "Uploaded.");
  }),
  http.get("*/api/admin/my-documents/:doc/file", ({ params }) =>
    file(
      member(MY_ID).documents.find((d) => d.documentId === params.doc)
        ?.originalFilename ?? "document.pdf",
    ),
  ),
  http.delete("*/api/admin/my-documents/:doc", ({ params }) => {
    const m = member(MY_ID);
    m.documents = m.documents.filter((d) => d.documentId !== params.doc);
    return ok(sharedOut(MY_ID));
  }),
  http.get("*/api/admin/shared-documents/:member", ({ params }) =>
    ok(sharedOut(String(params.member))),
  ),
  http.post(
    "*/api/admin/shared-documents/:member",
    async ({ params, request }) => {
      const { fd, f } = await formFile(request);
      if (!f || !fd.get("title"))
        return fail(422, "validation", "title and file are required");
      member(String(params.member)).documents.unshift({
        ...shared(String(fd.get("title")), f.name, true, "accepted", 0),
        sizeBytes: f.size,
        description: (fd.get("description") as string) || null,
      });
      return ok(sharedOut(String(params.member)), "Uploaded.");
    },
  ),
  http.post(
    "*/api/admin/shared-documents/:member/:doc/review",
    async ({ params, request }) => {
      const d = member(String(params.member)).documents.find(
        (x) => x.documentId === params.doc,
      );
      if (!d) return fail(404, "not_found", "Document not found.");
      const b = (await request.json()) as {
        status: string;
        note?: string | null;
      };
      if (!["accepted", "rejected"].includes(b.status))
        return fail(422, "validation", "Invalid status.");
      Object.assign(d, {
        status: b.status,
        reviewNote: b.note ?? null,
        reviewedAt: now(),
      });
      return ok(sharedOut(String(params.member)));
    },
  ),
  http.get("*/api/admin/shared-documents/:member/:doc/file", ({ params }) =>
    file(
      member(String(params.member)).documents.find(
        (d) => d.documentId === params.doc,
      )?.originalFilename ?? "document.pdf",
    ),
  ),
  http.delete("*/api/admin/shared-documents/:member/:doc", ({ params }) => {
    const m = member(String(params.member));
    m.documents = m.documents.filter((d) => d.documentId !== params.doc);
    return ok(sharedOut(String(params.member)));
  }),

  // ---- client side of shared documents ("mock-client" = the demo client persona)
  http.get("*/api/me/shared-documents", () => ok(sharedOut("mock-client"))),
  http.post("*/api/me/shared-documents", async ({ request }) => {
    const { fd, f } = await formFile(request);
    if (!f) return fail(422, "validation", "file is required");
    if (f.size > 10 * 1024 * 1024)
      return fail(413, "too_large", "File too large.");
    member("mock-client").documents.unshift({
      ...shared(String(fd.get("title") || f.name), f.name, false, "pending", 0),
      sizeBytes: f.size,
    });
    return ok(sharedOut("mock-client"), "Uploaded.");
  }),
  http.get("*/api/me/shared-documents/:doc/file", ({ params }) =>
    file(
      member("mock-client").documents.find((d) => d.documentId === params.doc)
        ?.originalFilename ?? "document.pdf",
    ),
  ),
  http.delete("*/api/me/shared-documents/:doc", ({ params }) => {
    const m = member("mock-client");
    const d = m.documents.find((x) => x.documentId === params.doc);
    if (!d) return fail(404, "not_found", "Document not found.");
    if (d.fromAdmin)
      return fail(
        403,
        "forbidden",
        "Documents shared by Hebuza can't be removed.",
      );
    m.documents = m.documents.filter((x) => x !== d);
    return ok(sharedOut("mock-client"));
  }),

  // ---- partner papers
  http.get("*/api/me/papers", () => ok(papersOut())),
  http.post("*/api/me/papers", async ({ request }) => {
    const { fd, f } = await formFile(request);
    const p = PAPERS.find((x) => x.kind === fd.get("kind"));
    if (!f || !p) return fail(422, "validation", "kind and file are required");
    Object.assign(p, {
      documentId: uid("pp"),
      originalFilename: f.name,
      fileSizeBytes: f.size,
      uploadedAt: now(),
      uploadedByName: "You",
      status: "pending",
      reviewNote: null,
      reviewedAt: null,
    });
    return ok(papersOut(), "Uploaded.");
  }),
  http.get("*/api/me/papers/:doc/file", ({ params }) =>
    file(
      PAPERS.find((p) => p.documentId === params.doc)?.originalFilename ??
        "paper.pdf",
    ),
  ),

  // ---- client vault extras (list/patch/delete live in handlers-c3)
  http.get("*/api/me/documents/kinds", () =>
    ok({
      kinds: [
        "national_id",
        "passport",
        "birth_certificate",
        "marriage_certificate",
        "tin_certificate",
        "rdb_certificate",
        "company_statutes",
        "proof_of_address",
        "bank_statement",
        "photo",
        "diploma",
        "driving_license",
        "other",
      ],
    }),
  ),
  http.get("*/api/me/documents/:id", async ({ params }) => {
    const d = await vaultDoc(String(params.id));
    return d ? ok(d) : fail(404, "not_found", "Document not found.");
  }),
  http.post("*/api/me/documents/:id/replace", async ({ params, request }) => {
    const d = await vaultDoc(String(params.id));
    const { f } = await formFile(request);
    if (!d) return fail(404, "not_found", "Document not found.");
    if (!f) return fail(422, "validation", "file is required");
    // shortcut: echo only — c3's list keeps the old version; share state when c3 exports its docs.
    const v = Number(d.currentVersion ?? 1) + 1;
    const ver = {
      version: v,
      originalFilename: f.name,
      mimeType: f.type || "application/octet-stream",
      fileSizeBytes: f.size,
      uploadedAt: now(),
    };
    return ok({
      ...d,
      originalFilename: f.name,
      mimeType: ver.mimeType,
      fileSizeBytes: f.size,
      currentVersion: v,
      updatedAt: ver.uploadedAt,
      versions: [ver, ...((d.versions as Row[]) ?? [])],
    });
  }),
  http.get("*/api/documents/:id", ({ params }) =>
    file(
      Object.values(APP_DOCS)
        .flat()
        .find((d) => d.document_id === params.id)?.original_filename ??
        "document.pdf",
    ),
  ),

  // ---- client application helpers
  http.get("*/api/applications/lookup", ({ request }) => {
    const code = new URL(request.url).searchParams
      .get("code")
      ?.trim()
      .toUpperCase();
    if (!code || !/^[A-Z0-9-]{4,}$/.test(code))
      return fail(404, "not_found", "No application with that code.");
    return ok({
      code,
      serviceName: (SERVICES[0]?.name as string) ?? "Service",
      submittedDate: day(-4).slice(0, 10),
      status: CANCELLED.has(code) ? "cancelled" : "in_progress",
    });
  }),
  http.get("*/api/applications/summary", () =>
    ok({
      unreadCount: 2,
      actionCount: 1,
      activeCount: 3,
      completedCount: 5,
      docCount: 7,
      docSizeMB: 4.2,
      avgTurnaround: 3.5,
      subscriptionStatus: "none",
      planName: null,
      dedicatedAgentName: null,
      periodEnd: null,
    }),
  ),
  http.post("*/api/applications/:code/cancel", ({ params }) => {
    CANCELLED.add(String(params.code));
    return ok(null, "Application cancelled.");
  }),
  http.get("*/api/applications/:code/documents", ({ params }) =>
    ok({ documents: appDocs(String(params.code)).filter((d) => d.is_active) }),
  ),
  http.post(
    "*/api/applications/:code/documents/reference",
    async ({ params, request }) => {
      await delay(200);
      const b = (await request.json()) as {
        vaultDocumentId: string;
        requirementKey: string;
      };
      if (!b.vaultDocumentId || !b.requirementKey)
        return fail(
          422,
          "validation",
          "vaultDocumentId and requirementKey are required.",
        );
      const v = await vaultDoc(b.vaultDocumentId);
      const d = appDoc(
        String(params.code),
        b.requirementKey,
        (v?.originalFilename as string) ?? "document.pdf",
        b.vaultDocumentId,
      );
      appDocs(String(params.code)).push(d);
      return ok(d);
    },
  ),
  http.post(
    "*/api/applications/:code/documents/reference-batch",
    async ({ params, request }) => {
      const b = (await request.json()) as {
        items: { vaultDocumentId: string; requirementKey: string }[];
      };
      if (!b.items?.length || b.items.length > 30)
        return fail(422, "validation", "1–30 items required.");
      const added = await Promise.all(
        b.items.map(async (i) =>
          appDoc(
            String(params.code),
            i.requirementKey,
            ((await vaultDoc(i.vaultDocumentId))?.originalFilename as string) ??
              "document.pdf",
            i.vaultDocumentId,
          ),
        ),
      );
      appDocs(String(params.code)).push(...added);
      return ok({ documents: added });
    },
  ),
  http.delete("*/api/applications/:code/documents/:doc", ({ params }) => {
    const d = appDocs(String(params.code)).find(
      (x) => x.document_id === params.doc,
    );
    if (!d) return fail(404, "not_found", "Document not found.");
    d.is_active = false;
    return ok(null, "Removed.");
  }),
];

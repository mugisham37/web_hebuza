"use client";
// Lane E data layer: U16–U17 catalogue + service builder, U17 sub-statuses.
// Real contracts: /api/admin/services*, /structure/{draft,publish,published,versions,…}, /pricing*, service-(sub)categories.
// The builder model lives in the structure's `steps` (form fields) and `meta` (everything else); see toBody/fromStructure.
// Sub-statuses have no backend contract yet → mock path /api/admin/ops/sub-statuses (handlers-ops-e).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import type { CaseStatus } from "@/shared/domain/case-status";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";


type S = components["schemas"];
export type ServiceRow = S["ServiceSummaryResponse"];
export type ServiceDetail = S["ServiceDetailResponse"];
export type StructureRow = S["StructureCatalogueRowResponse"];
export type Category = S["ServiceCategoryResponse"];
export type Subcategory = S["ServiceSubcategoryResponse"];
export type Structure = S["ServiceStructureResponse"];
export type VersionRow = S["StructureVersionSummaryResponse"];
export type PricingBody = S["PricingDto"];
export type TierBody = S["TierDto"];

export const LANGS = ["rw", "en", "fr"] as const;
export type Lang = (typeof LANGS)[number];
export type L3 = Record<Lang, string>;
export const l3 = (en = "", rw = "", fr = ""): L3 => ({ rw, en, fr });

export const FIELD_TYPES = [
  "text",
  "number",
  "date",
  "select",
  "multi",
  "phone",
  "id",
  "address",
  "file",
  "group",
  "isic",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export type FormField = {
  id: string;
  type: FieldType;
  label: L3;
  help: L3;
  required: boolean;
  validation: "none" | "nid" | "tin" | "phone" | "email" | "percent";
  options?: string[];
  /** Show only when another field equals a value. */
  visibleIf?: { field: string; equals: string } | null;
  /** Repeating group only. */
  children?: FormField[];
  /** Repeating group only: this child field must total 100 across rows. */
  totalField?: string | null;
  /** ORG-06: profile path the wizard prefills from (with the client's profile_reuse consent), e.g. "org.tin". */
  profile?: string | null;
};
/** ORG-06 bindable profile paths (server: GET /api/me/prefill). */
export const PROFILE_PATHS = ["person.full_name", "person.national_id", "person.dob", "person.phone", "person.email", "person.province", "person.district", "person.sector", "person.cell", "person.street",
  "org.legal_name", "org.trade_name", "org.tin", "org.rdb_number", "org.province", "org.district", "org.sector", "org.cell", "org.phone", "org.email"] as const;
export type Eligibility = { id: string; q: L3; blocking: boolean };
export type DocReq = {
  id: string;
  name: L3;
  types: string[];
  maxMb: number;
  expiry: boolean;
  nameMatch: boolean;
  perApplicant: boolean;
  required: boolean;
};
export type CheckItem = { id: string; label: L3; source: string };
export type Deliverable = {
  id: string;
  name: L3;
  format: string;
  required: boolean;
};
export type SlaCfg = {
  firstResponse: number;
  firstResponseUnit: "hours" | "days";
  days: Record<string, number>;
  pauses: CaseStatus[];
  offsets: number[];
};
export type Draft = {
  name: L3;
  short: L3;
  categoryId: string;
  subcategoryId: string;
  languages: Lang[];
  eligibility: Eligibility[];
  fields: FormField[];
  documents: DocReq[];
  checklist: CheckItem[];
  deliverables: Deliverable[];
  sla: SlaCfg;
};

export const EMPTY_DRAFT: Draft = {
  name: l3(),
  short: l3(),
  categoryId: "",
  subcategoryId: "",
  languages: ["rw", "en", "fr"],
  eligibility: [],
  fields: [],
  documents: [],
  checklist: [],
  deliverables: [],
  sla: {
    firstResponse: 2,
    firstResponseUnit: "hours",
    days: { standard: 5, express: 2, urgent: 1 },
    pauses: ["awaiting_client_documents", "awaiting_payment"],
    offsets: [-24, 0, 48],
  },
};

/** Structure (API) → Draft. Unknown keys fall back to the empty draft. */
export function fromStructure(s: Pick<Structure, "steps" | "meta">): Draft {
  const meta = (s.meta ?? {}) as Partial<Draft>;
  const step = (s.steps?.[0] ?? {}) as { fields?: FormField[] };
  return {
    ...EMPTY_DRAFT,
    ...meta,
    sla: { ...EMPTY_DRAFT.sla, ...meta.sla },
    fields: step.fields ?? [],
  };
}
/** Draft → PUT /structure/draft body. */
export const toBody = ({ fields, ...meta }: Draft) => ({
  steps: [{ id: "form", fields }],
  meta,
});

// ---------------------------------------------------------------- pure helpers (unit-tested)
/** Move item i by d (−1 up, +1 down); returns the same array when out of range. */
export function move<T>(xs: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (i < 0 || j < 0 || j >= xs.length) return xs;
  const out = [...xs];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
/** Rewrite (or remove, when fn returns null) the field with `id`, anywhere in the tree. */
export function editField(
  fs: FormField[],
  id: string,
  fn: (f: FormField) => FormField | null,
): FormField[] {
  return fs.flatMap((f) => {
    if (f.id === id) {
      const r = fn(f);
      return r ? [r] : [];
    }
    return f.children ? [{ ...f, children: editField(f.children, id, fn) }] : [f];
  });
}
/** Move a field up/down among its siblings. */
export function moveField(fs: FormField[], id: string, d: -1 | 1): FormField[] {
  const i = fs.findIndex((f) => f.id === id);
  if (i >= 0) return move(fs, i, d);
  return fs.map((f) =>
    f.children ? { ...f, children: moveField(f.children, id, d) } : f,
  );
}
export const flatFields = (fs: FormField[]): FormField[] =>
  fs.flatMap((f) => [f, ...flatFields(f.children ?? [])]);

export const isVisible = (f: FormField, values: Record<string, unknown>) =>
  !f.visibleIf ||
  String(values[f.visibleIf.field] ?? "") === f.visibleIf.equals;

/** Sum of `field` across group rows (blank = 0). */
export const groupTotal = (rows: Record<string, string>[], field: string) =>
  rows.reduce((t, r) => t + (Number(r[field]) || 0), 0);

/** Every localised string the client sees, for one language. */
function strings(d: Draft, l: Lang): string[] {
  const all = (fs: FormField[]): string[] =>
    fs.flatMap((f) => [f.label[l], ...all(f.children ?? [])]);
  return [
    d.name[l],
    d.short[l],
    ...d.eligibility.map((e) => e.q[l]),
    ...all(d.fields),
    ...d.documents.map((x) => x.name[l]),
    ...d.deliverables.map((x) => x.name[l]),
  ];
}
/** Missing-string count per language (0 = complete dot). */
export const langGaps = (d: Draft, l: Lang) =>
  strings(d, l).filter((s) => !s?.trim()).length;

export type Blocker =
  | { kind: "lang"; lang: Lang; n: number }
  | { kind: "name" }
  | { kind: "category" }
  | { kind: "fields" }
  | { kind: "group"; id: string };
/** Why the draft can't be published yet (empty = OK). */
export function blockers(d: Draft): Blocker[] {
  const out: Blocker[] = [];
  if (!d.name.en.trim() && !d.name.rw.trim()) out.push({ kind: "name" });
  if (!d.categoryId) out.push({ kind: "category" });
  if (!d.fields.length) out.push({ kind: "fields" });
  d.fields
    .filter((f) => f.type === "group" && !f.children?.length)
    .forEach((f) => out.push({ kind: "group", id: f.id }));
  d.languages.forEach((lang) => {
    const n = langGaps(d, lang);
    if (n) out.push({ kind: "lang", lang, n });
  });
  return out;
}

export type Change = {
  kind: "added" | "removed" | "changed";
  area:
    "field" | "document" | "deliverable" | "eligibility" | "sla" | "details";
  label: string;
  detail?: string;
};
/** Structural diff a → b (older → newer), English labels for the version list. */
export function diffDrafts(a: Draft, b: Draft): Change[] {
  const out: Change[] = [];
  const byId = <T extends { id: string }>(
    area: Change["area"],
    xs: T[],
    ys: T[],
    name: (x: T) => string,
  ) => {
    const old = new Map(xs.map((x) => [x.id, x]));
    const now = new Map(ys.map((y) => [y.id, y]));
    ys.forEach((y) => {
      const x = old.get(y.id);
      if (!x) out.push({ kind: "added", area, label: name(y) });
      else if (JSON.stringify(x) !== JSON.stringify(y))
        out.push({
          kind: "changed",
          area,
          label: name(y),
          detail: name(x) !== name(y) ? name(x) : undefined,
        });
    });
    xs.forEach(
      (x) =>
        !now.has(x.id) && out.push({ kind: "removed", area, label: name(x) }),
    );
  };
  if (a.name.en !== b.name.en)
    out.push({
      kind: "changed",
      area: "details",
      label: b.name.en,
      detail: a.name.en,
    });
  byId("eligibility", a.eligibility, b.eligibility, (x) => x.q.en);
  byId("field", a.fields, b.fields, (x) => x.label.en);
  byId("document", a.documents, b.documents, (x) => x.name.en);
  byId("deliverable", a.deliverables, b.deliverables, (x) => x.name.en);
  Object.keys({ ...a.sla.days, ...b.sla.days }).forEach((k) => {
    if (a.sla.days[k] !== b.sla.days[k])
      out.push({
        kind: "changed",
        area: "sla",
        label: k,
        detail: `${a.sla.days[k] ?? "—"} → ${b.sla.days[k] ?? "—"}`,
      });
  });
  return out;
}

let seq = 0;
/** Client-side id for new builder items (event handlers only). */
export const newId = (p: string) =>
  `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;

// ---------------------------------------------------------------- queries
export const eKeys = {
  services: ["ops", "catalogue", "services"] as const,
  structures: ["ops", "catalogue", "structures"] as const,
  categories: ["ops", "catalogue", "categories"] as const,
  subcategories: ["ops", "catalogue", "subcategories"] as const,
  service: (s: string) => ["ops", "catalogue", "service", s] as const,
  draft: (s: string) => ["ops", "catalogue", "draft", s] as const,
  published: (s: string) => ["ops", "catalogue", "published", s] as const,
  versions: (s: string) => ["ops", "catalogue", "versions", s] as const,
  version: (s: string, v: number) =>
    ["ops", "catalogue", "version", s, v] as const,
  inFlight: (s: string, v: number) =>
    ["ops", "catalogue", "inflight", s, v] as const,
  subStatuses: ["ops", "sub-statuses"] as const,
};
const enc = encodeURIComponent;

export const useServices = () =>
  useQuery({
    queryKey: eKeys.services,
    queryFn: () => unwrap<S["ServiceListResponse"]>(api.GET("/api/admin/services")),
  });
export const useStructures = () =>
  useQuery({
    queryKey: eKeys.structures,
    queryFn: () =>
      unwrap<{ structures: StructureRow[] }>(api.GET("/api/admin/services/catalogue/structures")),
  });
export const useCategories = () =>
  useQuery({
    queryKey: eKeys.categories,
    queryFn: () =>
      unwrap<{ categories: Category[] }>(api.GET("/api/admin/service-categories")),
    staleTime: 300_000,
  });
export const useSubcategories = () =>
  useQuery({
    queryKey: eKeys.subcategories,
    queryFn: () =>
      unwrap<{ subcategories: Subcategory[] }>(api.GET("/api/admin/service-subcategories")),
    staleTime: 300_000,
  });
export const useService = (slug: string) =>
  useQuery({
    queryKey: eKeys.service(slug),
    queryFn: () =>
      unwrap<ServiceDetail>(api.GET("/api/admin/services/{slug}", { params: { path: { slug } } })),
  });
/** F-CAT-05/07/08/09 public facts on the service record (PATCH merges; the API revalidates the public page). */
export type ServiceFactsIn = Pick<ServiceDetail, "engagement_type" | "eligibility" | "deliverables" | "turnaround_days_min" | "turnaround_days_max" | "delivery_mode" | "seo" | "related_slugs" | "fee_explainer" | "markets" | "locale_slugs" | "revenue_agent_bps">;
export function useSaveServiceFacts(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: Partial<ServiceFactsIn>) =>
      unwrap<ServiceDetail>(api.PATCH("/api/admin/services/{slug}", { params: { path: { slug } }, body: b as never })), // cast: body enums are narrower than the response strings
    onSuccess: (d) => qc.setQueryData(eKeys.service(slug), d),
  });
}
/** F-CAT-10 pending/approved price changes for one service, and the finance decision. */
export type PriceChange = S["PriceChangeResponse"];
export const usePriceChanges = (slug: string) =>
  useQuery({ queryKey: [...eKeys.service(slug), "price-changes"], queryFn: () => unwrap<{ items: PriceChange[] }>(api.GET("/api/admin/services/{slug}/price-changes", { params: { path: { slug } } })) });
export function useDecidePrice(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string }) =>
      unwrap<PriceChange>(api.POST("/api/admin/services/{slug}/price-changes/{id}/decision", { params: { path: { slug, id: v.id } }, body: { approve: v.approve, reason: v.reason } })),
    onSettled: () => qc.invalidateQueries({ queryKey: eKeys.service(slug) }),
  });
}
export const useDraft = (slug: string) =>
  useQuery({
    queryKey: eKeys.draft(slug),
    queryFn: () =>
      unwrap<Structure>(api.GET("/api/admin/services/{slug}/structure/draft", { params: { path: { slug } } })),
    staleTime: Infinity, // the editor owns the draft after load; autosave writes it back
  });
export const useVersions = (slug: string) =>
  useQuery({
    queryKey: eKeys.versions(slug),
    queryFn: () =>
      unwrap<{ versions: VersionRow[] }>(api.GET("/api/admin/services/{slug}/structure/versions", { params: { path: { slug } } })),
  });
export const useVersion = (slug: string, v: number | null) =>
  useQuery({
    queryKey: eKeys.version(slug, v ?? 0),
    queryFn: () =>
      unwrap<Structure>(api.GET("/api/admin/services/{slug}/structure/versions/{v}", { params: { path: { slug, v: String(v) } } })),
    enabled: v != null,
  });
/** Requests still running on version v (they stay pinned to it after a publish). */
export const useInFlight = (slug: string, v: number | null) =>
  useQuery({
    queryKey: eKeys.inFlight(slug, v ?? 0),
    queryFn: () =>
      unwrap<Record<string, number>>(api.GET("/api/admin/services/{slug}/structure/versions/{v}/in-flight-count", { params: { path: { slug, v: String(v) } } })),
    enabled: v != null,
    select: (d) => d.count ?? Object.values(d)[0] ?? 0,
  });

function useEMutation<V, R>(
  fn: (v: V) => Promise<R>,
  slug?: string,
  also: readonly (readonly unknown[])[] = [],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: eKeys.services });
      qc.invalidateQueries({ queryKey: eKeys.structures });
      if (slug) {
        qc.invalidateQueries({ queryKey: eKeys.service(slug) });
        qc.invalidateQueries({ queryKey: eKeys.versions(slug) });
      }
      also.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
  });
}
/** Raw draft write (duplicate copies another service's structure). */
export const putDraft = (slug: string, body: { steps: Record<string, unknown>[]; meta: Record<string, unknown> }) =>
  unwrap<Structure>(api.PUT("/api/admin/services/{slug}/structure/draft", { params: { path: { slug } }, body: body }));
export const getDraft = (slug: string) =>
  unwrap<Structure>(api.GET("/api/admin/services/{slug}/structure/draft", { params: { path: { slug } } }));
export const useSaveDraft = (slug: string) =>
  useEMutation(
    (d: Draft) =>
      unwrap<Structure>(api.PUT("/api/admin/services/{slug}/structure/draft", { params: { path: { slug } }, body: toBody(d) })),
    slug,
  );
export const usePublish = (slug: string) =>
  useEMutation(
    (v: { token: string; note: string }) =>
      unwrap<Structure>(api.POST("/api/admin/services/{slug}/structure/publish", { params: { path: { slug }, header: { "x-audit-reason": encodeURIComponent(v.note || "publish") } }, headers: hdr({ stepUp: v.token, idempotent: true }) })),
    slug,
    // the editor remounts on the fresh draft/published numbers
    [eKeys.draft(slug), ["ops", "catalogue", "version", slug]],
  );
export const useCreateService = () =>
  useEMutation((b: S["CreateServiceDto"]) =>
    unwrap<ServiceDetail>(api.POST("/api/admin/services", { body: b, headers: hdr({
      idempotent: true,
    }) })),
  );
export const useSavePricing = (slug: string) =>
  useEMutation(
    (v: { pricing: PricingBody; tiers: Record<string, TierBody> }) =>
      Promise.all([
        unwrap<ServiceDetail>(api.PUT("/api/admin/services/{slug}/pricing", { params: { path: { slug } }, body: v.pricing })),
        ...Object.entries(v.tiers).map(([t, b]) =>
          unwrap(api.PATCH("/api/admin/services/{slug}/pricing/{tier}", { params: { path: { slug: slug, tier: t } }, body: b })),
        ),
      ]),
    slug,
  );

// ---------------------------------------------------------------- sub-statuses (★ mock)
export type SubStatus = {
  id: string;
  canonical: CaseStatus;
  name: L3;
  clientText: L3;
  clientVisible: boolean;
  color: "lavender" | "yellow" | "green" | "grey" | "red";
  order: number;
  usage: number;
};
export const useSubStatuses = () =>
  useQuery({
    queryKey: eKeys.subStatuses,
    queryFn: () =>
      unwrap<{ items: SubStatus[] }>(api.GET("/api/admin/ops/sub-statuses")),
  });
export function useSubStatusMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: eKeys.subStatuses });
      qc.invalidateQueries({ queryKey: ["ops", "cases"] });
    },
  });
}
export const createSubStatus = (b: Omit<SubStatus, "id" | "order" | "usage">) =>
  unwrap<SubStatus>(api.POST("/api/admin/ops/sub-statuses", { body: b, headers: hdr({
    idempotent: true,
  }) }));
export const patchSubStatus = (id: string, b: Partial<SubStatus>) =>
  unwrap<SubStatus>(api.PATCH("/api/admin/ops/sub-statuses/{id}", { params: { path: { id: id } }, body: b }));
export const reorderSubStatuses = (canonical: CaseStatus, ids: string[]) =>
  unwrap(api.POST("/api/admin/ops/sub-statuses/order", { body: { canonical, ids } }));
export const deleteSubStatus = (id: string) =>
  unwrap(api.DELETE("/api/admin/ops/sub-statuses/{id}", { params: { path: { id: id } } }));

// ---------------------------------------------------------------- U16 taxonomy CRUD + service lifecycle (status, delete)
export type CategoryIn = S["CategoryDto"];
export type SubcategoryIn = S["SubcategoryDto"];
/** Any taxonomy/lifecycle write; every catalogue list refetches after. */
export function useCatalogueWrite<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: ["ops", "catalogue"] }) });
}
export const createCategory = (b: CategoryIn) =>
  unwrap<Category>(api.POST("/api/admin/service-categories", { body: b }));
export const patchCategory = (id: string, b: S["CategoryPatchDto"]) =>
  unwrap<Category>(api.PATCH("/api/admin/service-categories/{id}", { params: { path: { id } }, body: b }));
export const deleteCategory = (id: string) =>
  unwrap(api.DELETE("/api/admin/service-categories/{id}", { params: { path: { id } } }));
export const createSubcategory = (b: SubcategoryIn) =>
  unwrap<Subcategory>(api.POST("/api/admin/service-subcategories", { body: b }));
export const patchSubcategory = (id: string, b: S["SubcategoryPatchDto"]) =>
  unwrap<Subcategory>(api.PATCH("/api/admin/service-subcategories/{id}", { params: { path: { id } }, body: b }));
export const deleteSubcategory = (id: string) =>
  unwrap(api.DELETE("/api/admin/service-subcategories/{id}", { params: { path: { id } } }));
export const setServiceStatus = (slug: string, status: string) =>
  unwrap<ServiceDetail>(api.PATCH("/api/admin/services/{slug}/status", { params: { path: { slug } }, body: { status } }));
export const deleteService = (slug: string) =>
  unwrap(api.DELETE("/api/admin/services/{slug}", { params: { path: { slug } } }));

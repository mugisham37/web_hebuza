// Lane E mocks: catalogue + service builder (U16–U17) on the real /api/admin/services*, /structure/*, /pricing*,
// service-(sub)categories contracts, plus ★ mock /api/admin/ops/sub-statuses (no backend contract yet).
// shortcut: in-memory only (resets on reload); replace per endpoint as the server ships them.
// Active-request and in-flight counts come from ops-world CASES so numbers agree with the rest of /ops.
// Demo rules: publish needs an X-Step-Up-Token starting "su_" (lane C step-up mock issues them);
// slug "taken" on create → 409; service "broken-service" → 500 on draft load.
import { http, HttpResponse, delay } from "msw";
import { CASES, SERVICES } from "./ops-world";
import type { CaseStatus } from "@/shared/domain/case-status";
import type { components } from "@/lib/api/schema";
import type { Draft, FormField, SubStatus } from "@/lib/ops/e";
import { toBody, l3 } from "@/lib/ops/e";

type S = components["schemas"];
const ok = <T>(data: T, message = "OK") =>
  HttpResponse.json({ success: true, message, errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );
const CLOSED: CaseStatus[] = [
  "completed_delivered",
  "rejected",
  "cancelled",
  "refunded",
];
const active = (slug: string) =>
  CASES.filter((c) => c.service === slug && !CLOSED.includes(c.status)).length;

// ---------------------------------------------------------------- categories
const cat = (
  id: string,
  en: string,
  rw: string,
  fr: string,
  sort: number,
): S["ServiceCategoryResponse"] => ({
  id,
  slug: id,
  name_en: en,
  name_rw: rw,
  name_fr: fr,
  sort_order: sort,
  is_active: true,
});
const CATEGORIES = [
  cat(
    "online-government",
    "Online & Government",
    "Serivisi za Leta kuri interineti",
    "En ligne et administration",
    1,
  ),
  cat(
    "tax-business",
    "Tax & Business Support",
    "Imisoro n'ubucuruzi",
    "Fiscalité et appui aux entreprises",
    2,
  ),
  cat(
    "investment-finance",
    "Investment & Finance",
    "Ishoramari n'imari",
    "Investissement et finance",
    3,
  ),
  cat(
    "marketing-branding",
    "Marketing & Branding",
    "Kwamamaza n'ikirango",
    "Marketing et image de marque",
    4,
  ),
  cat("trainings", "Trainings", "Amahugurwa", "Formations", 5),
  cat("ict-digital", "ICT & Digital", "Ikoranabuhanga", "TIC et numérique", 6),
];
const sub = (
  id: string,
  category_id: string,
  en: string,
  rw: string,
  fr: string,
  sort: number,
): S["ServiceSubcategoryResponse"] => ({
  id,
  slug: id,
  category_id,
  name_en: en,
  name_rw: rw,
  name_fr: fr,
  sort_order: sort,
  is_active: true,
});
const SUBCATEGORIES = [
  sub(
    "business-registration",
    "online-government",
    "Business registration",
    "Kwandikisha ubucuruzi",
    "Immatriculation",
    1,
  ),
  sub(
    "intellectual-property",
    "online-government",
    "Intellectual property",
    "Umutungo bwite mu by'ubwenge",
    "Propriété intellectuelle",
    2,
  ),
  sub(
    "tax-filing",
    "tax-business",
    "Tax filing",
    "Kumenyekanisha imisoro",
    "Déclarations fiscales",
    1,
  ),
  sub(
    "compliance",
    "tax-business",
    "Compliance",
    "Kubahiriza amategeko",
    "Conformité",
    2,
  ),
  sub(
    "investment",
    "investment-finance",
    "Investment",
    "Ishoramari",
    "Investissement",
    1,
  ),
];
const CAT_OF: Record<string, [string, string | null]> = {
  "company-registration": ["online-government", "business-registration"],
  "trademark-registration": ["online-government", "intellectual-property"],
  "vat-declaration": ["tax-business", "tax-filing"],
  "paye-monthly-filing": ["tax-business", "tax-filing"],
  "tax-clearance-certificate": ["tax-business", "compliance"],
  "business-plan": ["investment-finance", null],
  "investment-certificate": ["investment-finance", "investment"],
};

// ---------------------------------------------------------------- services
type Svc = {
  slug: string;
  name: string;
  categoryId: string | null;
  subcategoryId: string | null;
  status: "published" | "draft" | "paused";
  pricing: {
    mode: "fixed" | "range" | "quote";
    planCovered: boolean;
    urgentType: "flat" | "percent" | null;
    urgentValue: number | null;
    bands: S["PriceBandResponse"][];
  };
  tiers: S["PricingTierResponse"][];
  createdAt: string;
  updatedAt: string;
};
const tier = (
  t: string,
  label: string,
  fee: number,
  gov: number,
  days: number,
  isAvailable = true,
): S["PricingTierResponse"] => ({
  tier: t,
  label,
  fee,
  governmentFee: gov,
  eta: `${days} business days`,
  etaBusinessDays: days,
  includes: [],
  isAvailable,
});
const STATUS: Record<string, Svc["status"]> = {
  "paye-monthly-filing": "paused",
  "tax-clearance-certificate": "draft",
};
const SVCS: Svc[] = SERVICES.map((s, i) => ({
  slug: s.slug,
  name: s.name,
  categoryId: CAT_OF[s.slug]?.[0] ?? null,
  subcategoryId: CAT_OF[s.slug]?.[1] ?? null,
  status: STATUS[s.slug] ?? "published",
  pricing: {
    mode: s.pricing,
    planCovered:
      s.slug === "vat-declaration" || s.slug === "paye-monthly-filing",
    urgentType: "percent",
    urgentValue: 50,
    bands:
      s.pricing === "range"
        ? [
            {
              id: "b1",
              min_amount_rwf: 100_000,
              max_amount_rwf: 999_999,
              fee_type: "flat",
              fee_rwf: 15_000,
              sort_order: 0,
            },
            {
              id: "b2",
              min_amount_rwf: 1_000_000,
              max_amount_rwf: 49_999_999,
              fee_type: "percent",
              fee_percent: 1.25,
              min_fee_rwf: 5_000,
              max_fee_rwf: 50_000,
              sort_order: 1,
            },
            {
              id: "b3",
              min_amount_rwf: 50_000_000,
              max_amount_rwf: null,
              fee_type: "flat",
              fee_rwf: 1_200_000,
              sort_order: 2,
            },
          ]
        : [],
  },
  tiers:
    s.pricing === "quote"
      ? []
      : [
          tier(
            "standard",
            "Standard",
            s.fee ?? 0,
            s.slug === "company-registration" ? 5_000 : 0,
            s.slug === "company-registration" ? 5 : s.slaDays,
          ),
          tier(
            "express",
            "Express",
            Math.round((s.fee ?? 0) * 1.75),
            s.slug === "company-registration" ? 5_000 : 0,
            2,
          ),
          tier(
            "urgent",
            "Urgent",
            Math.round((s.fee ?? 0) * 2.5),
            s.slug === "company-registration" ? 5_000 : 0,
            1,
          ),
        ],
  createdAt: "2026-01-10T08:00:00Z",
  updatedAt: new Date(Date.now() - (i * 26 + 3) * 3600_000).toISOString(), // relative to now: always in the past
}));
const svcOf = (slug: string) => SVCS.find((s) => s.slug === slug);

// ---------------------------------------------------------------- structures (versions per service)
const f = (
  id: string,
  type: FormField["type"],
  en: string,
  rw: string,
  fr: string,
  more: Partial<FormField> = {},
): FormField => ({
  id,
  type,
  label: l3(en, rw, fr),
  help: l3(),
  required: true,
  validation: "none",
  ...more,
});
const baseSla: Draft["sla"] = {
  firstResponse: 2,
  firstResponseUnit: "hours",
  days: { standard: 5, express: 2, urgent: 1 },
  pauses: ["awaiting_client_documents", "awaiting_payment"],
  offsets: [-24, 0, 48],
};
function seedDraft(s: Svc): Draft {
  const company = s.slug === "company-registration";
  return {
    name: company
      ? l3(
          "Company registration (RDB)",
          "Kwandikisha isosiyete (RDB)",
          "Immatriculation d'entreprise (RDB)",
        )
      : l3(s.name, s.name, s.name),
    short: company
      ? l3(
          "Register your company with the Rwanda Development Board (RDB).",
          "Andikisha isosiyete yawe mu Rwego rw'Igihugu rw'Iterambere (RDB).",
          "Immatriculez votre entreprise auprès du Rwanda Development Board (RDB).",
        )
      : l3(`${s.name}, handled end to end by HEBUZA.`, "", ""),
    categoryId: s.categoryId ?? "",
    subcategoryId: s.subcategoryId ?? "",
    languages: ["rw", "en", "fr"],
    eligibility: company
      ? [
          {
            id: "el-resident",
            q: l3(
              "Is the applicant a Rwandan resident?",
              "Usaba atuye mu Rwanda?",
              "Le demandeur réside-t-il au Rwanda ?",
            ),
            blocking: true,
          },
        ]
      : [],
    fields: company
      ? [
          f(
            "company-type",
            "select",
            "Company type",
            "Ubwoko bw'isosiyete",
            "Type de société",
            { options: ["Ltd", "Sole proprietor", "Cooperative"] },
          ),
          f(
            "activity",
            "isic",
            "Business activity",
            "Umuco w'ishabikora",
            "Activité principale",
            {
              help: l3(
                "Choose the main activity",
                "Hitamo igikorwa nyamukuru",
                "Choisissez l'activité principale",
              ),
            },
          ),
          f(
            "shareholders",
            "group",
            "Shareholders",
            "Abanyamigabane",
            "Actionnaires",
            {
              visibleIf: { field: "company-type", equals: "Ltd" },
              totalField: "sh-shares",
              children: [
                f(
                  "sh-name",
                  "text",
                  "Full name",
                  "Amazina yombi",
                  "Nom complet",
                ),
                f(
                  "sh-id",
                  "id",
                  "ID number",
                  "Nimero y'indangamuntu",
                  "N° d'identité",
                  { validation: "nid" },
                ),
                f(
                  "sh-shares",
                  "number",
                  "Shares (%)",
                  "Imigabane (%)",
                  "Parts (%)",
                  { validation: "percent" },
                ),
              ],
            },
          ),
          f(
            "address",
            "address",
            "Registered address",
            "Aderesi yanditse",
            "Adresse du siège",
          ),
        ]
      : [
          f("full-name", "text", "Full name", "Amazina yombi", "Nom complet"),
          f("phone", "phone", "Phone", "Telefoni", "Téléphone", {
            validation: "phone",
          }),
          f("tin", "text", "TIN", "TIN", "NIF", { validation: "tin" }),
        ],
    documents: company
      ? [
          {
            id: "doc-nid",
            name: l3("National ID", "Indangamuntu", "Carte d'identité"),
            types: ["PDF", "JPG"],
            maxMb: 5,
            expiry: true,
            nameMatch: true,
            perApplicant: false,
            required: true,
          },
          {
            id: "doc-address",
            name: l3(
              "Proof of address",
              "Icyemezo cy'aho utuye",
              "Justificatif de domicile",
            ),
            types: ["PDF", "JPG"],
            maxMb: 5,
            expiry: false,
            nameMatch: true,
            perApplicant: false,
            required: true,
          },
          {
            id: "doc-sh-ids",
            name: l3(
              "Shareholder IDs",
              "Indangamuntu z'abanyamigabane",
              "Pièces des actionnaires",
            ),
            types: ["PDF", "JPG"],
            maxMb: 10,
            expiry: true,
            nameMatch: true,
            perApplicant: true,
            required: false,
          },
          {
            id: "doc-plan",
            name: l3(
              "Business plan",
              "Igenamigambi ry'ubucuruzi",
              "Plan d'affaires",
            ),
            types: ["PDF", "DOCX"],
            maxMb: 10,
            expiry: false,
            nameMatch: false,
            perApplicant: false,
            required: true,
          },
        ]
      : [
          {
            id: "doc-nid",
            name: l3("National ID", "Indangamuntu", "Carte d'identité"),
            types: ["PDF", "JPG"],
            maxMb: 5,
            expiry: true,
            nameMatch: true,
            perApplicant: false,
            required: true,
          },
        ],
    checklist: company
      ? [
          {
            id: "ck-client",
            label: l3(
              "Client details",
              "Amakuru y'umukiriya",
              "Coordonnées du client",
            ),
            source: "manual",
          },
          {
            id: "ck-company",
            label: l3(
              "Company information",
              "Amakuru y'isosiyete",
              "Informations sur la société",
            ),
            source: "field:company-type",
          },
          {
            id: "ck-sh",
            label: l3("Shareholders", "Abanyamigabane", "Actionnaires"),
            source: "field:shareholders",
          },
          {
            id: "ck-address",
            label: l3(
              "Registered address",
              "Aderesi yanditse",
              "Adresse du siège",
            ),
            source: "field:address",
          },
          {
            id: "ck-docs",
            label: l3(
              "Documents uploaded",
              "Inyandiko zoherejwe",
              "Documents téléversés",
            ),
            source: "doc:doc-nid",
          },
        ]
      : [
          {
            id: "ck-id",
            label: l3("ID provided", "Indangamuntu yatanzwe", "Pièce fournie"),
            source: "doc:doc-nid",
          },
        ],
    deliverables: company
      ? [
          {
            id: "dl-cert",
            name: l3(
              "Certificate of incorporation",
              "Icyemezo cyo kwandikwa",
              "Certificat d'immatriculation",
            ),
            format: "PDF",
            required: true,
          },
        ]
      : [
          {
            id: "dl-main",
            name: l3(
              `${s.name} result`,
              `Igisubizo cya ${s.name}`,
              `Résultat : ${s.name}`,
            ),
            format: "PDF",
            required: true,
          },
        ],
    sla: {
      ...baseSla,
      days: {
        standard: s.tiers[0]?.etaBusinessDays ?? 5,
        express: 2,
        urgent: 1,
      },
    },
  };
}
type Ver = {
  version: number;
  status: "draft" | "published" | "archived";
  draft: Draft;
  updatedAt: string;
  publishedAt: string | null;
};
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const VERSIONS: Record<string, Ver[]> = {};
SVCS.forEach((s) => {
  const d = seedDraft(s);
  if (s.slug === "company-registration") {
    const v1 = clone(d);
    v1.fields = v1.fields.filter(
      (x) => x.id !== "activity" && x.id !== "address",
    );
    v1.documents = v1.documents.slice(0, 2);
    const v2 = clone(d);
    v2.fields = v2.fields.filter((x) => x.id !== "address");
    v2.documents = v2.documents.slice(0, 3);
    const v3 = clone(d);
    v3.fields = v3.fields.filter((x) => x.id !== "address");
    v3.sla.days.express = 3;
    VERSIONS[s.slug] = [
      {
        version: 1,
        status: "archived",
        draft: v1,
        updatedAt: "2026-01-10T10:00:00Z",
        publishedAt: "2026-01-10T10:00:00Z",
      },
      {
        version: 2,
        status: "archived",
        draft: v2,
        updatedAt: "2026-06-12T10:00:00Z",
        publishedAt: "2026-06-12T10:00:00Z",
      },
      {
        version: 3,
        status: "published",
        draft: v3,
        updatedAt: "2026-09-03T10:00:00Z",
        publishedAt: "2026-09-03T10:00:00Z",
      },
      {
        version: 4,
        status: "draft",
        draft: d,
        updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
        publishedAt: null,
      },
    ];
  } else if (s.status === "draft") {
    VERSIONS[s.slug] = [
      {
        version: 1,
        status: "draft",
        draft: d,
        updatedAt: s.updatedAt,
        publishedAt: null,
      },
    ];
  } else {
    VERSIONS[s.slug] = [
      {
        version: 1,
        status: "published",
        draft: d,
        updatedAt: s.createdAt,
        publishedAt: s.createdAt,
      },
      {
        version: 2,
        status: "draft",
        draft: clone(d),
        updatedAt: s.updatedAt,
        publishedAt: null,
      },
    ];
  }
});
const published = (slug: string) =>
  VERSIONS[slug]?.find((v) => v.status === "published") ?? null;
const draftOf = (slug: string) => {
  const vs = (VERSIONS[slug] ??= []);
  let d = vs.find((v) => v.status === "draft");
  if (!d) {
    const p = published(slug);
    d = {
      version: (vs.at(-1)?.version ?? 0) + 1,
      status: "draft",
      draft: p ? clone(p.draft) : seedDraft(svcOf(slug)!),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };
    vs.push(d);
  }
  return d;
};
const structure = (slug: string, v: Ver): S["ServiceStructureResponse"] => ({
  serviceSlug: slug,
  version: v.version,
  status: v.status,
  publishedVersion: published(slug)?.version ?? null,
  updatedAt: v.updatedAt,
  ...(toBody(v.draft) as {
    steps: Record<string, unknown>[];
    meta: Record<string, unknown>;
  }),
});

const summary = (s: Svc): S["ServiceSummaryResponse"] => {
  const c = CATEGORIES.find((x) => x.id === s.categoryId) ?? null;
  // @ts-expect-error mock row predates fields the API added to ServiceSummaryResponse (Phase 8 removes mocks)
  return {
    service_id: `svc-${s.slug}`,
    slug: s.slug,
    name: s.name,
    name_en: s.name,
    category: c?.name_en ?? "",
    category_id: s.categoryId,
    category_ref: c,
    subcategory_id: s.subcategoryId,
    status: s.status,
    version: published(s.slug)?.version ?? 0,
    is_featured: false,
    handler: "agent",
    pricing_tiers: s.tiers,
    volume30d: active(s.slug),
    pricing_mode: s.pricing.mode,
    plan_covered: s.pricing.planCovered,
    urgent_surcharge_type: s.pricing.urgentType,
    urgent_surcharge_value: s.pricing.urgentValue,
    price_bands: s.pricing.bands,
    from_fee: s.tiers[0]?.fee ?? null,
    copy_too_long: false,
  };
};
const detail = (s: Svc): S["ServiceDetailResponse"] => ({
  ...summary(s),
  created_at: s.createdAt,
  updated_at: s.updatedAt,
  steps: [],
  requirements: [],
});

// ---------------------------------------------------------------- sub-statuses (★ mock)
const ss = (
  id: string,
  canonical: CaseStatus,
  en: string,
  rw: string,
  fr: string,
  color: SubStatus["color"],
  order: number,
  clientVisible = true,
): Omit<SubStatus, "usage"> => ({
  id,
  canonical,
  name: l3(en, rw, fr),
  clientText: l3(en, rw, fr),
  clientVisible,
  color,
  order,
});
const SUBS: Omit<SubStatus, "usage">[] = [
  ss(
    "ss-more-info",
    "awaiting_client_documents",
    "Pending more information",
    "Hategerejwe andi makuru",
    "En attente d'informations",
    "yellow",
    0,
  ),
  ss(
    "ss-notary",
    "awaiting_client_documents",
    "Awaiting notary signature",
    "Gutegereza umukono wa noteri",
    "En attente de la signature du notaire",
    "lavender",
    1,
  ),
  ss(
    "ss-client-review",
    "awaiting_quotation",
    "Under review by client",
    "Umukiriya arimo kubisuzuma",
    "En cours d'examen par le client",
    "lavender",
    0,
  ),
  ss(
    "ss-name",
    "awaiting_external_institution",
    "Awaiting name reservation",
    "Gutegereza kubika izina",
    "En attente de réservation du nom",
    "lavender",
    0,
  ),
  ss(
    "ss-rra",
    "awaiting_external_institution",
    "Awaiting RRA response",
    "Gutegereza igisubizo cya RRA",
    "En attente de la réponse de la RRA",
    "lavender",
    1,
  ),
  ss(
    "ss-call",
    "on_hold",
    "Waiting for client call",
    "Gutegereza guhamagarwa n'umukiriya",
    "En attente d'un appel du client",
    "grey",
    0,
    false,
  ),
  ss(
    "ss-scope",
    "rejected",
    "Out of scope",
    "Ntibiri mu byo dukora",
    "Hors du périmètre",
    "red",
    0,
  ),
];
const withUsage = (x: Omit<SubStatus, "usage">): SubStatus => ({
  ...x,
  usage: CASES.filter(
    (c) => c.status === x.canonical && c.subStatus === x.name.en,
  ).length,
});

export const handlers = [
  http.get("/api/admin/service-categories", () =>
    ok({
      categories: CATEGORIES.map((c) => ({
        ...c,
        service_count: SVCS.filter((s) => s.categoryId === c.id).length,
      })),
    }),
  ),
  http.get("/api/admin/service-subcategories", () =>
    ok({ subcategories: SUBCATEGORIES }),
  ),
  http.get("/api/admin/services", async () => {
    await delay(200);
    return ok({ services: SVCS.map(summary) });
  }),
  http.get("/api/admin/services/catalogue/structures", async () => {
    await delay(200);
    return ok({
      structures: SVCS.map((s): S["StructureCatalogueRowResponse"] => {
        const d = draftOf(s.slug);
        const p = published(s.slug);
        const sc = SUBCATEGORIES.find((x) => x.id === s.subcategoryId);
        return {
          slug: s.slug,
          name: s.name,
          category:
            CATEGORIES.find((c) => c.id === s.categoryId)?.name_en ?? "",
          categoryId: s.categoryId,
          subcategoryId: s.subcategoryId,
          subcategoryLabel: sc?.name_en ?? null,
          applicationCount: active(s.slug),
          status: d.status,
          serviceStatus: s.status,
          handler: "agent",
          version: d.version,
          publishedVersion: p?.version ?? null,
          stepCount: 1,
          componentCount: d.draft.fields.length,
          hasUnpublishedChanges:
            !p || JSON.stringify(p.draft) !== JSON.stringify(d.draft),
          updatedAt: d.updatedAt > s.updatedAt ? d.updatedAt : s.updatedAt,
          copyTooLong: false,
        };
      }),
    });
  }),
  http.post("/api/admin/services", async ({ request }) => {
    const b = (await request.json()) as S["CreateServiceDto"];
    if (!b.name?.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.slug ?? ""))
      return fail(422, "validation", "Invalid name or slug");
    if (b.slug === "taken" || svcOf(b.slug))
      return fail(409, "conflict", "Slug already in use");
    const now = new Date().toISOString();
    const s: Svc = {
      slug: b.slug,
      name: b.name,
      categoryId:
        CATEGORIES.find((c) => c.id === b.category || c.name_en === b.category)
          ?.id ?? null,
      subcategoryId: b.subcategory ?? null,
      status: "draft",
      pricing: {
        mode: "fixed",
        planCovered: false,
        urgentType: null,
        urgentValue: null,
        bands: [],
      },
      tiers: [
        tier("standard", "Standard", 0, 0, 5),
        tier("express", "Express", 0, 0, 2, false),
        tier("urgent", "Urgent", 0, 0, 1, false),
      ],
      createdAt: now,
      updatedAt: now,
    };
    SVCS.push(s);
    const d = seedDraft(s);
    d.name = l3(b.name, "", "");
    d.short = l3(b.short_description ?? "", "", "");
    d.fields = [];
    d.documents = [];
    d.checklist = [];
    d.deliverables = [];
    VERSIONS[s.slug] = [
      {
        version: 1,
        status: "draft",
        draft: d,
        updatedAt: now,
        publishedAt: null,
      },
    ];
    return ok(
      { service_id: `svc-${s.slug}`, slug: s.slug, status: "draft" },
      "Created",
    );
  }),
  http.get("/api/admin/services/:slug", ({ params }) => {
    const s = svcOf(String(params.slug));
    return s ? ok(detail(s)) : fail(404, "not_found", "Service not found");
  }),
  http.put("/api/admin/services/:slug/pricing", async ({ params, request }) => {
    const s = svcOf(String(params.slug));
    if (!s) return fail(404, "not_found", "Service not found");
    const b = (await request.json()) as S["PricingDto"];
    s.pricing = {
      mode: b.pricing_mode,
      planCovered: !!b.plan_covered,
      urgentType: b.urgent_surcharge_type ?? null,
      urgentValue: b.urgent_surcharge_value ?? null,
      bands: (b.bands ?? []).map((x, i) => ({
        ...x,
        id: `b${i + 1}`,
        sort_order: i,
      })),
    };
    s.updatedAt = new Date().toISOString();
    return ok(detail(s), "Pricing saved");
  }),
  http.patch(
    "/api/admin/services/:slug/pricing/:tier",
    async ({ params, request }) => {
      const s = svcOf(String(params.slug));
      const t = s?.tiers.find((x) => x.tier === params.tier);
      if (!s || !t) return fail(404, "not_found", "Tier not found");
      const b = (await request.json()) as S["TierDto"];
      if (b.platform_fee != null) t.fee = b.platform_fee;
      if (b.government_fee != null) t.governmentFee = b.government_fee;
      if (b.eta_business_days != null) {
        t.etaBusinessDays = b.eta_business_days;
        t.eta = `${b.eta_business_days} business days`;
      }
      if (b.is_available != null) t.isAvailable = b.is_available;
      return ok(detail(s));
    },
  ),
  http.get("/api/admin/services/:slug/structure/draft", async ({ params }) => {
    await delay(150);
    const slug = String(params.slug);
    if (slug === "broken-service")
      return fail(500, "server_error", "Draft store unavailable");
    if (!svcOf(slug)) return fail(404, "not_found", "Service not found");
    return ok(structure(slug, draftOf(slug)));
  }),
  http.put(
    "/api/admin/services/:slug/structure/draft",
    async ({ params, request }) => {
      const slug = String(params.slug);
      if (!svcOf(slug)) return fail(404, "not_found", "Service not found");
      const b = (await request.json()) as {
        steps: { fields?: FormField[] }[];
        meta: Omit<Draft, "fields">;
      };
      const d = draftOf(slug);
      d.draft = { ...b.meta, fields: b.steps?.[0]?.fields ?? [] };
      d.updatedAt = new Date().toISOString();
      return ok(structure(slug, d), "Draft saved");
    },
  ),
  http.post(
    "/api/admin/services/:slug/structure/publish",
    async ({ params, request }) => {
      await delay(300);
      const slug = String(params.slug);
      if (!request.headers.get("x-step-up-token")?.startsWith("su_"))
        return fail(401, "step_up_required", "Confirm it's you first.");
      const s = svcOf(slug);
      if (!s) return fail(404, "not_found", "Service not found");
      const d = draftOf(slug);
      VERSIONS[slug].forEach(
        (v) => v.status === "published" && (v.status = "archived"),
      );
      d.status = "published";
      d.publishedAt = d.updatedAt = new Date().toISOString();
      if (s.status === "draft") s.status = "published";
      return ok(structure(slug, d), "Published");
    },
  ),
  http.get("/api/admin/services/:slug/structure/published", ({ params }) => {
    const p = published(String(params.slug));
    return p
      ? ok(structure(String(params.slug), p))
      : fail(404, "not_found", "Never published");
  }),
  http.get("/api/admin/services/:slug/structure/versions", ({ params }) => {
    const vs = VERSIONS[String(params.slug)];
    if (!vs) return fail(404, "not_found", "Service not found");
    return ok({
      versions: [...vs]
        .reverse()
        .map((v): S["StructureVersionSummaryResponse"] => ({
          version: v.version,
          status: v.status,
          publishedAt: v.publishedAt,
          updatedAt: v.updatedAt,
        })),
    });
  }),
  http.get("/api/admin/services/:slug/structure/versions/:v", ({ params }) => {
    const v = VERSIONS[String(params.slug)]?.find(
      (x) => x.version === Number(params.v),
    );
    return v
      ? ok(structure(String(params.slug), v))
      : fail(404, "not_found", "Version not found");
  }),
  http.get(
    "/api/admin/services/:slug/structure/versions/:v/in-flight-count",
    ({ params }) =>
      // Every open case is pinned to the version that was live when it was submitted: the published one here.
      ok({
        count:
          published(String(params.slug))?.version === Number(params.v)
            ? active(String(params.slug))
            : 0,
      }),
  ),

  // ★ sub-statuses
  http.get("/api/admin/ops/sub-statuses", async () => {
    await delay(150);
    return ok({ items: SUBS.map(withUsage) });
  }),
  http.post("/api/admin/ops/sub-statuses", async ({ request }) => {
    const b = (await request.json()) as Omit<
      SubStatus,
      "id" | "order" | "usage"
    >;
    if (!b.name?.en?.trim() || !b.name?.rw?.trim() || !b.name?.fr?.trim())
      return fail(422, "validation", "Name required in all languages");
    const x = {
      ...b,
      id: `ss-${Date.now().toString(36)}`,
      order: SUBS.filter((s) => s.canonical === b.canonical).length,
    };
    SUBS.push(x);
    return ok(withUsage(x), "Created");
  }),
  http.patch("/api/admin/ops/sub-statuses/:id", async ({ params, request }) => {
    const x = SUBS.find((s) => s.id === params.id);
    if (!x) return fail(404, "not_found", "Not found");
    const b = (await request.json()) as Partial<SubStatus>;
    if (b.canonical && b.canonical !== x.canonical)
      x.order = SUBS.filter((s) => s.canonical === b.canonical).length;
    Object.assign(x, {
      name: b.name ?? x.name,
      clientText: b.clientText ?? x.clientText,
      clientVisible: b.clientVisible ?? x.clientVisible,
      color: b.color ?? x.color,
      canonical: b.canonical ?? x.canonical,
    });
    return ok(withUsage(x));
  }),
  http.post("/api/admin/ops/sub-statuses/order", async ({ request }) => {
    const b = (await request.json()) as {
      canonical: CaseStatus;
      ids: string[];
    };
    b.ids.forEach((id, i) => {
      const x = SUBS.find((s) => s.id === id && s.canonical === b.canonical);
      if (x) x.order = i;
    });
    return ok({ ok: true });
  }),
  http.delete("/api/admin/ops/sub-statuses/:id", ({ params }) => {
    const i = SUBS.findIndex((s) => s.id === params.id);
    if (i < 0) return fail(404, "not_found", "Not found");
    if (withUsage(SUBS[i]).usage)
      return fail(409, "in_use", "Sub-status in use");
    SUBS.splice(i, 1);
    return ok({ ok: true });
  }),
];

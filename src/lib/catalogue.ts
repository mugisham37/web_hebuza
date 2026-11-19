import "server-only";
import { cacheTag } from "next/cache";
import type { Locale } from "@/shared/i18n/config";
import { FAMILIES, type FamilyMeta } from "@/content/families";
import { publicGet } from "@/lib/public-api";

// Public catalogue (F-CAT-01..09): GET /api/services, /api/services/:slug, /api/service-categories and /api/plans.
// Cached under `catalogue` (+ `service:<slug>`); every catalogue write in the API sends that tag to /hooks/revalidate.
// FAMILIES only supplies display art (tone/photo/icon, short/promise copy) for known category slugs.

type ApiTier = { tier: string; label: string; fee: number; governmentFee: number; eta: string; etaBusinessDays: number; includes: string[]; isAvailable: boolean };
type L10n = { name_rw: string; name_en: string; name_fr: string };
type ApiService = L10n & {
  slug: string; category: string; subcategory: string; subcategory_ref: L10n & { slug: string; sort_order: number } | null;
  short_description_rw: string | null; short_description_en: string | null; short_description_fr: string | null;
  pricing_tiers: ApiTier[]; pricing_mode: "fixed" | "range" | "quote" | string; from_fee: number | null;
  plan_covered: boolean; is_featured: boolean; volume30d: number | null; price_bands: { min_amount_rwf: number; max_amount_rwf?: number | null; fee_type: string; fee_rwf?: number | null; fee_percent?: number | null; min_fee_rwf?: number | null; max_fee_rwf?: number | null; sort_order: number }[]; range_basis_label: string | null; status: string;
  engagement_type: string; eligibility: L3[]; deliverables: L3[]; turnaround_days_min: number | null; turnaround_days_max: number | null; delivery_mode: string | null;
  seo: Partial<Record<Locale, { title?: string; description?: string; og_image?: string }>>; related_slugs: string[]; locale_slugs?: Partial<L3>; fee_explainer: L3 | null; markets: string[];
};
type L3 = Record<Locale, string>;
type ApiCategory = L3 & { slug: string; name_rw: string; name_en: string; name_fr: string; description_rw: string | null; description_en: string | null; description_fr: string | null; sort_order: number; is_active: boolean };
type ApiDetail = { description_rw: string | null; description_en: string | null; description_fr: string | null; requirements: Record<string, unknown>[] | null; structure: { steps?: { title?: Partial<L3> | string }[] } | null };
type ApiPlan = { planId: string; name: string; amountRwf: number; interval: string; maxApplicationsPerMonth: number | null; description: string; features: string[]; badge: string | null; sortOrder: number; isPublic: boolean; onPricing: boolean; isActive: boolean };

export type Tier = { key: string; label: string; fee: number; governmentFee: number; eta: string; days: number; includes: string[] };
export type ServiceVM = {
  slug: string; name: string; summary: string; family: string; subArea: { slug: string; name: string } | null;
  priceMode: "fixed" | "range" | "quote"; fromFee: number | null; tiers: Tier[]; planCovered: boolean; popular: number; featured: boolean; paused: boolean;
  /** F-CAT-07 public slug per locale (canonical `slug` when unset). */
  slugs: Record<Locale, string>;
  consultation: boolean; deliveryMode: string | null; turnaround: { min: number | null; max: number | null };
};
export type ServiceDetailVM = ServiceVM & { bands: { min: number; max: number | null; fee: number; rate: number; minFee: number | null; maxFee: number | null }[]; description: string | null; requirements: string[]; steps: string[];
  eligibility: string[]; deliverables: string[]; seo: { title?: string; description?: string; og_image?: string }; related: string[]; feeExplainer: string | null; markets: string[] };
export type FamilyVM = Omit<FamilyMeta, "name" | "blurb" | "short" | "promise"> & { name: string; blurb: string; short: string; promise: string; count: number; subAreas: { slug: string; name: string; count: number }[]; services: ServiceVM[] };
export type PlanVM = { id: string; name: string; amount: number; interval: string; maxApps: number | null; description: string; features: string[]; badge: string | null };

const pick = (o: Record<string, unknown>, base: string, l: Locale) => (o[`${base}_${l}`] ?? o[`${base}_en`] ?? o[base] ?? null) as string | null;



async function rawServices(): Promise<ApiService[]> {
  "use cache";
  cacheTag("catalogue");
  return (await publicGet<{ services: ApiService[] }>("/services", { services: [] }))?.services ?? [];
}

async function rawCategories(): Promise<ApiCategory[]> {
  "use cache";
  cacheTag("catalogue");
  return (await publicGet<{ categories: ApiCategory[] }>("/service-categories", { categories: [] }))?.categories ?? [];
}

function toVM(s: ApiService, l: Locale): ServiceVM {
  const mode = s.pricing_mode === "quote" ? "quote" : s.pricing_mode === "range" || (s.price_bands?.length ?? 0) > 0 ? "range" : "fixed";
  return {
    slug: s.slug,
    name: pick(s, "name", l) ?? s.slug,
    summary: pick(s, "short_description", l) ?? "",
    family: s.category,
    subArea: s.subcategory_ref ? { slug: s.subcategory_ref.slug, name: pick(s.subcategory_ref, "name", l) ?? s.subcategory } : null,
    priceMode: mode,
    fromFee: s.from_fee,
    tiers: s.pricing_tiers.filter((t) => t.isAvailable).map((t) => ({ key: t.tier, label: t.label, fee: t.fee, governmentFee: t.governmentFee, eta: t.eta, days: t.etaBusinessDays, includes: t.includes })),
    planCovered: s.plan_covered,
    popular: s.volume30d ?? 0,
    featured: s.is_featured,
    paused: s.status === "paused",
    slugs: { rw: s.locale_slugs?.rw || s.slug, en: s.locale_slugs?.en || s.slug, fr: s.locale_slugs?.fr || s.slug },
    consultation: s.engagement_type === "consultation",
    deliveryMode: s.delivery_mode,
    turnaround: { min: s.turnaround_days_min, max: s.turnaround_days_max },
  };
}

export async function getServices(l: Locale): Promise<ServiceVM[]> {
  return (await rawServices()).map((s) => toVM(s, l)).sort((a, b) => b.popular - a.popular || a.name.localeCompare(b.name));
}

export async function getFamilies(l: Locale): Promise<FamilyVM[]> {
  const [services, cats] = await Promise.all([getServices(l), rawCategories()]);
  return cats.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order).map((c, i) => {
    const art = FAMILIES.find((f) => f.slug === c.slug) ?? { ...FAMILIES[i % FAMILIES.length], slug: c.slug, short: undefined, promise: undefined };
    const name = pick(c, "name", l) ?? c.slug;
    const blurb = pick(c, "description", l) ?? "";
    const own = services.filter((s) => s.family === c.slug);
    const subs = new Map<string, { slug: string; name: string; count: number }>();
    own.forEach((s) => { if (s.subArea) { const e = subs.get(s.subArea.slug) ?? { ...s.subArea, count: 0 }; e.count++; subs.set(s.subArea.slug, e); } });
    return { slug: c.slug, icon: art.icon, tone: art.tone, photo: art.photo, name, blurb, short: art.short?.[l] ?? name, promise: art.promise?.[l] ?? blurb, count: own.length, subAreas: [...subs.values()], services: own };
  });
}

export async function getFamily(slug: string, l: Locale) {
  return (await getFamilies(l)).find((f) => f.slug === slug) ?? null;
}

async function rawDetail(slug: string): Promise<ApiDetail | null> {
  "use cache";
  cacheTag("catalogue", `service:${slug}`);
  return publicGet<ApiDetail | null>(`/services/${encodeURIComponent(slug)}`, null);
}

function requirementLabel(r: Record<string, unknown>, l: Locale): string | null {
  return (r[`label_${l}`] ?? r[`name_${l}`] ?? r.label_en ?? r.name_en ?? r.label ?? r.name ?? r.title ?? null) as string | null;
}

export async function getService(slug: string, l: Locale): Promise<ServiceDetailVM | null> {
  const s = (await rawServices()).find((x) => x.slug === slug || Object.values(x.locale_slugs ?? {}).includes(slug));
  if (!s) return null;
  const d = await rawDetail(slug);
  return {
    ...toVM(s, l),
    bands: [...(s.price_bands ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((b) => ({
      min: b.min_amount_rwf, max: b.max_amount_rwf ?? null,
      fee: b.fee_type === "percent" ? 0 : (b.fee_rwf ?? 0), rate: b.fee_type === "percent" ? (b.fee_percent ?? 0) : 0,
      minFee: b.min_fee_rwf ?? null, maxFee: b.max_fee_rwf ?? null,
    })),
    description: d ? pick(d as unknown as Record<string, unknown>, "description", l) : null,
    requirements: (d?.requirements ?? []).map((r) => requirementLabel(r, l)).filter((x): x is string => !!x),
    steps: (d?.structure?.steps ?? []).map((st) => (typeof st.title === "string" ? st.title : st.title?.[l] || st.title?.en || "")).filter(Boolean),
    eligibility: (s.eligibility ?? []).map((x) => x[l] || x.en).filter(Boolean),
    deliverables: (s.deliverables ?? []).map((x) => x[l] || x.en).filter(Boolean),
    seo: s.seo?.[l] ?? {},
    related: s.related_slugs ?? [],
    feeExplainer: s.fee_explainer ? s.fee_explainer[l] || s.fee_explainer.en || null : null,
    markets: s.markets ?? ["RW"],
  };
}

export async function getPlans(): Promise<PlanVM[]> {
  "use cache";
  cacheTag("plans");
  const plans = (await publicGet<{ plans: ApiPlan[] }>("/plans", { plans: [] }))?.plans ?? [];
  return plans.filter((p) => p.isActive && p.isPublic && p.onPricing).sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({ id: p.planId, name: p.name, amount: p.amountRwf, interval: p.interval, maxApps: p.maxApplicationsPerMonth, description: p.description, features: p.features, badge: p.badge }));
}

export const totalFee = (t: Tier) => t.fee + t.governmentFee;

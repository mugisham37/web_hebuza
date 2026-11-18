import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/shared/i18n/config";
import seedServices from "@/content/seed/services.json";
import seedPlans from "@/content/seed/plans.json";
import seedDetails from "@/content/seed/service-details.json";
import { FAMILIES, type FamilyMeta } from "@/content/families";

// Public catalogue (F-CAT-01..08). Catalogue service (database) first; falls back to the snapshot in src/content/seed
// (taken from www.hebuza.rw/api) so pages render with real data when the backend is unreachable.
// shortcut: seed is a point-in-time snapshot; refresh with `npm run seed:catalogue` until the API is always reachable at build.

type ApiTier = { tier: string; label: string; fee: number; governmentFee: number; eta: string; etaBusinessDays: number; includes: string[]; isAvailable: boolean };
type L10n = { name_rw: string; name_en: string; name_fr: string };
type ApiService = L10n & {
  slug: string; category: string; subcategory: string; subcategory_ref: L10n & { slug: string; sort_order: number } | null;
  short_description_rw: string | null; short_description_en: string | null; short_description_fr: string | null;
  pricing_tiers: ApiTier[]; pricing_mode: "fixed" | "range" | "quote" | string; from_fee: number | null;
  plan_covered: boolean; is_featured: boolean; volume30d: number | null; price_bands: { min_amount_rwf: number; max_amount_rwf?: number | null; fee_type: string; fee_rwf?: number | null; fee_percent?: number | null; min_fee_rwf?: number | null; max_fee_rwf?: number | null; sort_order: number }[]; range_basis_label: string | null; status: string;
};
type ApiDetail = { description_rw: string | null; description_en: string | null; description_fr: string | null; steps: { step_number: number; title?: string; title_en?: string; title_rw?: string; title_fr?: string }[] | null; requirements: Record<string, unknown>[] | null };
type ApiPlan = { planId: string; name: string; amountRwf: number; interval: string; maxApplicationsPerMonth: number | null; description: string; features: string[]; badge: string | null; sortOrder: number; isPublic: boolean; onPricing: boolean; isActive: boolean };

export type Tier = { key: string; label: string; fee: number; governmentFee: number; eta: string; days: number; includes: string[] };
export type ServiceVM = {
  slug: string; name: string; summary: string; family: string; subArea: { slug: string; name: string } | null;
  priceMode: "fixed" | "range" | "quote"; fromFee: number | null; tiers: Tier[]; planCovered: boolean; popular: number; featured: boolean; paused: boolean;
};
export type ServiceDetailVM = ServiceVM & { bands: { min: number; max: number | null; fee: number; rate: number; minFee: number | null; maxFee: number | null }[]; description: string | null; requirements: string[]; steps: string[] };
export type FamilyVM = Omit<FamilyMeta, "name" | "blurb" | "short" | "promise"> & { name: string; blurb: string; short: string; promise: string; count: number; subAreas: { slug: string; name: string; count: number }[]; services: ServiceVM[] };
export type PlanVM = { id: string; name: string; amount: number; interval: string; maxApps: number | null; description: string; features: string[]; badge: string | null };

const pick = (o: Record<string, unknown>, base: string, l: Locale) => (o[`${base}_${l}`] ?? o[`${base}_en`] ?? o[base] ?? null) as string | null;



async function rawServices(): Promise<ApiService[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  // Dummy catalogue until the backend exists (frontend-only build).
  return (seedServices as unknown as { data: { services: ApiService[] } }).data.services.filter((s) => s.status === "published" || s.status === "paused");
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
  };
}

export async function getServices(l: Locale): Promise<ServiceVM[]> {
  return (await rawServices()).map((s) => toVM(s, l)).sort((a, b) => b.popular - a.popular || a.name.localeCompare(b.name));
}

export async function getFamilies(l: Locale): Promise<FamilyVM[]> {
  const services = await getServices(l);
  return FAMILIES.map((f) => {
    const own = services.filter((s) => s.family === f.slug);
    const subs = new Map<string, { slug: string; name: string; count: number }>();
    own.forEach((s) => { if (s.subArea) { const e = subs.get(s.subArea.slug) ?? { ...s.subArea, count: 0 }; e.count++; subs.set(s.subArea.slug, e); } });
    return { ...f, name: f.name[l], blurb: f.blurb[l], short: f.short[l], promise: f.promise[l], count: own.length, subAreas: [...subs.values()], services: own };
  });
}

export async function getFamily(slug: string, l: Locale) {
  return (await getFamilies(l)).find((f) => f.slug === slug) ?? null;
}

async function rawDetail(slug: string): Promise<ApiDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue", `service:${slug}`);
  const seed = (seedDetails as Record<string, ApiDetail>)[slug] ?? null;
  // Requirements come from the published builder structure (API); copy/steps stay on the snapshot.
  if (!process.env.API_URL) return seed;
  const api = await fetch(`${process.env.API_URL}/api/services/${encodeURIComponent(slug)}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ data: ApiDetail }>) : null))
    .catch(() => null);
  return api?.data ? { ...(seed ?? api.data), requirements: api.data.requirements } : seed;
}

function requirementLabel(r: Record<string, unknown>, l: Locale): string | null {
  return (r[`label_${l}`] ?? r[`name_${l}`] ?? r.label_en ?? r.name_en ?? r.label ?? r.name ?? r.title ?? null) as string | null;
}

export async function getService(slug: string, l: Locale): Promise<ServiceDetailVM | null> {
  const s = (await rawServices()).find((x) => x.slug === slug);
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
    steps: (d?.steps ?? []).sort((a, b) => a.step_number - b.step_number).map((st) => (st[`title_${l}` as "title_en"] ?? st.title_en ?? st.title ?? "") as string).filter(Boolean),
  };
}

export async function getPlans(): Promise<PlanVM[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("plans");
  const plans = (seedPlans as unknown as { data: { plans: ApiPlan[] } }).data.plans;
  return plans.filter((p) => p.isActive && p.isPublic && p.onPricing).sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({ id: p.planId, name: p.name, amount: p.amountRwf, interval: p.interval, maxApps: p.maxApplicationsPerMonth, description: p.description, features: p.features, badge: p.badge }));
}

export const totalFee = (t: Tier) => t.fee + t.governmentFee;

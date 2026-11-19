import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getService, getServices } from "@/lib/catalogue";
import { ApplyWizard } from "@/components/organisms/flow/apply-wizard";

// Only the top services prerender (≥1 param required); the rest render on demand.
export const generateStaticParams = async () => {
  const top = (await getServices("en")).slice(0, 3).map((s) => ({ slug: s.slug }));
  return top.length ? top : [{ slug: "_" }];
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const s = await getService(slug, locale);
  return { title: s?.name, robots: { index: false } };
}

// /apply/[slug] (C04, F-REQ-01/02/10/11): service facts come from the catalogue; the wizard is a client island.
export default async function ApplyPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const s = await getService(slug, locale);
  if (!s) notFound();
  return (
    <ApplyWizard
      service={{ slug: s.slug, name: s.name, family: s.family, tiers: s.tiers, requirements: s.requirements, paused: s.paused }}
    />
  );
}

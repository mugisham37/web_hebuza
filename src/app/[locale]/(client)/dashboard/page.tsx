import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getServices } from "@/lib/catalogue";
import { c2Copy } from "@/content/pages/c2";
import { DashboardView } from "@/components/organisms/client/dashboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: c2Copy(locale).dash.title, robots: { index: false } };
}

// C06 — photos/To_build/client/06-dashboard__v1. Recommended = featured catalogue services (server), the rest is a client island.
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const recs = (await getServices(locale))
    .toSorted((a, b) => Number(b.featured) - Number(a.featured) || b.popular - a.popular)
    .slice(0, 3)
    .map(({ slug, name, fromFee }) => ({ slug, name, fromFee }));
  return <DashboardView recs={recs} />;
}

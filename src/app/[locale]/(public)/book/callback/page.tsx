import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { getFamilies } from "@/lib/catalogue";
import { bkgCopy } from "@/lib/booking/copy";
import { CallbackForm } from "@/components/organisms/booking/flow";
import { BookShell } from "../_hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).callback;
  return pageMeta(locale, "/book/callback", { title: c.title, description: c.lead });
}

// /book/callback (plan 11 §7.7, F-BKG-05).
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).callback;
  const families = await getFamilies(locale);
  return (
    <BookShell title={c.title} lead={c.lead}>
      <div className="max-w-xl border border-border bg-white p-6 sm:p-8"><CallbackForm topics={families.map((f) => ({ slug: f.slug, name: f.name }))} /></div>
    </BookShell>
  );
}

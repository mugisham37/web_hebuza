import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { VendorProfile } from "@/components/organisms/procurement/vendor-profile";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { id } = await params;
  return { title: `${decodeURIComponent(id)} · ${procurementAb(locale).vendors.title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "v-kiyovu" }));

// S3–S6 Supplier profile (board 02). URL: ?tab=
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><VendorProfile id={decodeURIComponent(id)} /></Suspense>;
}

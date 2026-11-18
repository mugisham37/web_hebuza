import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getServices } from "@/lib/catalogue";
import { bkgCopy } from "@/lib/booking/copy";
import { ConsultationRoom } from "@/components/organisms/booking/staff";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: bkgCopy(locale).adviser.openRoom, robots: { index: false } };
}

// Consultation room (plan 11 §7.9, BA3/BA4). ?tab=notes|actions|history. Not assigned → 404 view.
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await getI18n(params);
  const { id } = await params;
  const services = (await getServices(locale)).map((s) => ({ slug: s.slug, name: s.name, fromFee: s.fromFee }));
  return <Suspense><ConsultationRoom id={id} staff={false} services={services} /></Suspense>;
}

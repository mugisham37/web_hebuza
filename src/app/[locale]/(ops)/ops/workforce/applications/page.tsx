import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { opsWorkforce } from "@/content/pages/ops-workforce";
import { ApplicationsView } from "@/components/organisms/ops/applications";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: opsWorkforce(locale).apps.title, robots: { index: false } };
}

// Stage 8: review /join applications (?ref= opens one).
export default function Page() {
  return <Suspense><ApplicationsView /></Suspense>;
}

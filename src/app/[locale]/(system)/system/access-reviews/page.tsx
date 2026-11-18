import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemGovernance } from "@/content/pages/system-governance";
import { ReviewsView } from "@/components/organisms/system/access-reviews";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemGovernance(locale).title, robots: { index: false } };
}

// U7 Access reviews (lane C).
export default function Page() {
  return (
    <Suspense>
      <ReviewsView />
    </Suspense>
  );
}

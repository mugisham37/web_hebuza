import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementC } from "@/content/pages/procurement-c";
import { RequestsView } from "@/components/organisms/procurement/requests";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementC(locale).board.title, robots: { index: false } };
}

// Stage 12 lane C. View state lives in the URL (useUrlParams).
export default function Page() {
  return (
    <Suspense>
      <RequestsView />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementC } from "@/content/pages/procurement-c";
import { OrdersView } from "@/components/organisms/procurement/orders";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementC(locale).po.title, robots: { index: false } };
}

// Stage 12 lane C. View state lives in the URL (useUrlParams).
export default function Page() {
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}

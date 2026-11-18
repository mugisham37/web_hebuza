import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemOps } from "@/content/pages/system-ops";
import { OpsView } from "@/components/organisms/system/operations";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemOps(locale).title, robots: { index: false } };
}

// U16 Operations (lane F).
export default function Page() {
  return (
    <Suspense>
      <OpsView />
    </Suspense>
  );
}

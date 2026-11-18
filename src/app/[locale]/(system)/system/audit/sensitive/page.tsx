import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemAudit } from "@/content/pages/system-audit";
import { SensitiveView } from "@/components/organisms/system/sensitive";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemAudit(locale).sensitive, robots: { index: false } };
}

// U13 Sensitive access (lane E).
export default function Page() {
  return (
    <Suspense>
      <SensitiveView />
    </Suspense>
  );
}

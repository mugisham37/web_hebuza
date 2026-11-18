import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemRoles } from "@/content/pages/system-roles";
import { MatrixView } from "@/components/organisms/system/matrix";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemRoles(locale).matrix, robots: { index: false } };
}

// U5 Permission matrix (lane C).
export default function Page() {
  return (
    <Suspense>
      <MatrixView />
    </Suspense>
  );
}

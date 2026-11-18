import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { opsWorkforce } from "@/content/pages/ops-workforce";
import { WorkforceView } from "@/components/organisms/ops/workforce";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: opsWorkforce(locale).title, robots: { index: false } };
}

// W1 talent directory (Stage 12 lane F). Approvals stay in /ops/workload?tab=approvals.
export default function Page() {
  return <Suspense><WorkforceView /></Suspense>;
}

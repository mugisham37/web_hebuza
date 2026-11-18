import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { opsWorkforce } from "@/content/pages/ops-workforce";
import { WorkerCreateView } from "@/components/organisms/ops/worker-create";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: opsWorkforce(locale).title, robots: { index: false } };
}

export default function Page() {
  return <Suspense><WorkerCreateView /></Suspense>;
}

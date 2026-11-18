import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { workOnboarding } from "@/content/pages/work-onboarding";
import { WorkOnboarding } from "@/components/organisms/agent/work-onboarding";
import type { ObStep } from "@/lib/work/b";

// Plain copy of lib/work/b STEPS: values from a "use client" module are client references on the server.
const STEPS: ObStep[] = ["identity", "credentials", "agreements", "payout", "services", "review"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workOnboarding(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.flatMap((locale) => STEPS.map((step) => ({ locale, step })));

// Stage 8 §7.4 onboarding & clearance gate, board 04 (lane B).
export default async function Page({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!STEPS.includes(step as ObStep)) notFound();
  return (
    <Suspense>
      <WorkOnboarding step={step as ObStep} />
    </Suspense>
  );
}

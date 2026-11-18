import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { agentOnboarding } from "@/content/pages/agent-onboarding";
import { OnboardingView } from "@/components/organisms/agent/onboarding";
import type { Step } from "@/lib/agent/f";

// Plain copy of lib/agent/f STEPS: values from a "use client" module are client references on the server.
const STEPS: Step[] = ["profile", "cv", "certificates", "payout", "agreements"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentOnboarding(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.flatMap((locale) => STEPS.map((step) => ({ locale, step })));

// U2 Onboarding & clearance, board 03 (lane F).
export default async function Page({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!STEPS.includes(step as Step)) notFound();
  return (
    <Suspense>
      <OnboardingView step={step as Step} />
    </Suspense>
  );
}

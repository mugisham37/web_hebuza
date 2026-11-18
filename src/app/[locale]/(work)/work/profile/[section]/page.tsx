import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { agentProfile } from "@/content/pages/agent-profile";
import { WorkProfileView } from "@/components/organisms/agent/work-profile";

// Plain copy of WORK_SECTIONS: values from a "use client" module are client references on the server.
const SECTIONS = ["profile", "services", "availability", "credentials", "payout", "notifications", "security"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentProfile(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.flatMap((locale) => SECTIONS.map((section) => ({ locale, section })));

// Stage 8 lane F · board 11 PR1–PR4.
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.includes(section)) notFound();
  return (
    <Suspense>
      <WorkProfileView section={section} />
    </Suspense>
  );
}

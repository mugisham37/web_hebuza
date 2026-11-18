import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { agentProfile } from "@/content/pages/agent-profile";
import { ProfileView, type Section } from "@/components/organisms/agent/profile";

// Plain copy of profile.tsx SECTIONS: values from a "use client" module are client references on the server.
const SECTIONS: Section[] = ["profile", "skills", "availability", "contract", "notifications", "security"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string; section: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { section } = await params;
  const p = agentProfile(locale);
  return { title: p.sections[section as Section] ?? p.title, robots: { index: false } };
}
export const generateStaticParams = () => locales.flatMap((locale) => SECTIONS.map((section) => ({ locale, section })));

// U13 Profile & settings, board 13 (lane F).
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.includes(section as Section)) notFound();
  return (
    <Suspense>
      <ProfileView section={section as Section} />
    </Suspense>
  );
}

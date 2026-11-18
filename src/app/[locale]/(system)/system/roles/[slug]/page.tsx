import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemRoles } from "@/content/pages/system-roles";
import { RoleBuilderView } from "@/components/organisms/system/role-builder";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemRoles(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, slug: "sysadmin" }));

// U6 Role (lane C).
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <RoleBuilderView slug={decodeURIComponent(slug)} />
    </Suspense>
  );
}

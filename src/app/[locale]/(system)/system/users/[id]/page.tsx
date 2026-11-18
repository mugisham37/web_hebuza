import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemUsers } from "@/content/pages/system-users";
import { UserDetailView } from "@/components/organisms/system/user-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemUsers(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "mock-sysadmin" }));

// U4 User detail (lane B).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <UserDetailView id={decodeURIComponent(id)} />
    </Suspense>
  );
}

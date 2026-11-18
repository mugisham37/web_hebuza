import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemRoles } from "@/content/pages/system-roles";
import { RolesView } from "@/components/organisms/system/roles";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemRoles(locale).title, robots: { index: false } };
}

// U5 Roles (lane C).
export default function Page() {
  return (
    <Suspense>
      <RolesView />
    </Suspense>
  );
}

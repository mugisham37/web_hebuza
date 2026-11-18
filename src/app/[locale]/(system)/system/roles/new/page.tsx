import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemRoles } from "@/content/pages/system-roles";
import { RoleBuilderView } from "@/components/organisms/system/role-builder";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemRoles(locale).newRole, robots: { index: false } };
}

// U6 Custom role (lane C).
export default function Page() {
  return (
    <Suspense>
      <RoleBuilderView />
    </Suspense>
  );
}

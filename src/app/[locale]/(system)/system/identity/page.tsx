import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemUsers } from "@/content/pages/system-users";
import { IdentityView } from "@/components/organisms/system/identity";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemUsers(locale).identity, robots: { index: false } };
}

// U10 Identity checks (lane B).
export default function Page() {
  return (
    <Suspense>
      <IdentityView />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemUsers } from "@/content/pages/system-users";
import { UsersView } from "@/components/organisms/system/users";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemUsers(locale).title, robots: { index: false } };
}

// U3 Users (lane B).
export default function Page() {
  return (
    <Suspense>
      <UsersView />
    </Suspense>
  );
}

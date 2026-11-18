import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemNotifications } from "@/content/pages/system-notifications";
import { NotificationsView } from "@/components/organisms/system/notifications";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemNotifications(locale).title, robots: { index: false } };
}

// U14 Notifications (lane E).
export default function Page() {
  return (
    <Suspense>
      <NotificationsView />
    </Suspense>
  );
}

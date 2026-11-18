import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemPrivacy } from "@/content/pages/system-privacy";
import { PrivacyView } from "@/components/organisms/system/privacy";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemPrivacy(locale).title, robots: { index: false } };
}

// U15 Privacy (lane F).
export default function Page() {
  return (
    <Suspense>
      <PrivacyView />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentProfile } from "@/content/pages/agent-profile";
import { ProfileView } from "@/components/organisms/agent/profile";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentProfile(locale).title, robots: { index: false } };
}

// U13 alias: phone shows the settings list (PST), desktop shows the Profile & CV section.
export default function Page() {
  return (
    <Suspense>
      <ProfileView section={null} />
    </Suspense>
  );
}

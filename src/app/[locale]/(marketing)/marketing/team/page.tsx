import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { teamProfileCopy } from "@/content/pages/team-profile";
import { TeamQueue } from "@/components/organisms/marketing/team-queue";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: teamProfileCopy(locale).queue, robots: { index: false } };
}

// F-WRK-16: approve worker opt-ins for the public team page.
export default function Page() {
  return <TeamQueue />;
}

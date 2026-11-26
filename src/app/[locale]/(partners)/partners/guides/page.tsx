import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { guidesCopy } from "@/content/guides/copy";
import { WorkspaceGuidesPage } from "@/components/organisms/site/workspace-guides-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners/guides">): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: guidesCopy(locale).helpTitle, robots: { index: false, follow: false } };
}
// partners dashboard guides (role-filtered on the server; see src/content/guides/workspaces).
export default async function Page({ params }: PageProps<"/[locale]/partners/guides">) {
  const { locale } = await getI18n(params);
  return <WorkspaceGuidesPage locale={locale} workspace="partners" />;
}

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { bkgCopy } from "@/lib/booking/copy";
import { AssistantPage } from "@/components/organisms/booking/assistant";
import { BookShell } from "../book/_hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).aia.page;
  return pageMeta(locale, "/assistant", { title: c.title, description: c.lead });
}

// /assistant (plan 11 §7.11): same panel inline + recent sessions for signed-in clients.
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).aia.page;
  return <BookShell title={c.title} lead={c.lead}><AssistantPage /></BookShell>;
}

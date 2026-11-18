import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { c2Copy } from "@/content/pages/c2";
import { Inbox } from "@/components/organisms/client/inbox";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: c2Copy(locale).msg.title, robots: { index: false } };
}

// C08 global inbox (F-CLP-09, mobile nav "Messages"). Threads open inside the request's Messages tab.
export default function Page() {
  return <Inbox />;
}

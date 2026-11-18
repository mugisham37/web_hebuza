import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { c2Copy } from "@/content/pages/c2";
import { RequestsList } from "@/components/organisms/client/requests";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: c2Copy(locale).req.title, robots: { index: false } };
}

// C07 list (F-CLP-06).
export default function Page() {
  return <RequestsList />;
}

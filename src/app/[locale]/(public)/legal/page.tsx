import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";

export default async function LegalIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  redirect(localHref(locale, "/legal/terms"));
}

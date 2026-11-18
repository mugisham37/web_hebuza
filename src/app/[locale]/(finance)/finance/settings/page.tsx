import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";

// U17: /finance/settings → first section (lane F).
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  redirect(localHref(locale, "/finance/settings/tax"));
}

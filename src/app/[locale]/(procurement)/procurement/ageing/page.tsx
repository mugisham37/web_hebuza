import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";

// BUILD-PLAN alias kept: /procurement/ageing → reports ageing tab (plan 12 §7 R1).
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  redirect(localHref(locale, "/procurement/reports?tab=ageing"));
}

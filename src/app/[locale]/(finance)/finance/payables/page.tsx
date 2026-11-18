import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementDe } from "@/content/pages/procurement-de";
import { PayablesView } from "@/components/organisms/procurement/payables";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementDe(locale).payables.title, robots: { index: false } };
}

// Stage 12 F1–F4 supplier payables in the finance workspace. URL: ?tab=approve|authorise|pay|bank|settings&item=
export default function Page() {
  return <PayablesView />;
}

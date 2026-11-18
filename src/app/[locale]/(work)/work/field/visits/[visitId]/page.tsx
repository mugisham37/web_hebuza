import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { VisitPage } from "@/components/organisms/field/visit-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: fieldCopy(locale).field, robots: { index: false } };
}
// One template per locale: the client island reads the id from the URL and data from IndexedDB, so the SW can serve
// the same cached HTML for any visit offline (plan §2.9.2, §7.1).
export const generateStaticParams = () => locales.map((locale) => ({ locale, visitId: "fv-115" }));

// U3 visit detail + U5 flow (?step=checkin|work|receipt|checkout), boards 02 FH3, 04, 05 (lanes A/B/C).
export default function Page() {
  return (
    <Suspense>
      <VisitPage />
    </Suspense>
  );
}

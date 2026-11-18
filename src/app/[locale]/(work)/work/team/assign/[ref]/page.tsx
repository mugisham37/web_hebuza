import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { workFirm } from "@/content/pages/work-firm";
import { AssignInternally } from "@/components/organisms/agent/work-firm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; ref: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { ref } = await params;
  return { title: `${decodeURIComponent(ref)} · ${workFirm(locale).assign}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, ref: "HBZ-4K2M9Q" }));

// Assign a firm job internally, board 10 FM2 (lane G).
export default async function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <Suspense>
      <AssignInternally refId={decodeURIComponent(ref)} />
    </Suspense>
  );
}

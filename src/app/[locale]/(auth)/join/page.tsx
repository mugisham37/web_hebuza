import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { workApply } from "@/content/pages/work-apply";
import { ApplicationWizard } from "@/components/organisms/agent/work-apply";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workApply(locale).title };
}

// /join = the external-agent application (F-WRK-09, Stage 8 §7.3): an applicant record, no account. ?step=profile…review
export default function Page() {
  return (
    <Suspense>
      <ApplicationWizard />
    </Suspense>
  );
}

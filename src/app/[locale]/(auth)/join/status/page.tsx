import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { workApply } from "@/content/pages/work-apply";
import { ApplicationStatus } from "@/components/organisms/agent/work-status";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workApply(locale).status.title, robots: { index: false } };
}

// /join/status?ref= — application tracker behind an email OTP (Stage 8 §7.3).
export default function Page() {
  return (
    <Suspense>
      <ApplicationStatus />
    </Suspense>
  );
}

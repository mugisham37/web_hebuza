import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { opsIntake } from "@/content/pages/ops-intake";
import { IntakeView } from "@/components/organisms/ops/intake";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: opsIntake(locale).title, robots: { index: false } };
}

// U5 Intake, board 05 (lane A). URL: ?tab&q&flag&service&payment&sel&dup.
export default function Page() {
  return (
    <Suspense>
      <IntakeView />
    </Suspense>
  );
}

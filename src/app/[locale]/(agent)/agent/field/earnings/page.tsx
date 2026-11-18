import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { FieldEarnings } from "@/components/organisms/field/field-earnings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = fieldCopy(locale);
  return { title: `${c.nav.earnings} · ${c.field}`, robots: { index: false } };
}

// U12 field earnings, board 07 EX3 (lane E). ?month=
export default function Page() {
  return (
    <Suspense>
      <FieldEarnings />
    </Suspense>
  );
}

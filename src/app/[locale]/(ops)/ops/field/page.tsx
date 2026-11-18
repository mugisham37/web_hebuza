import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { FieldQueue } from "@/components/organisms/field/field-queue";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = fieldCopy(locale);
  return { title: `${c.field}`, robots: { index: false } };
}

// U16 /ops/field (lane F). ?tab=flags|conflicts|expenses|custody|visits&visit=
export default function Page() {
  return (
    <Suspense>
      <FieldQueue />
    </Suspense>
  );
}

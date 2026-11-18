import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { OutboxView } from "@/components/organisms/field/outbox";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = fieldCopy(locale);
  return { title: `${c.nav.outbox} · ${c.field}`, robots: { index: false } };
}

// U9/U10 outbox + conflict review, board 06 (lane D). ?item=<opId>
export default function Page() {
  return (
    <Suspense>
      <OutboxView />
    </Suspense>
  );
}

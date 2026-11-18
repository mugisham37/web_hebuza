import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { ExpenseList } from "@/components/organisms/field/expense-list";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = fieldCopy(locale);
  return { title: `${c.nav.expenses} · ${c.field}`, robots: { index: false } };
}

// U11 expenses list, board 07 (lane E). ?state=&month=
export default function Page() {
  return (
    <Suspense>
      <ExpenseList />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { ExpenseForm } from "@/components/organisms/field/expense-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = fieldCopy(locale);
  return { title: `${c.nav.expenses} · ${c.field}`, robots: { index: false } };
}

// U11 new expense, board 07 EX1 (lane E). ?visit=<id>
export default function Page() {
  return (
    <Suspense>
      <ExpenseForm />
    </Suspense>
  );
}

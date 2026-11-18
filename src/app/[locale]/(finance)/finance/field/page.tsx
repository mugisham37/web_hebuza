import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceFieldView } from "@/components/organisms/field/finance-field";

export const metadata: Metadata = { title: "Field", robots: { index: false } };

// Stage 9: L2 expense approval + cash custody confirmation.
export default function Page() {
  return <Suspense><FinanceFieldView /></Suspense>;
}

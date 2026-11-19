import { Suspense } from "react";
import type { Metadata } from "next";
import { PromoCodes } from "@/components/organisms/marketing/promo-codes";

export const metadata: Metadata = { robots: { index: false } };

// F-CRM-20 promo codes (applied by finance on invoice creation).
export default function Page() {
  return <Suspense><PromoCodes /></Suspense>;
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { PayReturn } from "@/components/organisms/flow/pay-flow";

export const metadata: Metadata = { robots: { index: false } };
export const generateStaticParams = () => [{ ref: "HBZ-WMVX19" }];

// /pay/[ref]/return: provider redirect target; confirms the payment by polling (quotes-invoices-payments spec).
export default async function PayReturnPage({ params }: { params: Promise<{ locale: string; ref: string }> }) {
  const { ref } = await params;
  return (
    <Suspense>
      <PayReturn code={decodeURIComponent(ref)} />
    </Suspense>
  );
}

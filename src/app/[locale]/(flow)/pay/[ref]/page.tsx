import type { Metadata } from "next";
import { Suspense } from "react";
import { PayFlow } from "@/components/organisms/flow/pay-flow";

export const metadata: Metadata = { robots: { index: false } };
// One sample ref so the [locale] layout metadata can prerender (Cache Components); other refs render on request.
export const generateStaticParams = () => [{ ref: "HBZ-WMVX19" }];

// /pay/[ref] (C05, B4/B12): ref = application code. Everything is per-user, so it renders on the client.
export default async function PayPage({ params }: { params: Promise<{ locale: string; ref: string }> }) {
  const { ref } = await params;
  return (
    <Suspense>
      <PayFlow code={decodeURIComponent(ref)} />
    </Suspense>
  );
}

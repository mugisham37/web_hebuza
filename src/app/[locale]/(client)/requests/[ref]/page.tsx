import { Suspense } from "react";
import type { Metadata } from "next";
import { RequestDetailView } from "@/components/organisms/client/request-detail";

// Static metadata: [ref] is runtime data, and awaiting params here would block the prerender.
export const metadata: Metadata = { robots: { index: false } };

// C07 detail. Params are runtime data (no generateStaticParams), so the island reads them under Suspense.
// One sample ref so the [locale] layout metadata can prerender (Cache Components); other refs render on request.
export const generateStaticParams = () => [{ ref: "HBZ-WMVX19" }];

export default function Page() {
  return <Suspense><RequestDetailView /></Suspense>;
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { RecommendationRules } from "@/components/organisms/marketing/recommendation-rules";

export const metadata: Metadata = { robots: { index: false } };

// F-CRM-11 next-service recommendation rules (shown on the customer 360).
export default function Page() {
  return <Suspense><RecommendationRules /></Suspense>;
}

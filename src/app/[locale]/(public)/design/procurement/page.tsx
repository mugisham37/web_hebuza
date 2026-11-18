import type { Metadata } from "next";
import { Suspense } from "react";
import { ProcurementKitShowcase } from "./showcase";

// Stage 12 procurement kit (plan 12 §5.2–5.3): atoms and molecules in their states. Not indexed.
export const metadata: Metadata = { title: "Procurement kit", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><ProcurementKitShowcase /></Suspense>;
}

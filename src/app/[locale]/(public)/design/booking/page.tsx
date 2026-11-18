import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingKitShowcase } from "./showcase";

// Stage 11 booking + assistant kit (plan 11 §4–5): atoms/molecules in their states. Not indexed.
export const metadata: Metadata = { title: "Booking & assistant kit", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><BookingKitShowcase /></Suspense>;
}

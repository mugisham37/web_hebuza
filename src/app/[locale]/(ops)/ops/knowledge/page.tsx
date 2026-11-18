import { Suspense } from "react";
import type { Metadata } from "next";
import { KbSources } from "@/components/organisms/booking/staff-ai";

export const metadata: Metadata = { title: "Knowledge base", robots: { index: false } };

// KB sources (plan 11 §7.14, KB1/KB4). ?tab&q&locale&status&stale
export default function Page() {
  return <Suspense><KbSources base="/ops" /></Suspense>;
}

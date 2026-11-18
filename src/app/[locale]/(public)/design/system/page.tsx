import type { Metadata } from "next";
import { Suspense } from "react";
import { SystemKitShowcase } from "./showcase";

// Stage 6 System Administrator kit (board 01, plan 06 §5.2–5.3): every system atom + molecule in every state. Not indexed.
export const metadata: Metadata = { title: "System kit", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><SystemKitShowcase /></Suspense>;
}

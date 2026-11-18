import type { Metadata } from "next";
import { Suspense } from "react";
import { OpsKitShowcase } from "./showcase";

// Stage 3 staff component kit (board 01 v2). Not indexed.
export const metadata: Metadata = { title: "Ops kit", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><OpsKitShowcase /></Suspense>;
}

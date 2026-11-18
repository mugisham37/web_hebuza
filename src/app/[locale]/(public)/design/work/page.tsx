import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkKitShowcase } from "./showcase";

// Stage 8 external-agent component kit (board 01, plan §11.2): every work atom/molecule in every state. Not indexed.
export const metadata: Metadata = { title: "External agent kit", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><WorkKitShowcase /></Suspense>;
}

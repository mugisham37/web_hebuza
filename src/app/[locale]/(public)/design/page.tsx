import { Suspense } from "react";
import type { Metadata } from "next";
import { DesignShowcase } from "./showcase";

// Living design-system reference (tokens + every primitive). Not indexed.
export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><DesignShowcase /></Suspense>;
}

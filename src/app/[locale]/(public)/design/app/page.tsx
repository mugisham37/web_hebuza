import type { Metadata } from "next";
import { AppKitShowcase } from "./showcase";

// App-layer components (C01). Base primitives live on /design. Not indexed.
export const metadata: Metadata = { title: "App kit", robots: { index: false, follow: false } };

export default function Page() {
  return <AppKitShowcase />;
}

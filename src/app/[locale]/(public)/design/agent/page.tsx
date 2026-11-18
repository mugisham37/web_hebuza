import type { Metadata } from "next";
import { Suspense } from "react";
import { AgentKitShowcase } from "./showcase";

// Stage 4 agent component kit (board 01, plan §1.10): every agent atom in every state. Not indexed.
export const metadata: Metadata = { title: "Agent kit", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><AgentKitShowcase /></Suspense>;
}

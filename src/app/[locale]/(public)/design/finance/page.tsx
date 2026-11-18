import type { Metadata } from "next";
import { Suspense } from "react";
import { FinanceKitShowcase } from "./showcase";
import { KitA } from "@/components/organisms/finance/showcase";
import { KitB } from "@/components/organisms/finance/showcase";
import { KitC } from "@/components/organisms/finance/showcase";
import { KitD } from "@/components/organisms/finance/showcase";
import { KitE } from "@/components/organisms/finance/showcase";
import { KitF } from "@/components/organisms/finance/showcase";

// Stage 5 finance component kit (board 01, plan §5.3–5.6, U2): every finance atom/molecule in every state. Not indexed.
export const metadata: Metadata = { title: "Finance kit", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense><FinanceKitShowcase /><KitA /><KitB /><KitC /><KitD /><KitE /><KitF /></Suspense>;
}

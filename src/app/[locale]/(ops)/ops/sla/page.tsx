import { Suspense } from "react";
import { SlaView } from "@/components/organisms/ops/sla";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><SlaView /></Suspense>;
}

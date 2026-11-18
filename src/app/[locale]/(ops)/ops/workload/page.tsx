import { Suspense } from "react";
import { WorkloadView } from "@/components/organisms/ops/workload";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><WorkloadView /></Suspense>;
}

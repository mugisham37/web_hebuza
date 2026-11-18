import { Suspense } from "react";
import { ReviewQueue } from "@/components/organisms/ops/reviews";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><ReviewQueue /></Suspense>;
}

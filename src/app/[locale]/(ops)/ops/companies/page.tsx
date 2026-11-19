import { Suspense } from "react";
import { CompanyQueue } from "@/components/organisms/ops/companies";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><CompanyQueue /></Suspense>;
}

import { Suspense } from "react";
import { PartnerCommissions } from "@/components/organisms/partners/partners";

export const metadata = { robots: { index: false } };
export default function Page() {
  return <Suspense><PartnerCommissions /></Suspense>;
}

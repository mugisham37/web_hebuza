import { Suspense } from "react";
import { PartnerList } from "@/components/organisms/partners/partners";

export const metadata = { robots: { index: false } };
export default function Page() {
  return <Suspense><PartnerList /></Suspense>;
}

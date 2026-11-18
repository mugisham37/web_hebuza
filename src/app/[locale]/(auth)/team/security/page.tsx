import { Suspense } from "react";
import { StaffSecurityPanel } from "@/components/organisms/ops/team";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><StaffSecurityPanel /></Suspense>;
}

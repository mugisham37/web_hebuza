import { Suspense } from "react";
import { MfaSetup } from "@/components/organisms/ops/team";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><MfaSetup /></Suspense>;
}

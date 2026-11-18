import { Suspense } from "react";
import { MfaChallenge } from "@/components/organisms/ops/team";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><MfaChallenge /></Suspense>;
}

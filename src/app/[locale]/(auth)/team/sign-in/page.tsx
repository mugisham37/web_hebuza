import { Suspense } from "react";
import { TeamSignIn } from "@/components/organisms/ops/team";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><TeamSignIn /></Suspense>;
}

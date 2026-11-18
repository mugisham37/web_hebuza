import { Suspense } from "react";
import { ClaimForm } from "@/components/organisms/auth/recovery-forms";

export default function Page() {
  return <Suspense><ClaimForm /></Suspense>;
}

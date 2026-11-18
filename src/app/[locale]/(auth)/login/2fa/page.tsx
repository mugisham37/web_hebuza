import { Suspense } from "react";
import { TwoFactorForm } from "@/components/organisms/auth/login-forms";

export default function Page() {
  return <Suspense><TwoFactorForm /></Suspense>;
}

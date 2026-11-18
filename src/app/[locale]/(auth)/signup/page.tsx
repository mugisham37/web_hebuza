import { Suspense } from "react";
import { SignupForm } from "@/components/organisms/auth/signup-form";

export default function Page() {
  return <Suspense><SignupForm /></Suspense>;
}

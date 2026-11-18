import { Suspense } from "react";
import { LoginForm } from "@/components/organisms/auth/login-forms";

export default function Page() {
  return <Suspense><LoginForm /></Suspense>;
}

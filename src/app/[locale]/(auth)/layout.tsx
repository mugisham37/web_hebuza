import { Suspense } from "react";
import { AuthShell } from "@/components/organisms/auth/auth-shell";
import { CopyrightYear } from "@/components/organisms/site/sections";

// Suspense: the shell reads ?as (useSearchParams); auth pages render client-side from their params anyway.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-dvh bg-navy-950" />}><AuthShell year={<CopyrightYear />}>{children}</AuthShell></Suspense>;
}

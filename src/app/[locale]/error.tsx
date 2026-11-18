"use client";
import { useEffect } from "react";
import { ErrorView } from "@/components/organisms/site/error-view";
import { reportError } from "@/lib/observability";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportError(error, { digest: error.digest }); }, [error]);
  return <ErrorView error={error} reset={reset} />;
}

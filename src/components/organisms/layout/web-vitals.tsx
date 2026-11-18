"use client";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";
import { reportError, reportVital } from "@/lib/observability";

/** Core Web Vitals + uncaught errors → telemetry (F-OPS-03, F-PERF-01). */
export function WebVitals() {
  useReportWebVitals(reportVital);
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}

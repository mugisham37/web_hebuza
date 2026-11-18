import { Suspense } from "react";
import type { Metadata } from "next";
import { AssistantConsole } from "@/components/organisms/booking/staff-ai";

export const metadata: Metadata = { title: "Assistant console", robots: { index: false } };

// AI console ?tab=sessions|handoffs|unanswered|evals|spend (plan 11 §7.14).
export default function Page() {
  return <Suspense><AssistantConsole /></Suspense>;
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { KbReview } from "@/components/organisms/booking/staff-ai";

export const metadata: Metadata = { title: "Knowledge source", robots: { index: false } };

// KB review (KB2): facts (SM) + tone (marketing) approvals, diff, flags, withdraw.
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><KbReview id={id} base="/ops" /></Suspense>;
}

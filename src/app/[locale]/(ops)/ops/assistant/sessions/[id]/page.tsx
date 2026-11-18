import { Suspense } from "react";
import type { Metadata } from "next";
import { TranscriptViewer } from "@/components/organisms/booking/staff-ai";

export const metadata: Metadata = { title: "Transcript", robots: { index: false } };

// Transcript viewer: masked text, tool calls, sources, run meta.
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><TranscriptViewer id={id} /></Suspense>;
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { TicketView } from "@/components/organisms/client/ticket";

export const metadata: Metadata = { robots: { index: false } };

// C14 ticket detail. [id] is runtime data; one sample so the [locale] layout can prerender (Cache Components).
export const generateStaticParams = () => [{ id: "TKT-2026-00142" }];

export default function Page() {
  return <Suspense><TicketView /></Suspense>;
}

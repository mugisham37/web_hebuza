import { Suspense } from "react";
import { TicketView } from "@/components/organisms/ops/tickets";

export const metadata = { robots: { index: false } };
export const generateStaticParams = () => [{ ref: "TKT-2026-00142" }];

async function View({ params }: { params: Promise<{ ref: string }> }) {
  return <TicketView ticketRef={(await params).ref} />;
}
export default function Page({ params }: { params: Promise<{ ref: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

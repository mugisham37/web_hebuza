import { Suspense } from "react";
import { TicketQueue } from "@/components/organisms/ops/tickets";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><TicketQueue /></Suspense>;
}

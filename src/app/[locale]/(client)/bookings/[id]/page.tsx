import { Suspense } from "react";
import { ClientBookingDetail } from "@/components/organisms/booking/manage";

// /bookings/[id]: ManageBooking with portal auth + adviser notes + next steps. Not own → 404 view.
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientBookingDetail id={id} />;
}

import { Suspense } from "react";
import { OpsBookings } from "@/components/organisms/booking/bookings-board";

export const metadata = { robots: { index: false } };

// /ops/bookings?tab=board|requests|types|analytics (plan 11 §7.10). Replaces lane-F BookingsView (same booking-world store).
export default function Page() {
  return (
    <Suspense>
      <OpsBookings />
    </Suspense>
  );
}

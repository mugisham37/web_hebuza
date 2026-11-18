import { Suspense } from "react";
import { StatusesView } from "@/components/organisms/ops/statuses";

export const metadata = { robots: { index: false } };

// U17 SP4 sub-status settings, board 17 v2 (lane E).
export default function Page() {
  return (
    <Suspense>
      <StatusesView />
    </Suspense>
  );
}

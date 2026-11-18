import { Suspense } from "react";
import { CatalogueView } from "@/components/organisms/ops/catalogue";

export const metadata = { robots: { index: false } };

// U16 SB1 catalogue list, board 16 v2 (lane E). ?q=&cat=&status=
export default function Page() {
  return (
    <Suspense>
      <CatalogueView />
    </Suspense>
  );
}

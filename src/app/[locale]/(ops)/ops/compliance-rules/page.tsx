import { Suspense } from "react";
import { ComplianceRulesView } from "@/components/organisms/ops/compliance-rules";

export const metadata = { robots: { index: false } };

// F-CAL-01 deadline / compliance rules (BUILD-PLAN Appendix A, lane E). URL: ?q=&authority=&inactive=1
export default function Page() {
  return (
    <Suspense>
      <ComplianceRulesView />
    </Suspense>
  );
}

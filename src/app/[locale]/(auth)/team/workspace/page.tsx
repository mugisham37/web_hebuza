import { Suspense } from "react";
import { WorkspacePicker } from "@/components/organisms/ops/team";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><WorkspacePicker /></Suspense>;
}

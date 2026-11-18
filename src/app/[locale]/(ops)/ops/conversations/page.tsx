import { Suspense } from "react";
import { ConversationsConsole } from "@/components/organisms/ops/conversations";

export const metadata = { robots: { index: false } };

export default function Page() {
  return <Suspense><ConversationsConsole /></Suspense>;
}

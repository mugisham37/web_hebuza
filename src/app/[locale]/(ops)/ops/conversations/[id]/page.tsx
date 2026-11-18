import { Suspense } from "react";
import { ConversationPage } from "@/components/organisms/ops/conversations";

export const metadata = { robots: { index: false } };

async function View({ params }: { params: Promise<{ id: string }> }) {
  return <ConversationPage id={(await params).id} />;
}
// Conversation / AI handoff detail (plan 11 §8.2 `ai.handoff` deep link).
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

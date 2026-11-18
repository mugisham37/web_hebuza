"use client";
// Workbench Conversation tab (board 07 WC3, PW2). Lane B renders it; the dispute banner above it is lane B's.
import { Conversation } from "@/components/organisms/agent/thread";

export function CaseConversation({ caseRef }: { caseRef: string }) {
  return (
    <div className="h-[calc(100dvh-14rem)] min-h-[28rem] md:h-[min(72dvh,46rem)]">
      <Conversation caseRef={caseRef} />
    </div>
  );
}

"use client";
// Lane C · /work/jobs: the Stage 4 cases list, labelled Jobs (rows link to /work/jobs/[ref] via wsHref).
import { CasesView } from "@/components/organisms/agent/cases";
import { useH } from "@/components/organisms/agent/work-counter";

export function WorkJobs() {
  const h = useH();
  return <CasesView title={h.jobs.title} sub={h.jobs.sub} />;
}

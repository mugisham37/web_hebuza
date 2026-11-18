import { notFound } from "next/navigation";
import { isPlanned } from "@/lib/routes";
import { PlannedPage } from "@/components/organisms/layout/workspace-shell";
import { plannedParams } from "@/lib/routes";
import { ExecOverview } from "@/components/organisms/exec/overview";

// /exec is the executive overview; other planned exec routes stay placeholders until their stage ships.
export const generateStaticParams = () => plannedParams("exec", "/exec");

export default async function Page({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest } = await params;
  if (!rest?.length) return <ExecOverview />;
  if (!isPlanned(generateStaticParams(), rest)) notFound();
  return <PlannedPage workspace="exec" />;
}

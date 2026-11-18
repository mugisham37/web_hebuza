import { notFound } from "next/navigation";
import { isPlanned } from "@/lib/routes";
import { PlannedPage } from "@/components/organisms/layout/workspace-shell";
import { plannedParams } from "@/lib/routes";

// Placeholder until this workspace's stage ships (see Project/BUILD-PLAN.md).
export const generateStaticParams = () => plannedParams("ops", "/ops").filter((p) => p.rest);

export default async function Page({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest } = await params;
  if (!isPlanned(generateStaticParams(), rest)) notFound();
  return <PlannedPage workspace="ops" />;
}

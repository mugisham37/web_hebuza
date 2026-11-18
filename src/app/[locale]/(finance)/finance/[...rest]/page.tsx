import { notFound } from "next/navigation";
import { isPlanned, plannedParams } from "@/lib/routes";
import { PlannedPage } from "@/components/organisms/layout/workspace-shell";

// Unbuilt finance pages. Lanes add static route folders (they win over this catch-all) — never edit this file.
export const generateStaticParams = () => plannedParams("finance", "/finance").filter((p) => p.rest);

export default async function Page({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest } = await params;
  if (!isPlanned(generateStaticParams(), rest)) notFound();
  return <PlannedPage workspace="finance" />;
}

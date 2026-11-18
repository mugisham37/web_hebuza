import { notFound } from "next/navigation";
import { isPlanned, PUBLIC_PLANNED, PUBLIC_PREFIXES } from "@/lib/routes";
import { PublicPlanned } from "@/components/organisms/layout/planned";

// Public pages not built yet (Stage 1 remainder; /apply & /pay are Stage 2). Unknown paths still 404.
export const generateStaticParams = () => PUBLIC_PLANNED.map((p) => ({ rest: p.split("/").filter(Boolean) }));

export default async function Page({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest } = await params;
  const prefixed = !!rest?.length && PUBLIC_PREFIXES.includes(rest[0] as (typeof PUBLIC_PREFIXES)[number]);
  if (!prefixed && !isPlanned(generateStaticParams(), rest)) notFound();
  return <PublicPlanned stage={rest?.[0] === "apply" || rest?.[0] === "pay" ? 2 : 1} />;
}

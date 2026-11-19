import { Suspense } from "react";
import { PartnerDetail } from "@/components/organisms/partners/partners";

export const metadata = { robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><PartnerDetail id={decodeURIComponent(id)} /></Suspense>;
}

import { Suspense } from "react";
import { OrgDetail } from "@/components/organisms/client/org-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><OrgDetail id={decodeURIComponent(id)} /></Suspense>;
}

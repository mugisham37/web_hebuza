import { Suspense } from "react";
import { InviteForm } from "@/components/organisms/ops/team";

export const metadata = { robots: { index: false } };
export const generateStaticParams = () => [{ token: "sample" }];

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  return <InviteForm token={(await params).token} />;
}
export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense><Invite params={params} /></Suspense>;
}

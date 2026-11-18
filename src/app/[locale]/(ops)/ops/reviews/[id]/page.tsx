import { Suspense } from "react";
import { ReviewViewer } from "@/components/organisms/ops/reviews";

export const metadata = { robots: { index: false } };
export const generateStaticParams = () => [{ id: "rv-HBZ-4K2M9Q" }];

async function Viewer({ params }: { params: Promise<{ id: string }> }) {
  return <ReviewViewer id={(await params).id} />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><Viewer params={params} /></Suspense>;
}

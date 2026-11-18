"use client";
// Visit route body: id from the URL (one cached template serves every visit offline), ?step picks detail vs flow.
import { usePathname } from "next/navigation";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";
import { errorCopy } from "@/lib/api/error-copy";
import { ApiError } from "@/lib/api/client";
import { useFieldCopy } from "@/lib/field/copy";
import { useCopyA } from "@/lib/field/copy-a";
import { useVisit } from "@/lib/field/api";
import { useUrlParams } from "@/lib/url-state";
import { VisitFlow, type Step } from "@/components/organisms/field/visit-flow";
import { ArtCloudDown, FieldEmpty } from "@/components/atoms/field-art";
import { useFieldBase } from "@/components/atoms/field-agent";
import { VisitDetail } from "@/components/organisms/field/visit-detail";

const STEPS: Step[] = ["checkin", "work", "receipt", "checkout"];

export function VisitPage() {
  const id = decodeURIComponent(usePathname().split("/").filter(Boolean).at(-1) ?? "");
  const step = useUrlParams().get("step") as Step | null;
  const { c, locale } = useFieldCopy();
  const a = useCopyA();
  const base = useFieldBase();
  const { visit, isLoading, error, refetch, online } = useVisit(id);

  if (isLoading) return <div className="grid gap-3" aria-busy><Skeleton className="h-10 w-2/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (!visit) {
    if (!online) return <FieldEmpty art={<ArtCloudDown />} title={a.notOnPhone} body={a.notOnPhoneBody} action={<ButtonLink href={base()} variant="secondary">{c.back}</ButtonLink>} />;
    const nf = error instanceof ApiError && error.isNotFound;
    return (
      <FieldEmpty art={<ArtCloudDown />} title={nf ? a.notFound : errorCopy(error, locale)}
        action={<>{!nf && <Button onClick={() => void refetch()}>{c.retry}</Button>}<ButtonLink href={base()} variant="secondary">{c.back}</ButtonLink></>} />
    );
  }
  return step && STEPS.includes(step) ? <VisitFlow visit={visit} step={step} /> : <VisitDetail visit={visit} />;
}

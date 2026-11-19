"use client";
// ORG-03: accept a company invitation (7-day token from mail/SMS). Signed-out visitors sign in first and come back.
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";
import { AuthTitle, Notice, ResultPanel } from "@/components/molecules/auth/auth";
import { useC4 } from "@/components/molecules/client/client";
import { fill } from "@/content/pages/c4";

export function OrgInviteAccept() {
  const { c, locale } = useC4();
  const o = c.orgs;
  const token = useParams<{ token: string }>().token;
  const { status } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["org-invite", token],
    queryFn: () => unwrap(api.GET("/api/org-invites/{token}", { params: { path: { token } } })),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () => unwrap(api.POST("/api/org-invites/{token}/accept", { params: { path: { token } } })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["c4", "orgs"] }); },
  });
  if (q.isPending) return <div className="grid gap-4"><Skeleton className="h-10" /><Skeleton className="h-24" /></div>;
  if (q.isError) return <Notice>{q.error instanceof ApiError && q.error.isNotFound ? o.accept.expired : c.generic}</Notice>;
  const inv = q.data as { organization: string; role: "owner" | "admin" | "viewer"; state: "open" | "expired" | "accepted" };
  if (accept.isSuccess)
    return (
      <ResultPanel icon="check" title={fill(o.accept.done, { org: inv.organization })}>
        <ButtonLink href={localHref(locale, "/orgs")} variant="primary" dots>{o.title}</ButtonLink>
      </ResultPanel>
    );
  return (
    <>
      <AuthTitle title={o.accept.title} lede={fill(o.accept.body, { org: inv.organization, role: o.roles[inv.role] })} />
      {inv.state === "expired" && <Notice tone="warning">{o.accept.expired}</Notice>}
      {inv.state === "accepted" && <Notice tone="info">{o.accept.used}</Notice>}
      {accept.isError && <Notice>{accept.error instanceof ApiError && accept.error.status === 410 ? o.accept.expired : c.generic}</Notice>}
      {inv.state === "open" && (status === "authenticated" ? (
        <Button size="lg" dots loading={accept.isPending} onClick={() => accept.mutate()} className="w-full justify-center">{o.accept.cta}</Button>
      ) : (
        <>
          <Notice tone="info">{o.accept.signIn}</Notice>
          <Button size="lg" onClick={() => router.push(localHref(locale, `/login?next=${encodeURIComponent(`/org-invite/${token}`)}`))} className="w-full justify-center">{c.orgs.accept.cta}</Button>
        </>
      ))}
    </>
  );
}

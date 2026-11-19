"use client";
// DLV-06: single-use emailed/WhatsApp link → (client shell signs the user in first) → the file.
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { c3Copy } from "@/content/pages/c3";
import { ButtonLink } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";

export function DownloadLink() {
  const { locale } = useI18n();
  const c = c3Copy(locale).dlv.link;
  const token = useParams<{ token: string }>().token;
  const m = useMutation({
    mutationFn: () => unwrap<{ url: string }>(api.GET("/api/d/{token}", { params: { path: { token } } })),
    onSuccess: (r) => window.location.replace(r.url),
  });
  const { mutate } = m;
  useEffect(() => mutate(), [mutate]);
  return (
    <section className="mx-auto grid max-w-md gap-4 py-10" aria-live="polite">
      <h1 className="text-h3">{c.title}</h1>
      {m.isError ? (
        <>
          <p className="text-body text-fg-muted">{c.used}</p>
          <ButtonLink href={localHref(locale, "/documents?tab=deliverables")} variant="primary">{c.open}</ButtonLink>
        </>
      ) : (
        <>
          <p className="text-body text-fg-muted">{c.opening}</p>
          <Skeleton className="h-10" />
        </>
      )}
    </section>
  );
}

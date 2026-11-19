"use client";
// REQ-12: staff file a request on a consenting client's behalf (guest case + claim link sent to the client).
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, unwrap, newIdempotencyKey } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { usePublicServices } from "@/lib/work/a";
import { opsAssisted } from "@/content/pages/ops-assisted";
import { fill } from "@/content/pages/c4";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { toE164 } from "@/components/atoms/inputs";

export function AssistedForm() {
  const { locale } = useI18n();
  const c = opsAssisted(locale);
  const toast = useToast();
  const services = usePublicServices();
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const send = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<{ code: string }>(api.POST("/api/admin/applications/assisted", { body: body as never, headers: { "Idempotency-Key": key } })), // cast: form → AssistedDto
    onSuccess: (r, _v) => { toast({ title: fill(c.done, { code: r.code }), tone: "success" }); setKey(newIdempotencyKey()); },
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  return (
    <div className="grid max-w-2xl gap-5">
      <div><h1 className="text-h2">{c.title}</h1><p className="text-body text-fg-muted">{c.lede}</p></div>
      {services.isPending ? <Skeleton className="h-64" /> : (
        <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const v = (k: string) => String(f.get(k) ?? "").trim();
          const phone = v("phone") ? toE164(v("phone")) ?? v("phone") : "";
          if (!phone && !v("email")) return setErr(c.contactRequired);
          setErr(null);
          send.mutate({
            service_slug: v("service"), tier: "standard", idempotency_key: key, consent_method: v("consent"), consent_note: v("note") || null,
            personal_info: { fullName: v("name"), phone: phone || undefined, email: v("email") || undefined, nationalId: v("nid") || undefined, language: locale },
            service_data: { summary: v("summary") },
          });
        }}>
          <Field label={c.service} className="sm:col-span-2">{(a) => (
            <Select id={a.id} name="service" required>{(services.data?.items ?? []).map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</Select>
          )}</Field>
          <Field label={c.name}>{(a) => <Input id={a.id} name="name" required autoComplete="off" />}</Field>
          <Field label={c.nid}>{(a) => <Input id={a.id} name="nid" inputMode="numeric" autoComplete="off" />}</Field>
          <Field label={c.phone} error={err ?? undefined}>{(a) => <Input id={a.id} name="phone" type="tel" aria-describedby={a.describedBy} autoComplete="off" />}</Field>
          <Field label={c.email}>{(a) => <Input id={a.id} name="email" type="email" autoComplete="off" />}</Field>
          <Field label={c.summary} className="sm:col-span-2">{(a) => <Textarea id={a.id} name="summary" rows={3} />}</Field>
          <Field label={c.consent}>{(a) => (
            <Select id={a.id} name="consent">{(["verbal", "signed", "field_visit"] as const).map((k) => <option key={k} value={k}>{c.consents[k]}</option>)}</Select>
          )}</Field>
          <Field label={c.consentNote}>{(a) => <Input id={a.id} name="note" maxLength={500} />}</Field>
          <div className="sm:col-span-2"><Button type="submit" loading={send.isPending}>{c.submit}</Button></div>
        </form>
      )}
    </div>
  );
}

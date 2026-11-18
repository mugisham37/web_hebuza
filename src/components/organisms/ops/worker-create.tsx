"use client";
// W4 create: SM invites a person (status invited). Account permissions stay with the sysadmin (Stage 6).
// Mirrors ops/c/team InviteForm fields without forking it (that form is the invitee's acceptance flow).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useCreateWorker } from "@/lib/workforce";
import { fill } from "@/content/pages/ops-workforce";
import { PageHead } from "@/components/atoms/agent";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input, Radio } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { WorkforceDenied, canAdmin, useW } from "@/components/organisms/ops/workforce";

export function WorkerCreateView() {
  const c = useW();
  const { locale } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const m = useCreateWorker();
  const [key] = useState(newIdempotencyKey);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", type: "internal" as "internal" | "external", field: false });
  const [err, setErr] = useState<Record<string, string>>({});
  if (user && !canAdmin(user.roles)) return <WorkforceDenied />;
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  async function submit() {
    const e: Record<string, string> = {};
    if (!v.firstName.trim() || !v.lastName.trim()) e.name = c.create.errName;
    if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = c.create.errEmail;
    setErr(e);
    if (Object.keys(e).length) return;
    try {
      const r = await m.mutateAsync({ ...v, idempotencyKey: key });
      toast({ title: fill(c.create.done, { email: v.email }), tone: "success" });
      router.push(localHref(locale, `/ops/workforce/${r.id}`));
    } catch (x) { setErr({ form: errorCopy(x, locale) }); }
  }
  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <PageHead title={c.create.title} sub={c.create.sub} />
      <form className="grid gap-4 border border-border bg-white p-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {err.form && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err.form}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.create.first} error={err.name}>{(a) => <Input id={a.id} aria-invalid={a.invalid} autoComplete="off" value={v.firstName} onChange={(e) => set({ firstName: e.target.value })} />}</Field>
          <Field label={c.create.last}>{(a) => <Input id={a.id} autoComplete="off" value={v.lastName} onChange={(e) => set({ lastName: e.target.value })} />}</Field>
        </div>
        <Field label={c.create.email} error={err.email}>{(a) => <Input id={a.id} type="email" aria-invalid={a.invalid} aria-describedby={a.describedBy} value={v.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
        <Field label={c.create.phone} optional="optional">{(a) => <Input id={a.id} type="tel" inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />}</Field>
        <fieldset className="grid gap-2"><legend className="text-label">{c.create.type}</legend>
          <div className="flex gap-4">{(["internal", "external"] as const).map((t) => <Radio key={t} name="type" checked={v.type === t} onChange={() => set({ type: t })} label={c.type[t]} />)}</div>
        </fieldset>
        <Checkbox label={c.create.field} checked={v.field} onChange={(e) => set({ field: e.target.checked })} />
        <Button type="submit" loading={m.isPending} dots className="w-fit">{c.create.submit}</Button>
      </form>
    </div>
  );
}

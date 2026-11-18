"use client";
// W5 offboarding wizard (F-WRK-19, module §6.3/§7). Step in ?step=; finishing is blocked while any open case has no decision
// (new assignee or "keep with worker until closed"); the mock answers 409 cases_unresolved if forced.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useAssignees, useWorker, useWorkerStatus } from "@/lib/workforce";
import { fill } from "@/content/pages/ops-workforce";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { PanelError } from "@/components/molecules/ops/ops";
import { Stepper } from "@/components/atoms/misc";
import { Button } from "@/components/atoms/button";
import { Checkbox, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { WorkforceDenied, canAdmin, useW } from "@/components/organisms/ops/workforce";

export function OffboardView({ id }: { id: string }) {
  const c = useW();
  const { locale } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const p = useUrlParams();
  const q = useWorker(id);
  const people = useAssignees(id);
  const m = useWorkerStatus(id);
  const [key] = useState(newIdempotencyKey);
  const [map, setMap] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [extras, setExtras] = useState({ equipment: false, exit: false }); // PLACEHOLDER(offboarding-extras): not in spec, optional
  const [err, setErr] = useState<string | null>(null);
  const step = Math.min(4, Math.max(0, Number(p.get("step") ?? 0)));
  if (user && !canAdmin(user.roles)) return <WorkforceDenied />;
  if (q.isPending) return <SkeletonRows n={5} />;
  if (q.isError) return <PanelError what={c.title} onRetry={() => q.refetch()} />;
  const w = q.data;
  const unresolved = w.openCases.filter((x) => !map[x.ref]).length;
  const go = (n: number) => setUrlParams({ step: n ? String(n) : null });
  async function finish() {
    setErr(null);
    try {
      await m.mutateAsync({ to: "terminated", reason: [reason.trim(), extras.equipment && "equipment returned", extras.exit && "exit interview done"].filter(Boolean).join("; "),
        reassignments: Object.entries(map).map(([ref, to]) => ({ ref, to })), idempotencyKey: key });
      toast({ title: fill(c.off.done, { name: w.name }), tone: "success" });
      router.push(localHref(locale, `/ops/workforce/${id}?tab=history`));
    } catch (x) { setErr(errorCopy(x, locale)); }
  }
  const canNext = step === 0 ? unresolved === 0 : step === 2 ? reason.trim().length > 0 : true;
  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <PageHead title={fill(c.off.title, { name: w.name })} />
      <Stepper steps={c.off.steps} current={step} />
      <section className="grid gap-4 border border-border bg-white p-5 m-rise" key={step}>
        {step === 0 && (<>
          <h2 className="text-card-title">{c.off.reassignTitle}</h2>
          {!w.openCases.length ? <p className="text-small text-fg-muted">{c.off.noCases}</p> : (
            <ul className="grid gap-3">
              {w.openCases.map((x) => (
                <li key={x.ref} className="grid gap-2 border border-border p-3 sm:grid-cols-[1fr_16rem] sm:items-center">
                  <span className="min-w-0 text-small"><span className="font-medium tabular">{x.ref}</span> · {x.title}<span className="block text-eyebrow text-fg-subtle">{x.client}</span></span>
                  <Select aria-label={`${c.off.pick} ${x.ref}`} value={map[x.ref] ?? ""} onChange={(e) => setMap((s) => ({ ...s, [x.ref]: e.target.value }))} className="h-10 text-small">
                    <option value="">{c.off.pick}</option>
                    <option value="keep">{c.off.keep}</option>
                    {(people.data?.items ?? []).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.load}/{a.cap})</option>)}
                  </Select>
                </li>
              ))}
            </ul>
          )}
          {unresolved > 0 && <p role="status" className="text-small text-warning">{fill(c.off.unresolved, { n: unresolved })}</p>}
        </>)}
        {step === 1 && (<>
          <h2 className="text-card-title">{c.off.offersTitle}</h2>
          {w.pendingOffers.length ? <ul className="grid gap-1 text-small">{w.pendingOffers.map((o) => <li key={o.ref}><span className="tabular font-medium">{o.ref}</span> · {o.title}</li>)}</ul> : <p className="text-small text-fg-muted">{c.off.noOffers}</p>}
        </>)}
        {step === 2 && (<>
          <h2 className="text-card-title">{c.off.accessTitle}</h2>
          <p className="text-small text-fg-muted">{c.off.accessBody}</p>
          <label className="grid gap-1 text-label">{c.off.reason}<Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required /></label>
        </>)}
        {step === 3 && (<>
          <h2 className="text-card-title">{c.off.optional}</h2>
          <Checkbox label={c.off.equipment} checked={extras.equipment} onChange={(e) => setExtras((s) => ({ ...s, equipment: e.target.checked }))} />
          <Checkbox label={c.off.exit} checked={extras.exit} onChange={(e) => setExtras((s) => ({ ...s, exit: e.target.checked }))} />
        </>)}
        {step === 4 && (<>
          <h2 className="text-card-title">{c.off.steps[4]}</h2>
          <ul className="grid gap-1 text-small">
            <li>{c.off.reassignTitle}: {w.openCases.length - unresolved}/{w.openCases.length}</li>
            <li>{c.off.offersTitle}: {w.pendingOffers.length}</li>
            <li>{c.off.reason}: {reason || "—"}</li>
          </ul>
          <p className="bg-bg-tint px-3 py-2 text-small text-navy-800">{c.off.summary}</p>
          {(unresolved > 0 || !reason.trim()) && <p role="alert" className="text-small text-danger">{unresolved > 0 ? fill(c.off.unresolved, { n: unresolved }) : c.off.reason}</p>}
          {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
        </>)}
      </section>
      <div className="flex justify-between gap-2">
        <Button variant="secondary" disabled={step === 0} onClick={() => go(step - 1)}>←</Button>
        {step < 4 ? <Button disabled={!canNext} onClick={() => go(step + 1)}>→</Button>
          : <Button variant="primary" loading={m.isPending} disabled={unresolved > 0 || !reason.trim()} onClick={finish} dots>{c.off.finish}</Button>}
      </div>
    </div>
  );
}

"use client";
// /work/team + /work/team/assign/[ref] (Stage 8 lane G, board 10 FM1–FM3, plan §7.9, E6). Firm admin only;
// members get an explained "not available" panel (the API answers 404 for them too).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { PhoneInput } from "@/components/atoms/inputs";
import { useToast } from "@/components/atoms/toast";
import { KpiTile, EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { opsCommon } from "@/content/pages/ops-common";
import { errorCopy } from "@/lib/api/error-copy";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useExternal } from "@/lib/work/api";
import { workFirm } from "@/content/pages/work-firm";
import { fill } from "@/content/pages/work-common";
import { useAssignInternally, useFirm, useInviteMember, useRequestRemoval, type Firm, type FirmJob } from "@/lib/work/g";
import { FirmRoleTag, WorkerStatusChip } from "@/components/atoms/work";

const TABS = ["members", "jobs", "payouts"] as const;
type Tab = (typeof TABS)[number];
const useF = () => {
  const { locale } = useI18n();
  return { f: workFirm(locale), locale };
};

function NotAdmin() {
  const { f, locale } = useF();
  return (
    <div className="mx-auto max-w-lg py-10 m-rise">
      <EmptyPanel title={f.notAdminTitle} body={f.notAdminBody} action={<ButtonLink href={localHref(locale, "/work/jobs")}>{f.toJobs}</ButtonLink>} />
    </div>
  );
}

export function FirmTeam() {
  const { f } = useF();
  const { ext, isPending: sPending } = useExternal();
  const params = useUrlParams();
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "members";
  const q = useFirm();
  const [invite, setInvite] = useState(false);
  if (!sPending && ext?.firmRole !== "admin") return <NotAdmin />;
  if (q.error && (q.error as { isNotFound?: boolean }).isNotFound) return <NotAdmin />;
  const d = q.data;
  return (
    <>
      <PageHead
        title={d ? `${f.title} · ${d.org}` : f.title}
        sub={f.sub}
        actions={
          <Button data-guide="work-invite" onClick={() => setInvite(true)}>
            <Icon name="plus" size={16} aria-hidden /> {f.invite}
          </Button>
        }
      />
      {q.isPending ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 m-shimmer" />
            ))}
          </div>
          <SkeletonRows n={4} />
        </div>
      ) : q.isError || !d ? (
        <PanelError what={f.loadFailed} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 m-stagger">
            <KpiTile icon="users" label={f.tiles.members} value={d.members.length} />
            <KpiTile icon="check" label={f.tiles.cleared} value={d.members.filter((m) => m.status === "cleared").length} />
            <KpiTile icon="clock" tone={d.members.some((m) => m.status !== "cleared") ? "warning" : "neutral"} label={f.tiles.pending} value={d.members.filter((m) => m.status !== "cleared").length} />
            <KpiTile icon="briefcase" label={f.tiles.active} value={d.jobs.filter((j) => j.open).length} />
          </div>
          <Tabs
            value={tab}
            onChange={(id) => setUrlParams({ tab: id === "members" ? null : id })}
            tabs={[
              { id: "members", label: f.tabs.members, count: d.members.length, content: <Members d={d} onInvite={() => setInvite(true)} /> },
              { id: "jobs", label: f.tabs.jobs, count: d.jobs.filter((j) => j.open).length, content: <Jobs d={d} /> },
              { id: "payouts", label: f.tabs.payouts, content: <Payouts d={d} /> },
            ]}
          />
        </div>
      )}
      <InviteDialog open={invite} onClose={() => setInvite(false)} services={d ? [...new Set(d.members.flatMap((m) => m.services))] : []} />
    </>
  );
}

// ---------------------------------------------------------------- members (FM1)
function Members({ d, onInvite }: { d: Firm; onInvite: () => void }) {
  const { f } = useF();
  const [removing, setRemoving] = useState<Firm["members"][number] | null>(null);
  const others = d.members.filter((m) => m.role !== "admin");
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto border border-border bg-white">
        <table className="w-full min-w-[40rem] text-small">
          <thead className="bg-bg-subtle text-left text-eyebrow text-fg-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">{f.cols.name}</th>
              <th className="px-4 py-3 font-medium">{f.cols.role}</th>
              <th className="px-4 py-3 font-medium">{f.cols.status}</th>
              <th className="px-4 py-3 font-medium">{f.cols.jobs}</th>
              <th className="px-4 py-3 font-medium">{f.cols.services}</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">{f.cols.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.members.map((m) => (
              <tr key={m.id} className="m-rise">
                <td className="px-4 py-3">
                  <p className="font-medium break-words">{m.name}</p>
                  <p className="text-eyebrow text-fg-subtle break-all">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  <FirmRoleTag role={m.role} />
                </td>
                <td className="px-4 py-3">
                  <WorkerStatusChip status={m.status} />
                </td>
                <td className="px-4 py-3 tabular">{m.activeJobs}</td>
                <td className="px-4 py-3 text-fg-muted">{m.services.length}</td>
                <td className="px-4 py-3 text-right">
                  {m.role === "member" &&
                    (m.removalRequested ? (
                      <span className="text-eyebrow text-fg-subtle">{f.removalRequested}</span>
                    ) : (
                      <button type="button"className="text-small text-danger underline underline-offset-4"onClick={() => setRemoving(m)}>
                        {f.removal}
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!others.length && <EmptyPanel title={f.emptyMembers} body={f.emptyMembersBody} action={<Button onClick={onInvite}>{f.invite}</Button>} />}
      <RemovalDialog member={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}

function RemovalDialog({ member, onClose }: { member: Firm["members"][number] | null; onClose: () => void }) {
  const { f, locale } = useF();
  const toast = useToast();
  const m = useRequestRemoval();
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={!!member}
      onClose={onClose}
      title={fill(f.removalTitle, { name: member?.name ?? "" })}
      description={f.removalBody}
      footer={
        <Button
          variant="danger"
          disabled={!reason.trim()}
          loading={m.isPending}
          onClick={() =>
            member &&
            m.mutate(
              { id: member.id, reason },
              {
                onSuccess: () => {
                  toast({ title: f.removalSent, tone: "success" });
                  setReason("");
                  onClose();
                },
              },
            )
          }
        >
          {f.send}
        </Button>
      }
    >
      <Field id="removal-reason" label={f.reason}>
        {(x) => <Textarea id={x.id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
      {m.isError && <p role="alert"className="mt-2 text-small text-danger">{errorCopy(m.error, locale)}</p>}
    </Dialog>
  );
}

function InviteDialog({ open, onClose, services }: { open: boolean; onClose: () => void; services: string[] }) {
  const { f, locale } = useF();
  const toast = useToast();
  const m = useInviteMember();
  const [v, setV] = useState({ name: "", email: "", phone: "", services: [] as string[] });
  const valid = v.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) && v.services.length;
  const svcName = (s: string) => s.replace(/-/g, " ").replace(/^./, (x) => x.toUpperCase());
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={f.inviteTitle}
      description={f.inviteBody}
      footer={
        <Button
          disabled={!valid}
          loading={m.isPending}
          onClick={() =>
            m.mutate(v, {
              onSuccess: () => {
                toast({ title: fill(f.invited, { email: v.email }), tone: "success" });
                setV({ name: "", email: "", phone: "", services: [] });
                onClose();
              },
            })
          }
        >
          {f.sendInvite}
        </Button>
      }
    >
      <div className="grid gap-4">
        <Field id="inv-name" label={f.name}>
          {(x) => <Input id={x.id} autoComplete="off" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
        </Field>
        <Field id="inv-email" label={f.email}>
          {(x) => <Input id={x.id} type="email" autoComplete="off" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />}
        </Field>
        <Field id="inv-phone" label={f.phone} optional="optional">
          {(x) => <PhoneInput id={x.id} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />}
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{f.services}</legend>
          {services.map((s) => (
            <label key={s} className="flex items-center gap-3 text-small">
              <input
                type="checkbox"
                className="size-5 accent-navy-700"
                checked={v.services.includes(s)}
                onChange={() => setV({ ...v, services: v.services.includes(s) ? v.services.filter((x) => x !== s) : [...v.services, s] })}
              />
              {svcName(s)}
            </label>
          ))}
        </fieldset>
        {m.isError && <p role="alert"className="text-small text-danger">{errorCopy(m.error, locale)}</p>}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- jobs (FM1/FM2)
function Jobs({ d }: { d: Firm }) {
  const { f, locale } = useF();
  const st = opsCommon(locale).status;
  if (!d.jobs.length) return <EmptyPanel title={f.emptyJobs} body={f.emptyJobsBody} />;
  return (
    <ul className="grid gap-2 m-stagger">
      {d.jobs.map((j, i) => (
        <li key={j.ref} style={{ ["--i"as string]: i }} className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-border bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="text-label">{j.service}</p>
            <p className="text-small text-fg-muted">
              <span className="tabular">{j.ref}</span> · {j.client} · {st[j.status] ?? j.status}
            </p>
          </div>
          <div className="text-small">
            <p className="text-eyebrow text-fg-subtle">{f.cols.assignee}</p>
            <p className="font-medium">{j.assignee}</p>
          </div>
          <div className="text-small">
            <p className="text-eyebrow text-fg-subtle">{f.cols.due}</p>
            <p className="tabular">{formatDate(j.dueAt, locale)}</p>
          </div>
          <p className="text-small font-medium tabular">{formatMoney(j.earning, "RWF", locale)}</p>
          {j.open && (
            <ButtonLink size="sm" variant="outline" href={localHref(locale, `/work/team/assign/${encodeURIComponent(j.ref)}`)}>
              {f.assign}
            </ButtonLink>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- payouts (FM3)
function Payouts({ d }: { d: Firm }) {
  const { f, locale } = useF();
  const [open, setOpen] = useState<string | null>(d.payouts[0]?.month ?? null);
  if (!d.payouts.length) return <EmptyPanel title={f.emptyPayouts} body={f.emptyPayoutsBody} />;
  const month = (m: string) => new Intl.DateTimeFormat(locale === "rw" ? "en-GB" : locale, { month: "long", year: "numeric" }).format(new Date(`${m}-01T12:00:00Z`));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 bg-tint p-4 text-small">
        <Icon name="building"size={18} aria-hidden className="text-navy-700" />
        <span className="flex-1">
          {f.account}: <span className="font-medium tabular">{d.account}</span> · {f.payoutsNote}
        </span>
        <ButtonLink size="sm" variant="outline" href={localHref(locale, "/work/earnings?tab=invoices")}>
          <Icon name="upload" size={14} aria-hidden /> {f.uploadInvoice}
        </ButtonLink>
      </div>
      <ul className="grid gap-2">
        {d.payouts.map((p) => (
          <li key={p.month} className="border border-border bg-white">
            <button type="button"aria-expanded={open === p.month} onClick={() => setOpen(open === p.month ? null : p.month)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left">
              <span className="flex-1 text-label">{month(p.month)}</span>
              <span className={cx("inline-flex h-6 items-center px-2.5 text-eyebrow", p.status === "paid" ? "bg-success-bg text-success" : "bg-info-bg text-info")}>{p.status === "paid" ? f.paid : f.pending}</span>
              {p.ref && <span className="text-eyebrow text-fg-subtle tabular">{p.ref}</span>}
              <span className="text-label tabular">{formatMoney(p.gross, "RWF", locale)}</span>
              <Icon name="chevronDown"size={16} aria-hidden className={cx("transition-transform", open === p.month && "rotate-180")} />
            </button>
            {open === p.month && (
              <div className="border-t border-border px-4 py-3 m-rise">
                <p className="mb-2 text-eyebrow uppercase text-fg-subtle">{f.breakdown}</p>
                <ul className="grid gap-1.5 text-small">
                  {p.breakdown.map((b) => (
                    <li key={b.id} className="flex justify-between gap-3">
                      <span>{b.name}</span>
                      <span className="tabular">{formatMoney(b.amount, "RWF", locale)}</span>
                    </li>
                  ))}
                </ul>
                <Link href={localHref(locale, `/work/earnings/statements/${p.month}`)} className="mt-3 inline-block text-small font-medium text-navy-700 underline underline-offset-4">
                  {f.viewStatement}
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- assign internally (FM2)
export function AssignInternally({ refId }: { refId: string }) {
  const { f, locale } = useF();
  const router = useRouter();
  const toast = useToast();
  const { ext, isPending: sPending } = useExternal();
  const q = useFirm();
  const m = useAssignInternally();
  const [pick, setPick] = useState<string | null>(null);
  if (!sPending && ext?.firmRole !== "admin") return <NotAdmin />;
  if (q.error && (q.error as { isNotFound?: boolean }).isNotFound) return <NotAdmin />;
  const back = (
    <Link href={localHref(locale, "/work/team?tab=jobs")} className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg">
      <Icon name="arrowRight"size={14} aria-hidden className="rotate-180" /> {f.back}
    </Link>
  );
  if (q.isPending) return <SkeletonRows n={4} />;
  if (q.isError || !q.data) return <PanelError what={f.loadFailed} onRetry={() => q.refetch()} />;
  const job: FirmJob | undefined = q.data.jobs.find((j) => j.ref === refId);
  if (!job)
    return (
      <>
        {back}
        <EmptyPanel title={f.notFirmJob} />
      </>
    );
  const chosen = q.data.members.find((x) => x.id === (pick ?? job.assigneeId));
  const why = (x: Firm["members"][number]) => (x.id === job.assigneeId ? f.notEligible.same : x.status !== "cleared" ? f.notEligible.pending : !x.services.includes(job.serviceSlug) ? f.notEligible.service : null);
  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <PageHead back={back} title={fill(f.assignTitle, { ref: job.ref })} sub={`${job.service} · ${job.client}`} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-label">{f.assignTo}</legend>
        {q.data.members.map((x) => {
          const reason = why(x);
          const on = (pick ?? job.assigneeId) === x.id;
          return (
            <label
              key={x.id}
              className={cx(
                "flex items-center gap-3 border bg-white p-4 transition-colors",
                reason && x.id !== job.assigneeId ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                on ? "border-navy-700 ring-2 ring-focus/20" : "border-border",
              )}
            >
              <input type="radio"name="assignee"className="size-5 accent-navy-700"disabled={!!reason && x.id !== job.assigneeId} checked={on} onChange={() => setPick(x.id)} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-label">
                  {x.name} <FirmRoleTag role={x.role} />
                </span>
                {reason && <span className="block text-small text-fg-muted">{reason}</span>}
              </span>
              <WorkerStatusChip status={x.status} />
            </label>
          );
        })}
      </fieldset>
      {chosen && pick && pick !== job.assigneeId && (
        <p role="status"className="flex items-center gap-2 bg-tint px-3 py-2 text-small m-rise">
          <Icon name="shield" size={15} aria-hidden /> {fill(f.assignHint, { name: chosen.name })}
        </p>
      )}
      <p className="text-small text-fg-subtle">{f.assignAudit}</p>
      {m.isError && <p role="alert"className="text-small text-danger m-shake">{errorCopy(m.error, locale)}</p>}
      <div className="flex gap-3">
        <Button
          disabled={!pick || pick === job.assigneeId}
          loading={m.isPending}
          onClick={() =>
            pick &&
            m.mutate(
              { ref: job.ref, memberId: pick },
              {
                onSuccess: () => {
                  toast({ title: fill(f.assigned, { ref: job.ref, name: chosen?.name ?? "" }), tone: "success" });
                  router.push(localHref(locale, "/work/team?tab=jobs"));
                },
              },
            )
          }
        >
          {job.assigneeId === q.data.members.find((x) => x.role === "admin")?.id ? f.assign : f.reassign}
        </Button>
      </div>
    </div>
  );
}

"use client";
import { useWs } from "@/lib/agent/ws";
// U13 Profile & settings (board 13: ST1–ST4, PST). Desktop: section rail; phone: list → detail.
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import type React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import {
  Field,
  Input,
  Textarea,
  Select,
  DateInput,
  Switch,
} from "@/components/atoms/field";
import { Avatar } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { PanelError, EmptyPanel } from "@/components/molecules/ops/ops";
import { SecuritySettings } from "@/components/organisms/client/settings-security";
import {
  PageHead,
  SkeletonRows,
  SkillLevel,
  useNow,
  useA,
} from "@/components/atoms/agent";
import { useMyCases, useSummary } from "@/lib/agent/api";
import { agentProfile, type ProfileCopy } from "@/content/pages/agent-profile";
import { TeamProfileCard } from "@/components/organisms/agent/team-profile";
import { fill } from "@/content/pages/agent-common";
import {
  ProfileForm,
  CvForm,
  CertsForm,
  SaveChip,
  useSaver,
} from "@/components/organisms/agent/onboarding";
import {
  DAYS,
  CHANNELS,
  LEVELS,
  levelOf,
  leaveConflicts,
  expiryBucket,
  useOnboarding,
  useSkills,
  useSkillRequest,
  useAvailability,
  useSetAvailability,
  useLeave,
  useLeaveAction,
  useContract,
  useNotifMatrix,
  useSetNotif,
  type SkillChange,
  type NotifRow,
} from "@/lib/agent/f";

export const SECTIONS = [
  "profile",
  "skills",
  "availability",
  "contract",
  "notifications",
  "security",
] as const;
export type Section = (typeof SECTIONS)[number];
const ICON: Record<Section, IconName> = {
  profile: "user",
  skills: "graduation",
  availability: "calendar",
  contract: "file",
  notifications: "message",
  security: "shield",
};
const useP = () => agentProfile(useI18n().locale);
const box = " border border-border bg-white p-4 sm:p-5";

/** section=null → /agent/profile: phone shows the PST list, desktop shows the profile section. */
/** Stage 8: /work passes its own `sections` (Stage 4 keys reused) plus `extra` sections rendered by the caller. */
export type ExtraSection = { label: string; icon: IconName; node: React.ReactNode };
export function ProfileView({
  section,
  sections = SECTIONS,
  extra = {},
}: {
  section: string | null;
  sections?: readonly string[];
  extra?: Record<string, ExtraSection>;
}) {
  const p = useP();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const s = useSummary();
  const me = s.data?.me;
  const cur = section ?? "profile";
  const label = (x: string) => extra[x]?.label ?? p.sections[x as Section];
  const href = (x: string) => localHref(locale, wsHref(`/agent/profile/${x}`));
  return (
    <div className="pb-24 lg:pb-8">
      <div className={cx(section && "max-lg:hidden")}>
        <PageHead title={p.title} />
      </div>
      {section && (
        <Link
          href={localHref(locale, wsHref("/agent/profile"))}
          className="mb-3 inline-flex items-center gap-1 text-small text-fg-muted lg:hidden"
        >
          <Icon
            name="arrowRight"
            size={14}
            aria-hidden
            className="rotate-180"
          />
          {p.back}
        </Link>
      )}
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label={p.title}
          className={cx("grid content-start gap-3", section && "max-lg:hidden")}
        >
          {me && (
            <div className="flex items-center gap-3 border border-border bg-white p-3 lg:hidden">
              <Avatar name={me.name} />
              <div className="min-w-0">
                <p className="text-label">{me.name}</p>
                <p className="text-small text-fg-subtle">{me.title}</p>
              </div>
            </div>
          )}
          <ul data-guide="profile-sections" className="grid overflow-hidden border border-border bg-white lg:border-0 lg:bg-transparent">
            {sections.map((x) => (
              <li
                key={x}
                className="border-b border-border last:border-0 lg:border-0"
              >
                <Link
                  href={href(x)}
                  aria-current={
                    section === x || (!section && x === "profile")
                      ? "page"
                      : undefined
                  }
                  className={cx(
                    "flex min-h-12 items-center gap-3 px-4 text-body m-press lg:min-h-10 lg:px-3 lg:text-small",
                    cur === x
                      ? "lg:bg-tint lg:font-medium lg:text-navy-800"
                      : "hover:bg-navy-50",
                  )}
                >
                  <Icon name={extra[x]?.icon ?? ICON[x as Section]} size={18} aria-hidden />
                  <span className="flex-1">{label(x)}</span>
                  <Icon
                    name="chevronDown"
                    size={16}
                    aria-hidden
                    className="-rotate-90 lg:hidden"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div
          className={cx("min-w-0 m-rise", !section && "max-lg:hidden")}
          key={cur}
        >
          <h2 className="sr-only lg:not-sr-only lg:mb-4 lg:text-h4">
            {label(cur)}
          </h2>
          <h1 className="mb-4 text-h3 lg:hidden">{label(cur)}</h1>
          {extra[cur]?.node}
          {cur === "profile" && <ProfileSection p={p} />}
          {cur === "skills" && (
            <SkillsSection p={p} manager={me?.manager ?? ""} />
          )}
          {cur === "availability" && (
            <AvailabilitySection p={p} manager={me?.manager ?? ""} />
          )}
          {cur === "contract" && (
            <ContractSection p={p} manager={me?.manager ?? ""} />
          )}
          {cur === "notifications" && <NotificationsSection p={p} />}
          {cur === "security" && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ST1
function ProfileSection({ p }: { p: ProfileCopy }) {
  const q = useOnboarding();
  const s = useSummary();
  const saver = useSaver();
  if (q.isPending) return <SkeletonRows n={4} />;
  if (q.isError)
    return <PanelError what={p.sections.profile} onRetry={() => q.refetch()} />;
  const me = s.data?.me;
  const ob = q.data;
  return (
    <div className="grid gap-4">
      <section className={cx(box, "flex flex-wrap items-center gap-4")}>
        {ob.profile.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ob.profile.photo}
            alt=""
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <Avatar name={ob.profile.name} size="lg" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-card-title">{ob.profile.name}</p>
          <p className="text-small text-fg-subtle">{me ? `${me.title}` : ""}</p>
          {me && (
            <span className="mt-1 inline-flex bg-tint px-2.5 py-0.5 text-eyebrow text-navy-800">
              {fill(p.share, { p: Math.round(me.sharePct * 100) })}
            </span>
          )}
        </div>
        <SaveChip saver={saver} savedAt={ob.savedAt} />
      </section>
      <p className="text-small text-fg-subtle">{p.profile.edit}</p>
      <section className={box} aria-label={p.profile.contacts}>
        <ProfileForm ob={ob} saver={saver} />
      </section>
      <section className={box}>
        <h3 className="mb-4 text-label-lg">{p.profile.cv}</h3>
        <CvForm ob={ob} saver={saver} />
      </section>
      <section className={box}>
        <h3 className="mb-4 text-label-lg">{p.profile.certs}</h3>
        <CertsForm ob={ob} saver={saver} />
        <ExpiryChips certs={ob.certificates} />
      </section>
      <TeamProfileCard className={box} />
    </div>
  );
}
function ExpiryChips({
  certs,
}: {
  certs: { id: string; name: string; expires: string }[];
}) {
  const now = useNow();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  if (now === null) return null;
  const soon = certs.filter(
    (c) => c.expires && Date.parse(c.expires) - now < 60 * 86_400_000,
  );
  if (!soon.length) return null;
  return (
    <ul className="mt-4 grid gap-2">
      {soon.map((c) => (
        <li
          key={c.id}
          className="inline-flex w-fit items-center gap-1.5 bg-warning-bg px-2.5 py-1 text-eyebrow text-warning"
        >
          <Icon name="clock" size={12} aria-hidden />
          {c.name} · {formatRelative(c.expires, locale, now)}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- ST2
function SkillsSection({ p, manager }: { p: ProfileCopy; manager: string }) {
  const q = useSkills();
  const req = useSkillRequest();
  const toast = useToast();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const [open, setOpen] = useState(false);
  if (q.isPending) return <SkeletonRows n={5} />;
  if (q.isError)
    return <PanelError what={p.sections.skills} onRetry={() => q.refetch()} />;
  const pending = q.data.x_agent?.pending ?? null;
  const pendingFor = new Set(pending?.changes.map((c) => c.service_category));
  const summary =
    pending?.changes
      .map((c) => `${c.service_category} → ${levelOf(c.proficiency_level)}`)
      .join(", ") ?? "";
  return (
    <div className="grid gap-4">
      <p className="text-small text-fg-muted">
        {fill(p.skills.sub, { m: manager })}
      </p>
      {pending && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 bg-warning-bg p-4 m-rise"
        >
          <Icon name="clock"size={18} aria-hidden className="text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-label">
              {fill(p.skills.awaiting, { m: manager })}
            </p>
            <p className="text-small break-words">
              {fill(p.skills.awaitingBody, {
                t: formatRelative(pending.at, locale),
                c: summary,
              })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            loading={req.isPending}
            onClick={() =>
              req.mutate(null, {
                onSuccess: () =>
                  toast({ title: p.skills.cancelled, tone: "success" }),
              })
            }
          >
            {p.skills.cancelReq}
          </Button>
        </div>
      )}
      <ul
        className={cx(box, "grid gap-0 p-0 sm:p-0")}
        aria-label={p.skills.title}
      >
        <li
          aria-hidden
          className="hidden grid-cols-[1fr_14rem] gap-3 border-b border-border px-5 py-2 text-eyebrow text-fg-subtle uppercase sm:grid"
        >
          <span>{p.skills.service}</span>
          <span>{p.skills.level}</span>
        </li>
        {q.data.skills.map((x) => (
          <li
            key={x.service_category}
            className="grid gap-1 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[1fr_14rem] sm:items-center sm:gap-3 sm:px-5"
          >
            <span className="flex items-center gap-2 text-body">
              <Icon
                name="check"
                size={14}
                aria-hidden
                className="text-navy-700"
              />
              {x.service_category}
            </span>
            <SkillLevel
              level={levelOf(x.proficiency_level)}
              pending={pendingFor.has(x.service_category)}
            />
          </li>
        ))}
      </ul>
      <div>
        <Button
          variant="primary"
          onClick={() =>
            pending ? toast({ title: p.skills.pendingOne }) : setOpen(true)
          }
          aria-describedby={pending ? "skill-pending" : undefined}
        >
          <Icon name="plus" size={16} aria-hidden />
          {p.skills.request}
        </Button>
        {pending && (
          <p id="skill-pending"className="mt-2 text-small text-fg-subtle">
            {p.skills.pendingOne}
          </p>
        )}
      </div>
      {open && (
        <SkillDialog
          p={p}
          manager={manager}
          skills={q.data.skills.map((x) => x.service_category)}
          busy={req.isPending}
          onClose={() => setOpen(false)}
          onSend={(b) =>
            req.mutate(b, {
              onSuccess: () => {
                setOpen(false);
                toast({
                  title: fill(p.skills.sent, { m: manager }),
                  tone: "success",
                });
              },
            })
          }
        />
      )}
    </div>
  );
}
function SkillDialog({
  p,
  manager,
  skills,
  busy,
  onClose,
  onSend,
}: {
  p: ProfileCopy;
  manager: string;
  skills: string[];
  busy: boolean;
  onClose: () => void;
  onSend: (b: { changes: SkillChange[]; note: string }) => void;
}) {
  const a = useA().skill;
  const [lv, setLv] = useState<Record<string, string>>({});
  const [add, setAdd] = useState("");
  const [addLv, setAddLv] = useState("2");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const changes: SkillChange[] = [
    ...Object.entries(lv)
      .filter(([, v]) => v)
      .map(([k, v]) => ({ service_category: k, proficiency_level: Number(v) })),
    ...(add.trim()
      ? [{ service_category: add.trim(), proficiency_level: Number(addLv) }]
      : []),
  ];
  return (
    <Dialog
      open
      onClose={onClose}
      title={p.skills.dialog}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {p.skills.cancel}
          </Button>
          <Button dots type="submit" form="skill-req" loading={busy}>
            {p.skills.submit}
          </Button>
        </>
      }
    >
      <form
        id="skill-req"
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!changes.length) return setErr(p.skills.noChange);
          onSend({ changes, note });
        }}
      >
        {err && (
          <p role="alert"className="text-small font-medium text-danger">
            {err}
          </p>
        )}
        {skills.map((s) => (
          <Field key={s} label={fill(p.skills.newLevel, { s })}>
            {(f) => (
              <Select
                id={f.id}
                value={lv[s] ?? ""}
                onChange={(e) => setLv({ ...lv, [s]: e.target.value })}
              >
                <option value="">{p.skills.keep}</option>
                {LEVELS.map((l, i) => (
                  <option key={l} value={i + 1}>
                    {a[l]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ))}
        <div className="grid gap-3 bg-bg-subtle p-3 sm:grid-cols-[1fr_10rem]">
          <Field label={p.skills.addService}>
            {(f) => (
              <Input
                id={f.id}
                placeholder={p.skills.servicePh}
                value={add}
                onChange={(e) => setAdd(e.target.value)}
              />
            )}
          </Field>
          <Field label={p.skills.level}>
            {(f) => (
              <Select
                id={f.id}
                value={addLv}
                onChange={(e) => setAddLv(e.target.value)}
              >
                {LEVELS.map((l, i) => (
                  <option key={l} value={i + 1}>
                    {a[l]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={fill(p.skills.note, { m: manager })}>
          {(f) => (
            <Textarea
              id={f.id}
              placeholder={p.skills.notePh}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- ST3
function AvailabilitySection({
  p,
  manager,
}: {
  p: ProfileCopy;
  manager: string;
}) {
  const q = useAvailability();
  const set = useSetAvailability();
  const toast = useToast();
  return (
    <div className="grid gap-4">
      <section className={box}>
        <h3 className="text-label-lg">{p.avail.title}</h3>
        <p className="mb-4 text-small text-fg-muted">{p.avail.sub}</p>
        {q.isPending ? (
          <SkeletonRows n={2} />
        ) : q.isError ? (
          <PanelError what={p.avail.title} onRetry={() => q.refetch()} />
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label={p.avail.title}
            className="overflow-x-auto"
          >
            <table className="w-full min-w-[34rem] text-small">
              <thead>
                <tr>
                  <th scope="col"className="w-36" />
                  {DAYS.map((d) => (
                    <th
                      key={d}
                      scope="col"
                      className="pb-2 text-left font-medium"
                    >
                      {p.avail.days[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["am", "pm"] as const).map((h) => (
                  <tr key={h} className="border-t border-border">
                    <th scope="row"className="py-3 pr-3 text-left font-normal">
                      <span className="block text-label">{p.avail[h]}</span>
                      <span className="text-fg-subtle tabular">
                        {h === "am" ? p.avail.amHours : p.avail.pmHours}
                      </span>
                    </th>
                    {DAYS.map((d) => {
                      const on = q.data[d][h];
                      return (
                        <td key={d} className="py-3">
                          <Switch
                            label={
                              <span
                                className={cx(
                                  "text-small",
                                  !on && "text-fg-subtle",
                                )}
                              >
                                {on ? p.avail.on : p.avail.off}
                                <span className="sr-only">
                                  {" "}
                                  {p.avail.days[d]} {p.avail[h]}
                                </span>
                              </span>
                            }
                            checked={on}
                            onChange={() =>
                              set.mutate(
                                { ...q.data, [d]: { ...q.data[d], [h]: !on } },
                                {
                                  onError: () =>
                                    toast({
                                      title: p.avail.failed,
                                      tone: "danger",
                                    }),
                                },
                              )
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <LeaveSection p={p} manager={manager} />
    </div>
  );
}

function LeaveSection({ p, manager }: { p: ProfileCopy; manager: string }) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const toast = useToast();
  const q = useLeave();
  const act = useLeaveAction();
  const cases = useMyCases();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const bad = !!from && !!to && to < from;
  const hits = leaveConflicts(cases.data ?? [], from, to);
  const pending = q.data?.items.find((l) => l.status === "pending");
  const tone = {
    pending: "bg-warning-bg text-warning",
    approved: "bg-success-bg text-success",
    declined: "bg-danger-bg text-danger",
  } as const;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <form
        className={cx(box, "grid content-start gap-4")}
        onSubmit={(e) => {
          e.preventDefault();
          if (!from || !to || bad) return setErr(p.leave.range);
          if (pending) return setErr(p.leave.pendingOnly);
          setErr(undefined);
          act.mutate(
            { kind: "request", from, to, reason },
            {
              onSuccess: () => {
                setFrom("");
                setTo("");
                setReason("");
                toast({
                  title: fill(p.leave.sent, { m: manager }),
                  tone: "success",
                  action: {
                    label: p.leave.cancel,
                    onClick: () => act.mutate({ kind: "cancel" }),
                  },
                });
              },
              onError: (e2) => setErr(errorCopy(e2, locale)),
            },
          );
        }}
      >
        <h3 className="text-label-lg">{p.leave.title}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={p.leave.from}>
            {(f) => (
              <DateInput
                id={f.id}
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            )}
          </Field>
          <Field label={p.leave.to} error={bad ? p.leave.range : undefined}>
            {(f) => (
              <DateInput
                id={f.id}
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                required
                min={from || undefined}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label={p.leave.reason}>
          {(f) => (
            <Input
              id={f.id}
              placeholder={p.leave.reasonPh}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
        {from && to && !bad && (
          <div
            role="status"
            className={cx(
              " p-3 text-small m-rise",
              hits.length ? "bg-warning-bg" : "bg-ink-100",
            )}
          >
            <p className="flex items-start gap-2">
              <Icon
                name={hits.length ? "briefcase" : "check"}
                size={16}
                aria-hidden
                className={cx(
                  "mt-0.5",
                  hits.length ? "text-warning" : "text-success",
                )}
              />
              {hits.length
                ? fill(p.leave.conflicts, { n: hits.length, m: manager })
                : p.leave.noConflicts}
            </p>
            {hits.length > 0 && (
              <ul className="mt-2 grid gap-1 pl-6">
                {hits.map((c) => (
                  <li key={c.ref}>
                    <Link
                      className="underline tabular"
                      href={localHref(locale, wsHref(`/agent/cases/${c.ref}`))}
                    >
                      {c.ref}
                    </Link>{" "}
                    · {c.service} · {c.dueAt ? formatDate(c.dueAt, locale) : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {err && (
          <p
            role="alert"
            className="text-small font-medium text-danger m-shake"
          >
            {err}
          </p>
        )}
        <Button
          dots
          type="submit"
          loading={act.isPending && act.variables?.kind === "request"}
          className="w-fit"
        >
          {p.leave.submit}
        </Button>
      </form>
      <section className={cx(box, "grid content-start gap-3")}>
        <h3 className="text-label-lg">{p.leave.history}</h3>
        {q.isPending ? (
          <SkeletonRows n={2} />
        ) : q.isError ? (
          <PanelError what={p.leave.history} onRetry={() => q.refetch()} />
        ) : !q.data.items.length ? (
          <EmptyPanel compact title={p.leave.none} />
        ) : (
          <ul className="grid gap-2 m-stagger">
            {q.data.items.map((l, i) => (
              <li
                key={l.id}
                style={{ ["--i" as string]: i }}
                className="grid gap-2 border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      "inline-flex h-6 items-center gap-1 px-2.5 text-eyebrow font-medium m-tone",
                      tone[l.status],
                    )}
                  >
                    <Icon
                      name={
                        l.status === "approved"
                          ? "check"
                          : l.status === "declined"
                            ? "x"
                            : "clock"
                      }
                      size={12}
                      aria-hidden
                    />
                    {p.leave.status[l.status]}
                  </span>
                  <span className="text-small tabular">
                    {formatDate(l.from, locale)} – {formatDate(l.to, locale)}
                  </span>
                </div>
                {l.reason && (
                  <p className="text-small text-fg-muted">{l.reason}</p>
                )}
                {l.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        act.mutate(
                          { kind: "cancel" },
                          {
                            onSuccess: () =>
                              toast({ title: p.leave.cancelled }),
                          },
                        )
                      }
                    >
                      {p.leave.cancel}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- ST4
function ContractSection({ p, manager }: { p: ProfileCopy; manager: string }) {
  const q = useContract();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const now = useNow();
  if (q.isPending) return <SkeletonRows n={2} />;
  if (q.isError)
    return <PanelError what={p.contract.title} onRetry={() => q.refetch()} />;
  const c = q.data;
  const days =
    now === null ? null : Math.ceil((Date.parse(c.end) - now) / 86_400_000);
  const bucket = days === null ? null : expiryBucket(days);
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
      <section className={box}>
        <h3 className="flex items-center gap-2 text-label-lg">
          <Icon name="file"size={18} aria-hidden className="text-navy-700" />
          {p.contract.title}
        </h3>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-small">
          <dt className="text-fg-subtle">{p.contract.type}</dt>
          <dd>{c.type}</dd>
          <dt className="text-fg-subtle">{p.contract.share}</dt>
          <dd className="tabular">{Math.round(c.sharePct * 100)}%</dd>
          <dt className="text-fg-subtle">{p.contract.start}</dt>
          <dd>{formatDate(c.start, locale)}</dd>
          <dt className="text-fg-subtle">{p.contract.end}</dt>
          <dd>{formatDate(c.end, locale)}</dd>
        </dl>
        <p className="mt-4 flex items-center gap-1.5 text-small text-fg-subtle">
          <Icon name="lock" size={14} aria-hidden />
          {fill(p.contract.readOnly, { m: manager })}
        </p>
      </section>
      {days !== null && (
        <aside
          className={cx(
            "grid content-start gap-1 p-4",
            bucket === "expired" || bucket === 7
              ? "bg-danger-bg text-danger"
              : bucket
                ? "bg-warning-bg"
                : "bg-ink-100",
          )}
        >
          <p className="flex items-center gap-2 text-label-lg">
            <Icon name="clock" size={18} aria-hidden />
            {bucket === "expired"
              ? p.contract.expired
              : fill(p.contract.expiresIn, { n: days })}
          </p>
          {typeof bucket === "number" && (
            <p className="text-small">
              {fill(p.contract.reminder, { n: bucket })}
            </p>
          )}
          <p className="text-small opacity-80">{p.contract.reminders}</p>
        </aside>
      )}
    </div>
  );
}

function NotificationsSection({ p }: { p: ProfileCopy }) {
  const q = useNotifMatrix();
  const set = useSetNotif();
  const toast = useToast();
  if (q.isPending) return <SkeletonRows n={5} />;
  if (q.isError)
    return <PanelError what={p.notif.title} onRetry={() => q.refetch()} />;
  const rows = q.data.rows;
  const toggle = (r: NotifRow, c: (typeof CHANNELS)[number]) =>
    set.mutate(
      rows.map((x) => (x === r ? { ...x, [c]: !x[c] } : x)),
      {
        onSuccess: () => toast({ title: p.notif.saved }),
        onError: () => toast({ title: p.notif.failed, tone: "danger" }),
      },
    );
  return (
    <section className={box}>
      <div
        tabIndex={0}
        role="region"
        aria-label={p.notif.title}
        className="overflow-x-auto"
      >
        <table className="w-full min-w-[30rem] text-small">
          <caption className="sr-only">{p.notif.title}</caption>
          <thead>
            <tr className="text-left text-eyebrow text-fg-subtle uppercase">
              <th scope="col"className="pb-2 font-medium">
                {p.notif.event}
              </th>
              {CHANNELS.map((c) => (
                <th key={c} scope="col"className="pb-2 font-medium">
                  {p.notif.channels[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.event} className="border-t border-border">
                <th scope="row"className="py-3 text-left font-normal">
                  {p.notif.events[
                    r.event as keyof ProfileCopy["notif"]["events"]
                  ] ?? r.event}
                </th>
                {CHANNELS.map((c) => {
                  const locked = r.required.includes(c);
                  return (
                    <td
                      key={c}
                      className="py-3"
                      title={locked ? p.notif.locked : undefined}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Switch
                          label={
                            <span className="sr-only">{`${p.notif.events[r.event as keyof ProfileCopy["notif"]["events"]] ?? r.event} · ${p.notif.channels[c]}${locked ? ` · ${p.notif.locked}` : ""}`}</span>
                          }
                          checked={r[c]}
                          disabled={locked}
                          onChange={() => toggle(r, c)}
                        />
                        {locked && (
                          <Icon
                            name="lock"
                            size={12}
                            aria-hidden
                            className="text-fg-subtle"
                          />
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-small text-fg-subtle">
        <Icon name="lock" size={12} aria-hidden />
        {p.notif.locked}
      </p>
    </section>
  );
}

function SecuritySection() {
  return (
    <div className="grid gap-4">
      <SecuritySettings />
    </div>
  );
}

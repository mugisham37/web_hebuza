"use client";
// U10 (board 10 v1 + v2 matrix): BR1 brief editor, BR2 sharing matrix, BR3 offer timeline with live timeout,
// BR4 reassign dialog, BR5 auto-assign rules. PB1 = the same components stacked on phones.
import { errorCopy } from "@/lib/api/error-copy";
import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { opsAssign } from "@/content/pages/ops-assign";
import { opsCommon } from "@/content/pages/ops-common";
import { fill } from "@/content/pages/ops-case";
import { useSuggestions, type CaseDetailVM } from "@/lib/ops/api";
import {
  useBrief,
  useSaveBrief,
  useSendOffer,
  useScope,
  useSaveScope,
  useOffers,
  useReassign,
  useRules,
  useSaveRules,
  useAgents,
  previewNext,
  scopeCount,
  SCOPE_KEYS,
  type Brief,
  type Scope,
  type ScopeRole,
  type Offer,
  type RuleMode,
  type AgentRow,
} from "@/lib/ops/b";
import { OfferPill } from "@/components/atoms/ops";
import {
  ReasonDialog,
  EmptyPanel,
  PanelError,
  Panel,
} from "@/components/molecules/ops/ops";
import { Button } from "@/components/atoms/button";
import { Input, Select, Switch } from "@/components/atoms/field";
import { Skeleton } from "@/components/atoms/feedback";
import { Avatar } from "@/components/atoms/misc";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";

const inp =
  "h-10 w-full border border-border-strong bg-white px-3 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none aria-invalid:border-danger";
const shortDate = (d: string, l: Parameters<typeof formatDate>[1]) =>
  formatDate(d, l, { weekday: "short", day: "numeric", month: "short" });

const leadOf = (c: CaseDetailVM) =>
  c.assignees.find((a) => a.role === "lead") ?? null;
function NeedAgent() {
  const { locale } = useI18n();
  const t = opsAssign(locale);
  return (
    <EmptyPanel
      title={t.brief.needAgent}
      action={
        <Button size="sm" onClick={() => setUrlParams({ step: null })}>
          {t.steps.suggest}
        </Button>
      }
    />
  );
}

// ---------------------------------------------------------------- BR1 brief
export function BriefStep({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const q = useBrief(c.ref);
  const lead = leadOf(c);
  if (!lead) return <NeedAgent />;
  if (q.isPending) return <Skeleton className="h-[30rem]" />;
  if (q.isError)
    return (
      <PanelError
        what={opsAssign(locale).steps.brief}
        onRetry={() => q.refetch()}
      />
    );
  return <BriefForm key={q.dataUpdatedAt} c={c} lead={lead} data={q.data} />;
}

function BriefForm({
  c,
  lead,
  data,
}: {
  c: CaseDetailVM;
  lead: { id: string; name: string };
  data: NonNullable<ReturnType<typeof useBrief>["data"]>;
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale).brief;
  const [b, setB] = useState<Brief>(data.brief ?? data.suggested);
  const [attach, setAttach] = useState("");
  const [tried, setTried] = useState(false);
  const save = useSaveBrief();
  const offer = useSendOffer();
  const toast = useToast();
  const set = (p: Partial<Brief>) => setB({ ...b, ...p });
  const clientDay = data.clientDeadline.slice(0, 10);
  const errs = [
    !b.steps.some((s) => s.text.trim()) && "steps",
    !b.deadline && "deadline",
    b.deadline > clientDay && "late",
  ].filter(Boolean) as string[];
  const first = lead.name.split(" ")[0];
  const send = async () => {
    setTried(true);
    if (errs.some((e) => e !== "late")) return; // "late" is a warning, not a blocker
    try {
      await save.mutateAsync({
        ref: c.ref,
        brief: { ...b, steps: b.steps.filter((s) => s.text.trim()) },
      });
      await offer.mutateAsync({ ref: c.ref, agentId: lead.id });
      toast({ title: fill(t.saved, { name: lead.name }), tone: "success" });
      setUrlParams({ step: "offer" });
    } catch (e) {
      toast({ title: (e as Error).message, tone: "danger" });
    }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Panel title={fill(t.title, { name: lead.name })}>
        <div className="grid gap-4">
          <label className="grid gap-1 text-label">
            {t.template}
            <select
              className={inp}
              value={b.template}
              onChange={(e) => {
                const tp = data.templates.find((x) => x.id === e.target.value);
                if (tp)
                  set({
                    template: tp.id,
                    steps: tp.steps.map((s) => ({ text: s, done: false })),
                    deliverables: tp.deliverables,
                  });
              }}
            >
              {data.templates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-label">
            {t.instructions}
            <textarea
              rows={3}
              maxLength={2000}
              value={b.instructions}
              onChange={(e) => set({ instructions: e.target.value })}
              className="border border-border-strong bg-white px-3 py-2 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
            />
          </label>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label">{t.steps}</legend>
            <ol className="grid gap-2">
              {b.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-5 text-right text-small text-fg-muted tabular">
                    {i + 1}
                  </span>
                  <input
                    aria-label={`${t.steps} ${i + 1}`}
                    className={inp}
                    value={s.text}
                    placeholder={t.stepPh}
                    onChange={(e) =>
                      set({
                        steps: b.steps.map((x, k) =>
                          k === i ? { ...x, text: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={fill(t.removeStep, { n: i + 1 })}
                    onClick={() =>
                      set({ steps: b.steps.filter((_, k) => k !== i) })
                    }
                    className="flex size-9 shrink-0 items-center justify-center hover:bg-navy-50"
                  >
                    <Icon name="x" size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
            <Button
              size="sm"
              variant="outline"
              className="justify-self-start"
              onClick={() =>
                set({ steps: [...b.steps, { text: "", done: false }] })
              }
            >
              <Icon name="plus" size={14} aria-hidden />
              {t.addStep}
            </Button>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-label">
              {t.deadline}
              <input
                type="date"
                className={inp}
                value={b.deadline}
                max={clientDay}
                onChange={(e) => set({ deadline: e.target.value })}
                aria-invalid={
                  (tried &&
                    (errs.includes("deadline") || errs.includes("late"))) ||
                  undefined
                }
              />
              <span
                className={cx(
                  "text-eyebrow font-normal",
                  errs.includes("late") ? "text-danger" : "text-fg-muted",
                )}
              >
                {errs.includes("late")
                  ? t.errors.late
                  : fill(t.clientDeadline, {
                      d: shortDate(data.clientDeadline, locale),
                    })}
              </span>
            </label>
            <fieldset>
              <legend className="mb-1 text-label">{t.priority}</legend>
              <div className="flex gap-1.5">
                {(["low", "normal", "high"] as const).map((p) => (
                  <label
                    key={p}
                    className={cx(
                      "inline-flex h-10 cursor-pointer items-center border px-3.5 text-small has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                      b.priority === p
                        ? "border-secondary bg-secondary text-on-secondary"
                        : "border-border-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="prio"
                      className="sr-only"
                      checked={b.priority === p}
                      onChange={() => set({ priority: p })}
                    />
                    {t.priorities[p]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <ListEditor
            label={t.deliverables}
            items={b.deliverables}
            onChange={(deliverables) => set({ deliverables })}
            addLabel={t.addDeliverable}
            removeLabel={t.remove}
          />
          <div className="grid gap-2">
            <p className="text-label">{t.attachments}</p>
            <ul className="flex flex-wrap gap-1.5">
              {b.attachments.map((a) => (
                <li
                  key={a}
                  className="inline-flex h-8 items-center gap-1 bg-bg-subtle pl-3 pr-1 text-small"
                >
                  <Icon name="file" size={13} aria-hidden />
                  {a}
                  <button
                    type="button"
                    aria-label={fill(t.remove, { item: a })}
                    onClick={() =>
                      set({ attachments: b.attachments.filter((x) => x !== a) })
                    }
                    className="flex size-6 items-center justify-center hover:bg-navy-100"
                  >
                    <Icon name="x" size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                aria-label={t.attachments}
                className={inp}
                value={attach}
                placeholder={t.attachPh}
                onChange={(e) => setAttach(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!attach.trim()}
                onClick={() => {
                  set({
                    attachments: [
                      ...new Set([...b.attachments, attach.trim()]),
                    ],
                  });
                  setAttach("");
                }}
              >
                {t.add}
              </Button>
            </div>
          </div>
          {tried && errs.filter((e) => e !== "late").length > 0 && (
            <ul role="alert" className="text-small font-medium text-danger">
              {errs
                .filter((e) => e !== "late")
                .map((e) => (
                  <li key={e}>{t.errors[e]}</li>
                ))}
            </ul>
          )}
        </div>
      </Panel>
      <div className="grid content-start gap-3 xl:sticky xl:top-20">
        <section
          aria-label={fill(t.preview, { name: first })}
          className="theme-dark grid gap-3 bg-navy-900 p-4 text-fg"
        >
          <p className="text-eyebrow opacity-70">
            {fill(t.preview, { name: first })}
          </p>
          <p className="text-label">
            {c.service} · <span className="tabular">{c.ref}</span>
          </p>
          <p className="flex flex-wrap gap-2 text-eyebrow">
            <span className="bg-bg-subtle px-2 py-0.5">
              {t.priorities[b.priority]}
            </span>
            {b.deadline && (
              <span className="bg-bg-subtle px-2 py-0.5">
                {fill(t.due, { d: shortDate(b.deadline, locale) })}
              </span>
            )}
            <span className="bg-bg-subtle px-2 py-0.5">
              {fill(t.nSteps, { n: b.steps.length })}
            </span>
          </p>
          {b.instructions && (
            <p className="text-small opacity-90">{b.instructions}</p>
          )}
          <ol className="grid gap-1 text-small">
            {b.steps
              .filter((s) => s.text)
              .map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-1 size-3 shrink-0 border border-border"
                  />
                  {s.text}
                </li>
              ))}
          </ol>
          {b.deliverables.length > 0 && (
            <ul className="grid gap-1 border-t border-border pt-2 text-eyebrow">
              {b.deliverables.map((d) => (
                <li key={d} className="flex items-center gap-1.5">
                  <Icon name="upload" size={12} aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          )}
        </section>
        <Button
          dots
          className="justify-center max-xl:sticky max-xl:bottom-16"
          loading={save.isPending || offer.isPending}
          onClick={send}
        >
          {t.send}
        </Button>
      </div>
    </div>
  );
}

function ListEditor({
  label,
  items,
  onChange,
  addLabel,
  removeLabel,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-label">{label}</legend>
      {items.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            aria-label={`${label} ${i + 1}`}
            className={inp}
            value={d}
            onChange={(e) =>
              onChange(items.map((x, k) => (k === i ? e.target.value : x)))
            }
          />
          <button
            type="button"
            aria-label={fill(removeLabel, { item: d || String(i + 1) })}
            onClick={() => onChange(items.filter((_, k) => k !== i))}
            className="flex size-9 shrink-0 items-center justify-center hover:bg-navy-50"
          >
            <Icon name="x" size={14} aria-hidden />
          </button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="justify-self-start"
        onClick={() => onChange([...items, ""])}
      >
        <Icon name="plus" size={14} aria-hidden />
        {addLabel}
      </Button>
    </fieldset>
  );
}

// ---------------------------------------------------------------- BR2 sharing matrix
const ROLES: ScopeRole[] = ["lead", "helper", "external"];
const maskPhone = (p: string) =>
  p.replace(/(\+\d{3} \d{3}) \d{3} (\d{3})/, "$1 •••• $2");
const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1•••$2");

export function ScopeStep({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const q = useScope(c.ref);
  const agents = useAgents();
  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError)
    return (
      <PanelError
        what={opsAssign(locale).steps.scope}
        onRetry={() => q.refetch()}
      />
    );
  const ext =
    c.assignees
      .map((a) => agents.data?.find((g) => g.id === a.id))
      .find((g) => g?.external) ?? agents.data?.find((g) => g.external);
  return (
    <ScopeForm
      key={q.dataUpdatedAt}
      c={c}
      data={q.data}
      externalName={ext?.name ?? null}
    />
  );
}

function ScopeForm({
  c,
  data,
  externalName,
}: {
  c: CaseDetailVM;
  data: { scope: Scope; phone: string; email: string };
  externalName: string | null;
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale).scope;
  const [s, setS] = useState<Scope>(data.scope);
  const save = useSaveScope();
  const toast = useToast();
  const toggle = (k: (typeof SCOPE_KEYS)[number], r: ScopeRole) =>
    setS({ ...s, [k]: { ...s[k], [r]: !s[k][r] } });
  const masked = (k: string) =>
    k === "phone"
      ? maskPhone(data.phone)
      : k === "email"
        ? maskEmail(data.email)
        : null;
  const summary = fill(t.summary, {
    name: externalName?.split(" ")[0] ?? t.cols.external,
    n: scopeCount(s, "external"),
    t: SCOPE_KEYS.length,
  });
  return (
    <Panel
      title={t.title}
      action={
        <p
          role="status"
          className="bg-gold-200 px-3 py-1 text-small font-medium"
        >
          {summary}
        </p>
      }
    >
      <div
        tabIndex={0}
        role="region"
        aria-label={t.region}
        className="overflow-x-auto max-md:hidden"
      >
        <table className="w-full text-small">
          <thead className="bg-ink-100 text-eyebrow text-fg-muted">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t.item}
              </th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  scope="col"
                  className="w-28 px-3 py-2 text-center font-medium"
                >
                  {t.cols[r]}{" "}
                  <span className="tabular">({scopeCount(s, r)})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCOPE_KEYS.map((k) => (
              <tr key={k} className="border-b border-border hover:bg-navy-50">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {t.rows[k]}
                  {masked(k) && (
                    <span className="block text-eyebrow text-fg-subtle tabular">
                      {t.masked}: {masked(k)}
                    </span>
                  )}
                </th>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="size-4 accent-navy-700"
                      checked={s[k][r]}
                      onChange={() => toggle(k, r)}
                      aria-label={fill(t.allowFor, {
                        item: t.rows[k],
                        role: t.cols[r],
                      })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-2 md:hidden">
        {SCOPE_KEYS.map((k) => (
          <li
            key={k}
            className="grid gap-2 border border-border p-3"
          >
            <p className="text-small font-medium">
              {t.rows[k]}
              {masked(k) && (
                <span className="block text-eyebrow font-normal text-fg-subtle tabular">
                  {t.masked}: {masked(k)}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-small">
                  <input
                    type="checkbox"
                    className="size-5 accent-navy-700"
                    checked={s[k][r]}
                    onChange={() => toggle(k, r)}
                  />
                  {t.cols[r]}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button
          dots
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              { ref: c.ref, scope: s },
              {
                onSuccess: () => toast({ title: t.saved, tone: "success" }),
                onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
              },
            )
          }
        >
          {t.save}
        </Button>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- BR3 offers + BR4 reassign
const tick = (fn: () => void) => {
  const id = setInterval(fn, 1000);
  return () => clearInterval(id);
};
const nowSec = () => Math.floor(Date.now() / 1000) * 1000;
function Countdown({ until }: { until: string }) {
  const now = useSyncExternalStore(tick, nowSec, () => null);
  if (now === null) return null;
  const ms = Math.max(0, Date.parse(until) - now);
  const h = Math.floor(ms / 3600_000),
    m = Math.floor((ms % 3600_000) / 60_000),
    s = Math.floor((ms % 60_000) / 1000);
  return (
    <span className="tabular">
      {h ? `${h}h ` : ""}
      {m}m {String(s).padStart(2, "0")}s
    </span>
  );
}

export function OfferStep({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const t = opsAssign(locale).offer;
  const q = useOffers(c.ref);
  const sugg = useSuggestions(c.ref, false);
  const send = useSendOffer();
  const toast = useToast();
  const [reassigning, setReassigning] = useState(false);
  if (q.isPending) return <Skeleton className="h-72" />;
  if (q.isError)
    return <PanelError what={t.title} onRetry={() => q.refetch()} />;
  const offers = q.data;
  const cur = offers.at(-1);
  if (!cur)
    return (
      <EmptyPanel
        title={t.none}
        body={t.noneBody}
        action={
          <Button size="sm" onClick={() => setUrlParams({ step: "brief" })}>
            {t.toBrief}
          </Button>
        }
      />
    );
  const tried = new Set(offers.map((o) => o.agentId));
  const next = sugg.data?.suggestions.find((s) => !tried.has(s.agent.id));
  const ended = cur.state === "declined" || cur.state === "timeout";
  const offerNext = () =>
    next &&
    send.mutate(
      { ref: c.ref, agentId: next.agent.id },
      {
        onSuccess: () =>
          toast({
            title: fill(opsAssign(locale).brief.saved, {
              name: next.agent.name,
            }),
            tone: "success",
          }),
        onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
      },
    );
  return (
    <div className="grid gap-4">
      <Panel
        title={t.title}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReassigning(true)}
          >
            {t.reassign}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={cur.agentName} />
          <p className="flex-1 text-label">{cur.agentName}</p>
          {cur.state !== "withdrawn" && <OfferPill state={cur.state} />}
          {(cur.state === "sent" || cur.state === "viewed") && (
            <span className="inline-flex items-center gap-1.5 text-small text-fg-muted">
              <Icon name="clock" size={14} aria-hidden />
              {t.timer.replace("{t}", "")}
              <Countdown until={cur.expiresAt} />
            </span>
          )}
        </div>
        <ol className="mt-4 grid gap-0 sm:grid-cols-3" aria-live="polite">
          <Stage done label={opsCommon(locale).offer.sent} at={cur.sentAt} />
          <Stage
            done={!!cur.viewedAt}
            label={opsCommon(locale).offer.viewed}
            at={cur.viewedAt}
          />
          <Stage
            done={cur.state === "accepted" || ended}
            bad={ended}
            label={
              opsCommon(locale).offer[
                cur.state === "withdrawn"
                  ? "sent"
                  : cur.state === "sent" || cur.state === "viewed"
                    ? "accepted"
                    : cur.state
              ]
            }
            at={cur.endedAt}
          />
        </ol>
        {cur.state === "accepted" && (
          <p
            role="status"
            className="mt-3 bg-success-bg px-3 py-2 text-small font-medium text-success"
          >
            {fill(t.accepted, { name: cur.agentName })}
          </p>
        )}
        {ended && (
          <div
            role="status"
            className="mt-3 flex flex-wrap items-center gap-3 bg-warning-bg px-3 py-2.5 text-small text-warning"
          >
            <span className="flex-1 font-medium">
              {cur.state === "declined"
                ? fill(t.declined, { r: cur.declineReason ?? "" })
                : t.timedOut}
            </span>
            {next && (
              <Button size="sm" loading={send.isPending} onClick={offerNext}>
                {t.next} · {next.agent.name}
              </Button>
            )}
          </div>
        )}
      </Panel>
      {offers.length > 1 && (
        <Panel title={t.history}>
          <ul className="grid gap-2">
            {offers
              .slice(0, -1)
              .reverse()
              .map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center gap-2 text-small"
                >
                  <span className="flex-1">{o.agentName}</span>
                  {o.state === "withdrawn" ? (
                    <span className="text-eyebrow text-fg-muted">
                      {t.withdrawn}
                    </span>
                  ) : (
                    <OfferPill state={o.state} />
                  )}
                  <time className="text-eyebrow text-fg-subtle tabular">
                    {formatDateTime(o.sentAt, locale)}
                  </time>
                </li>
              ))}
          </ul>
        </Panel>
      )}
      {reassigning && (
        <ReassignDialog
          c={c}
          current={cur}
          onClose={() => setReassigning(false)}
        />
      )}
    </div>
  );
}

function Stage({
  done,
  bad,
  label,
  at,
}: {
  done: boolean;
  bad?: boolean;
  label: string;
  at?: string;
}) {
  const { locale } = useI18n();
  return (
    <li
      className="flex items-center gap-2 border-l-2 py-2 pl-3 sm:border-t-2 sm:border-l-0 sm:pt-3 sm:pl-0 sm:pr-3"
      style={{
        borderColor: done
          ? bad
            ? "var(--color-warning)"
            : "var(--color-success)"
          : "var(--color-border)",
      }}
    >
      <span
        className={cx(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          done
            ? bad
              ? "bg-warning-bg text-warning"
              : "bg-success-bg text-success"
            : "bg-bg-subtle text-fg-subtle",
        )}
      >
        <Icon
          name={done ? (bad ? "x" : "check") : "clock"}
          size={12}
          aria-hidden
        />
      </span>
      <span className="text-small">
        <span className="font-medium">{label}</span>
        {at && (
          <span className="block text-eyebrow text-fg-subtle tabular">
            {formatDate(at, locale, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </span>
    </li>
  );
}

function ReassignDialog({
  c,
  current,
  onClose,
}: {
  c: CaseDetailVM;
  current: Offer;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale).reassign;
  const agents = useAgents();
  const re = useReassign();
  const toast = useToast();
  const [to, setTo] = useState("");
  const [handoff, setHandoff] = useState("");
  const [revoke, setRevoke] = useState(true);
  const [split, setSplit] = useState(false);
  const [pct, setPct] = useState(30);
  const [notify, setNotify] = useState(false);
  const from = current.agentName.split(" ")[0];
  const options = (agents.data ?? []).filter(
    (a: AgentRow) =>
      a.id !== current.agentId && a.services.includes(c.serviceSlug),
  );
  return (
    <ReasonDialog
      open
      onClose={onClose}
      title={fill(t.title, { ref: c.ref })}
      asRadios
      audited
      options={Object.values(t.reasons).map((v) => ({ value: v, label: v }))}
      noteLabel={t.note}
      confirmLabel={t.confirm}
      description={
        <>
          {t.from}:{" "}
          <span className="font-medium text-fg">{current.agentName}</span>
        </>
      }
      extra={
        <div className="grid gap-3">
          <label className="grid gap-1 text-label">
            {t.to}
            <select
              className={inp}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-invalid={!to || undefined}
            >
              <option value="">{t.pick}</option>
              {options.map((a) => (
                <option
                  key={a.id}
                  value={a.id}
                  disabled={a.load >= a.cap || !!a.onLeaveUntil}
                >
                  {a.name} · {a.load}/{a.cap}
                  {a.external ? ` · ${a.location ?? ""}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-label">
            {t.handoff}
            <textarea
              rows={2}
              maxLength={1000}
              value={handoff}
              onChange={(e) => setHandoff(e.target.value)}
              className="border border-border-strong bg-white px-3 py-2 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
            />
          </label>
          <Switch
            label={fill(t.revoke, { name: from })}
            checked={revoke}
            onChange={(e) => setRevoke(e.target.checked)}
            className="text-small"
          />
          <Switch
            label={t.split}
            checked={split}
            onChange={(e) => setSplit(e.target.checked)}
            className="text-small"
          />
          {split && (
            <label className="grid max-w-40 gap-1 text-label">
              {fill(t.splitPct, { name: from })}
              <input
                className={inp}
                type="number"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
              />
            </label>
          )}
          <Switch
            label={t.notify}
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="text-small"
          />
        </div>
      }
      notice={
        !notify ? (
          <p className="flex items-start gap-2 bg-warning-bg px-3 py-2.5 text-small text-warning">
            <Icon
              name="message"
              size={15}
              aria-hidden
              className="mt-0.5 shrink-0"
            />
            {t.warn}
          </p>
        ) : undefined
      }
      onConfirm={async ({ reason, note }) => {
        if (!to) throw new Error(t.required);
        await re.mutateAsync({
          ref: c.ref,
          to,
          reason,
          note,
          handoff,
          revoke,
          splitPct: split ? pct : undefined,
          notify,
        });
        toast({
          title: fill(t.done, {
            name: options.find((a) => a.id === to)?.name ?? "",
          }),
          tone: "success",
        });
      }}
    />
  );
}

// ---------------------------------------------------------------- BR5 auto-assign rules
export function RulesStep({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const q = useRules(c.serviceSlug);
  const agents = useAgents();
  if (q.isPending || agents.isPending)
    return <Skeleton className="h-80" />;
  if (q.isError)
    return (
      <PanelError
        what={opsAssign(locale).steps.rules}
        onRetry={() => q.refetch()}
      />
    );
  if (agents.isError)
    return (
      <PanelError
        what={opsAssign(locale).rules.pool}
        onRetry={() => agents.refetch()}
      />
    );
  return (
    <RulesForm key={q.dataUpdatedAt} c={c} data={q.data} agents={agents.data} />
  );
}

function RulesForm({
  c,
  data,
  agents,
}: {
  c: CaseDetailVM;
  data: NonNullable<ReturnType<typeof useRules>["data"]>;
  agents: AgentRow[];
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale).rules;
  const [mode, setMode] = useState<RuleMode>(data.mode);
  const [pool, setPool] = useState(data.pool);
  const [cap, setCap] = useState(data.cap);
  const [vip, setVip] = useState(data.vipApproval);
  const [assignMode, setAssignMode] = useState(data.assignMode ?? "auto");
  const [threshold, setThreshold] = useState(data.threshold ?? 50);
  const save = useSaveRules();
  const toast = useToast();
  const preview = previewNext({ mode, pool, cap }, agents, c.serviceSlug);
  const cands = agents.filter((a) => data.candidates.includes(a.id));
  return (
    <Panel title={fill(t.title, { service: c.service })}>
      <div className="grid gap-5">
        <fieldset>
          <legend className="mb-2 text-label">{t.mode}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(t.modes) as RuleMode[]).map((m) => (
              <label
                key={m}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 border px-3 py-2.5 text-small",
                  mode === m
                    ? "border-navy-700 bg-bg-tint"
                    : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  className="size-4 accent-navy-700"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                {t.modes[m]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-label">{t.pool}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {cands.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-2.5 border border-border px-3 py-2 text-small"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-navy-700"
                  checked={pool.includes(a.id)}
                  onChange={() =>
                    setPool(
                      pool.includes(a.id)
                        ? pool.filter((x) => x !== a.id)
                        : [...pool, a.id],
                    )
                  }
                />
                <span className="flex-1">{a.name}</span>
                <span className="text-eyebrow text-fg-muted tabular">
                  {a.load}/{a.cap}
                </span>
              </label>
            ))}
          </div>
          {!pool.length && (
            <p role="alert" className="mt-1 text-small text-danger">
              {t.poolEmpty}
            </p>
          )}
        </fieldset>
        <div className="flex flex-wrap items-end gap-5">
          <label className="grid w-32 gap-1 text-label">
            {t.cap}
            <input
              className={inp}
              type="number"
              min={1}
              max={20}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-small">
            {t.assignMode}
            <Select value={assignMode} onChange={(e) => setAssignMode(e.target.value as "manual" | "suggest" | "auto")}>
              {(["manual", "suggest", "auto"] as const).map((m) => <option key={m} value={m}>{t.assignModes[m]}</option>)}
            </Select>
          </label>
          {assignMode === "auto" && (
            <label className="grid gap-1 text-small">
              {t.threshold}
              <Input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </label>
          )}
          <Switch
            label={t.vip}
            checked={vip}
            onChange={(e) => setVip(e.target.checked)}
            className="pb-2 text-small"
          />
        </div>
        <p role="status" className="bg-bg-subtle px-3 py-2.5 text-small">
          {preview.length
            ? fill(t.preview, {
                names: preview.map((n) => n.split(" ")[0]).join(", "),
              })
            : t.previewNone}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span />
          <Button
            dots
            disabled={!pool.length}
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  slug: c.serviceSlug,
                  rules: { mode, pool, cap, vipApproval: vip, assignMode, threshold },
                },
                {
                  onSuccess: () => toast({ title: t.saved, tone: "success" }),
                  onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
                },
              )
            }
          >
            {t.save}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

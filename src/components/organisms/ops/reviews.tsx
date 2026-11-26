"use client";
// U13 Reviews (board 13 RV1–RV6 + PR1): queue, viewer with inline preview + pins + v1↔v2, reviewer ≠ author,
// SplitButton approve, return with comments, payment-gate override (reason + proof + step-up + audit),
// second-level chain, revenue allocation review.
import { uploadFile } from "@/lib/api/upload";
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatMoney, formatRelative } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import { ApiError } from "@/lib/api/client";
import {
  useReviews,
  useReview,
  useReviewComment,
  useDecide,
  useOverrideGate,
  useSecondApproval,
  useSecondApprove,
  useAllocation,
  allocate,
  type ReviewDetail,
  type ReviewItem,
  type Decision,
} from "@/lib/ops/c";
import { opsReviews } from "@/content/pages/ops-reviews";
import { SlaChip, PaymentChip } from "@/components/atoms/ops";
import {
  Panel,
  PanelError,
  EmptyPanel,
  ReasonDialog,
  SplitButton,
} from "@/components/molecules/ops/ops";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Avatar } from "@/components/atoms/misc";
import { Icon } from "@/components/atoms/icon";
import { DateInput, Textarea, Input } from "@/components/atoms/field";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useStepUp, StepUpCancelled, useNow } from "@/components/atoms/step-up";

const useR = () => {
  const { locale } = useI18n();
  return { c: opsReviews(locale), locale };
};
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
type Tab = "mine" | "returned" | "approved";

// ---------------------------------------------------------------- RV1 queue
export function ReviewQueue() {
  const { c } = useR();
  const p = useUrlParams();
  const tab = (
    ["mine", "returned", "approved"].includes(p.get("tab") ?? "")
      ? p.get("tab")
      : "mine"
  ) as Tab;
  const q = useReviews(tab);
  return (
    <div className="grid gap-5 pb-24 lg:pb-8">
      <header className="grid gap-1">
        <h1 className="text-h2">{c.title}</h1>
        <p className="text-body text-fg-muted">{c.lede}</p>
      </header>
      <Tabs
        value={tab}
        onChange={(id) => setUrlParams({ tab: id === "mine" ? null : id })}
        tabs={(["mine", "returned", "approved"] as Tab[]).map((id) => ({
          id,
          label: c.tabs[id],
          count: q.data?.counts[id],
          content: <QueueList tab={id} q={q} />,
        }))}
      />
    </div>
  );
}

function QueueList({ tab, q }: { tab: Tab; q: ReturnType<typeof useReviews> }) {
  const { c, locale } = useR();
  const router = useRouter();
  const now = useNow(60_000);
  const [focus, setFocus] = useState(0);
  const items = q.data?.items ?? [];
  const open = (r: ReviewItem) =>
    router.push(localHref(locale, `/ops/reviews/${r.id}`));
  useShortcut(
    "j",
    "Next review",
    () => setFocus((f) => Math.min(items.length - 1, f + 1)),
    "list",
  );
  useShortcut(
    "k",
    "Previous review",
    () => setFocus((f) => Math.max(0, f - 1)),
    "list",
  );
  useShortcut(
    "enter",
    "Open review",
    () => items[focus] && open(items[focus]),
    "list",
  );
  if (q.isPending)
    return (
      <div className="grid gap-2" aria-busy>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  if (q.isError)
    return <PanelError what={c.loadErr} onRetry={() => q.refetch()} />;
  if (!items.length) return <EmptyPanel title={c.empty[tab]} />;
  const pay = (r: ReviewItem) => (
    <span className="grid justify-items-start gap-0.5">
      <PaymentChip status={r.payment} />
      {r.outstanding > 0 && r.state === "awaiting" && (
        <span className="text-eyebrow font-medium text-danger">
          {c.blocked}
        </span>
      )}
    </span>
  );
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {fill(c.live, { n: items.length })}
      </p>
      <div
        className="hidden overflow-x-auto border border-border bg-white md:block"
        tabIndex={0}
        role="region"
        aria-label={c.table}
      >
        <table className="w-full text-small">
          <thead className="sticky top-0 bg-white text-left text-eyebrow text-fg-subtle">
            <tr className="border-b border-border">
              {(
                [
                  "deliverable",
                  "ref",
                  "by",
                  "version",
                  "submitted",
                  "sla",
                  "payment",
                ] as const
              ).map((k) => (
                <th
                  key={k}
                  className={cx(
                    "px-3 py-3 font-medium first:pl-4",
                    (k === "version" || k === "submitted") && "text-right",
                  )}
                >
                  {c.cols[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr
                key={r.id}
                className={cx(
                  "border-b border-border last:border-0 hover:bg-navy-50",
                  i === focus && "bg-navy-50",
                )}
              >
                <td className="py-3 pr-3 pl-4">
                  <Link
                    href={localHref(locale, `/ops/reviews/${r.id}`)}
                    className="grid font-medium underline-offset-4 hover:underline"
                  >
                    {r.deliverable}
                    <span className="text-eyebrow font-normal text-fg-subtle">
                      {r.service}
                    </span>
                  </Link>
                  {r.secondLevel && (
                    <span className="mt-1 inline-flex bg-gold-400 px-2 text-eyebrow text-on-gold">
                      {c.second}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 tabular">{r.ref}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    <Avatar name={r.authorName} size="sm" />
                    {r.authorName}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular">v{r.version}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {now ? formatRelative(r.submittedAt, locale, now) : ""}
                </td>
                <td className="px-3 py-3">
                  <SlaChip due={r.reviewDueAt} done={r.state !== "awaiting"} />
                </td>
                <td className="px-3 py-3">{pay(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={localHref(locale, `/ops/reviews/${r.id}`)}
              className="grid gap-2 border border-border bg-white p-4"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="grid">
                  <span className="font-medium">{r.deliverable}</span>
                  <span className="text-eyebrow text-fg-subtle">
                    {r.ref} · {r.service} · v{r.version}
                  </span>
                </span>
                {r.secondLevel && (
                  <span className="bg-gold-400 px-2 text-eyebrow text-on-gold">
                    {c.second}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-small">
                <Avatar name={r.authorName} size="sm" />
                {r.authorName}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <SlaChip due={r.reviewDueAt} done={r.state !== "awaiting"} />
                {pay(r)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- RV2 viewer
export function ReviewViewer({ id }: { id: string }) {
  const { c, locale } = useR();
  const q = useReview(id);
  if (q.isPending)
    return (
      <div className="grid gap-4 lg:grid-cols-[14rem_1fr_22rem]" aria-busy>
        <Skeleton className="h-64" />
        <Skeleton className="h-[32rem]" />
        <Skeleton className="h-96" />
      </div>
    );
  if (q.isError)
    return q.error instanceof ApiError && q.error.status === 404 ? (
      <EmptyPanel
        title={c.notFound}
        action={
          <Link className="underline" href={localHref(locale, "/ops/reviews")}>
            {c.back}
          </Link>
        }
      />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    );
  return <Viewer r={q.data} />;
}

function Viewer({ r }: { r: ReviewDetail }) {
  const { c, locale } = useR();
  const p = useUrlParams();
  const file = r.files.find((f) => f.id === p.get("file")) ?? r.files[0];
  const latest = file.versions.at(-1)!;
  const version =
    file.versions.find((v) => v.v === Number(p.get("v"))) ?? latest;
  const pageN = Math.min(
    version.pages.length,
    Math.max(1, Number(p.get("page") ?? 1) || 1),
  );
  const compare = p.get("compare") === "1" && file.versions.length > 1;
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const own = r.authorId === r.viewerId;
  const pins = r.comments.filter(
    (m) => m.fileId === file.id && m.page === pageN,
  );

  return (
    <div className="grid gap-4 pb-40 lg:pb-8">
      <Link
        href={localHref(locale, "/ops/reviews")}
        className="inline-flex w-fit items-center gap-1 text-small underline-offset-4 hover:underline"
      >
        <Icon name="chevronDown" size={14} className="rotate-90" aria-hidden />
        {c.back}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-h3">{r.deliverable}</h1>
          <p className="flex flex-wrap items-center gap-2 text-small text-fg-muted">
            <span className="tabular">{r.ref}</span> · {r.service} · v
            {r.version} · <Avatar name={r.authorName} size="sm" />{" "}
            {r.authorName}
          </p>
        </div>
        <span className="flex flex-wrap gap-2">
          <SlaChip due={r.reviewDueAt} done={r.state !== "awaiting"} />
          <PaymentChip status={r.payment} />
        </span>
      </header>
      {r.gate.blocked && r.state === "awaiting" && <GateBanner r={r} />}
      {r.gate.override && (
        <p
          role="status"
          className="flex items-center gap-2 bg-bg-tint px-4 py-3 text-small"
        >
          <Icon name="shield" size={16} aria-hidden className="text-link" />
          {fill(c.gate.overridden, {
            by: r.gate.override.by,
            reason:
              c.gate.reasons[r.gate.override.reason] ?? r.gate.override.reason,
          })}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_22rem]">
        {/* Files */}
        <nav
          aria-label={c.files}
          className="grid h-fit gap-2 max-lg:flex max-lg:overflow-x-auto"
        >
          {r.files.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-current={f.id === file.id || undefined}
              onClick={() => (
                setUrlParams({
                  file: f.id,
                  v: null,
                  page: null,
                  compare: null,
                }),
                setPin(null)
              )}
              className={cx(
                "flex min-w-48 items-center gap-2 border bg-white p-3 text-left text-small",
                f.id === file.id
                  ? "border-navy-700 ring-2 ring-navy-700/15"
                  : "border-border hover:border-navy-300",
              )}
            >
              <Icon
                name={f.kind === "pdf" ? "file" : "camera"}
                size={18}
                aria-hidden
                className="shrink-0 text-link"
              />
              <span className="grid min-w-0">
                <span className="truncate font-medium">{f.name}</span>
                <span className="text-eyebrow text-fg-subtle">
                  v{f.versions.at(-1)!.v}
                </span>
              </span>
            </button>
          ))}
        </nav>
        {/* Preview */}
        <section
          className="grid min-w-0 gap-3"
          aria-label={fill(c.preview, { f: file.name, n: pageN })}
        >
          <div className="flex flex-wrap items-center gap-2">
            {file.versions.length > 1 && (
              <>
                <div
                  role="radiogroup"
                  aria-label={c.version}
                  className="inline-flex border border-border bg-white p-1"
                >
                  {file.versions.map((v) => (
                    <button
                      key={v.v}
                      type="button"
                      role="radio"
                      aria-checked={v.v === version.v && !compare}
                      onClick={() =>
                        setUrlParams({ v: String(v.v), compare: null })
                      }
                      className={cx(
                        "h-8 px-3 text-small",
                        v.v === version.v && !compare
                          ? "bg-secondary text-on-secondary"
                          : "hover:bg-navy-50",
                      )}
                    >
                      v{v.v}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  aria-pressed={compare}
                  onClick={() =>
                    setUrlParams({ compare: compare ? null : "1" })
                  }
                >
                  {compare ? c.compareOff : c.compare}
                </Button>
              </>
            )}
            <span className="ml-auto text-eyebrow text-fg-subtle">
              {c.pinHint}
            </span>
          </div>
          <div className={cx("grid gap-3", compare && "sm:grid-cols-2")}>
            {(compare ? file.versions : [version]).map((v) => (
              <figure key={v.v} className="relative grid gap-1">
                {compare && (
                  <figcaption className="text-eyebrow text-fg-subtle">
                    v{v.v}
                  </figcaption>
                )}
                <button
                  type="button"
                  className="relative block cursor-crosshair overflow-hidden border border-border bg-white"
                  onClick={(e) => {
                    const b = e.currentTarget.getBoundingClientRect();
                    setPin({
                      x: Math.round(((e.clientX - b.left) / b.width) * 100),
                      y: Math.round(((e.clientY - b.top) / b.height) * 100),
                    });
                  }}
                  aria-label={c.addComment}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- shortcut: mock pages are data-URI images; real PDFs go through <object>/<iframe> per plan §2.8 */}
                  <img
                    src={v.pages[pageN - 1]}
                    alt={fill(c.preview, { f: file.name, n: pageN })}
                    className="block h-auto w-full"
                  />
                  {v.v === latest.v &&
                    pins.map((m, i) => (
                      <span
                        key={m.id}
                        title={m.body}
                        className="absolute flex size-6 -translate-1/2 items-center justify-center rounded-full bg-navy-700 text-eyebrow text-white ring-2 ring-white"
                        style={{ left: `${m.x}%`, top: `${m.y}%` }}
                      >
                        {i + 1}
                        <span className="sr-only">
                          {fill(c.pin, { n: i + 1, b: m.body })}
                        </span>
                      </span>
                    ))}
                  {pin && v.v === version.v && (
                    <span
                      aria-hidden
                      className="absolute size-6 -translate-1/2 animate-pulse rounded-full bg-gold-400 ring-2 ring-navy-700 text-on-gold"
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    />
                  )}
                </button>
              </figure>
            ))}
          </div>
          {version.pages.length > 1 && (
            <ol
              aria-label={c.pages}
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {version.pages.map((src, i) => (
                <li key={i}>
                  <button
                    type="button"
                    aria-current={i + 1 === pageN || undefined}
                    onClick={() => setUrlParams({ page: String(i + 1) })}
                    className={cx(
                      "block w-16 overflow-hidden border-2",
                      i + 1 === pageN ? "border-navy-700" : "border-transparent",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- data-URI thumbnail */}
                    <img
                      src={src}
                      alt={fill(c.page, { n: i + 1 })}
                      className="block w-full"
                    />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
        {/* Right panel */}
        <aside className="grid h-fit gap-4">
          <Panel title={c.requirements}>
            <ul className="grid gap-2">
              {r.requirements.map((q) => (
                <li key={q.id} className="flex items-start gap-2 text-small">
                  <span
                    aria-hidden
                    className={cx(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                      q.met
                        ? "bg-success text-white"
                        : "bg-danger-bg text-danger",
                    )}
                  >
                    <Icon
                      name={q.met ? "check" : "x"}
                      size={12}
                      strokeWidth={2.5}
                    />
                  </span>
                  <span>
                    {q.label}{" "}
                    <span className="sr-only">
                      ({q.met ? c.met : c.notMet})
                    </span>
                    {!q.met && (
                      <span className="block text-eyebrow font-medium text-danger">
                        {c.notMet}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Comments
            r={r}
            fileId={file.id}
            page={pageN}
            pin={pin}
            clearPin={() => setPin(null)}
          />
          <Chain r={r} />
          {r.allocation && <AllocationPanel r={r} />}
        </aside>
      </div>
      <ActionBar r={r} own={own} />
    </div>
  );
}

function Comments({
  r,
  fileId,
  page,
  pin,
  clearPin,
}: {
  r: ReviewDetail;
  fileId: string;
  page: number;
  pin: { x: number; y: number } | null;
  clearPin: () => void;
}) {
  const { c, locale } = useR();
  const toast = useToast();
  const add = useReviewComment();
  const now = useNow(60_000);
  const [body, setBody] = useState("");
  const list = r.comments.filter((m) => m.fileId === fileId);
  const send = () =>
    body.trim() &&
    add.mutate(
      {
        reviewId: r.id,
        fileId,
        body: body.trim(),
        page,
        x: pin?.x ?? 50,
        y: pin?.y ?? 50,
      },
      {
        onSuccess: () => (setBody(""), clearPin()),
        onError: () => toast({ title: c.failed, tone: "danger" }),
      },
    );
  return (
    <Panel title={c.comments}>
      {list.length === 0 ? (
        <p className="text-small text-fg-muted">{c.noComments}</p>
      ) : (
        <ol className="mb-3 grid gap-2" aria-live="polite">
          {list.map((m) => (
            <li
              key={m.id}
              className="grid gap-0.5 bg-bg-subtle p-3 text-small"
            >
              <span className="flex flex-wrap justify-between gap-2 text-eyebrow text-fg-subtle">
                <span>{m.author}</span>
                <span>
                  {fill(c.pinned, { n: m.page })} ·{" "}
                  {now ? formatRelative(m.at, locale, now) : ""}
                </span>
              </span>
              {m.body}
            </li>
          ))}
        </ol>
      )}
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="grid gap-1">
          <span className="text-label">{c.addComment}</span>
          {pin && (
            <span className="text-eyebrow text-link">
              {fill(c.pinned, { n: page })}
            </span>
          )}
          <Textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={c.commentPh}
            maxLength={1000}
          />
        </label>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="w-fit"
          loading={add.isPending}
          disabled={!body.trim()}
        >
          {c.send}
        </Button>
      </form>
    </Panel>
  );
}

function ActionBar({ r, own }: { r: ReviewDetail; own: boolean }) {
  const { c, locale } = useR();
  const toast = useToast();
  const decide = useDecide();
  const [ret, setRet] = useState(false);
  const waitingSecond =
    r.secondLevel &&
    r.chain[0]?.state === "approved" &&
    r.chain[1]?.state !== "approved";
  const run = (decision: Decision) =>
    decide.mutate(
      { id: r.id, decision },
      {
        onSuccess: () =>
          toast({
            title: fill(r.secondLevel ? c.waitingSecond : c.approved, {
              r: r.ref,
            }),
            tone: "success",
            action: {
              label: c.undo,
              onClick: () => decide.mutate({ id: r.id, decision: "reopen" }),
            },
          }),
        onError: (e) =>
          toast({
            title:
              errorCopy(e, locale),
            tone: "danger",
          }),
      },
    );
  useShortcut(
    "r",
    "Return with comments",
    () => !own && r.state === "awaiting" && setRet(true),
    "case",
  );
  if (r.state === "returned" && r.returned)
    return (
      <p
        role="status"
        className="w-fit bg-bg-tint px-4 py-2 text-small font-medium"
      >
        {fill(c.ret.result, {
          a: r.returned.to,
          d: formatDate(`${r.returned.due}T12:00:00Z`, locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
        })}
      </p>
    );
  if (r.state !== "awaiting") return null;
  return (
    <div className="sticky bottom-20 z-10 grid gap-2 border border-border bg-white/95 p-3 shadow-sm backdrop-blur lg:bottom-4">
      {own && (
        <p
          role="note"
          className="flex items-center gap-2 text-small text-fg-muted"
        >
          <Icon name="lock" size={14} aria-hidden />
          {c.ownWork}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button data-guide="ops-review-return" variant="outline" disabled={own} onClick={() => setRet(true)}>
          {c.returnBtn}
        </Button>
        {own || waitingSecond ? (
          <Button data-guide="ops-review-approve" disabled aria-describedby={own ? undefined : "second-note"}>
            {c.approve}
          </Button>
        ) : r.gate.blocked ? (
          <SplitButton
            label={c.approveAfter}
            loading={decide.isPending}
            onClick={() => run("approve_after_payment")}
            options={[
              {
                label: c.approve,
                hint: c.overrideFirst,
                onClick: () =>
                  toast({ title: c.overrideFirst, tone: "danger" }),
              },
            ]}
          />
        ) : (
          <SplitButton
            label={c.approve}
            loading={decide.isPending}
            onClick={() => run("approve_release")}
            options={[
              {
                label: c.approveAfter,
                hint: c.approveAfterHint,
                onClick: () => run("approve_after_payment"),
              },
            ]}
          />
        )}
      </div>
      {waitingSecond && (
        <p id="second-note" className="text-right text-eyebrow text-fg-subtle">
          {c.chain.sent}
        </p>
      )}
      <ReturnDialog r={r} open={ret} onClose={() => setRet(false)} />
    </div>
  );
}

// ---------------------------------------------------------------- RV3 return
function ReturnDialog({
  r,
  open,
  onClose,
}: {
  r: ReviewDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { c, locale } = useR();
  const { t } = useI18n();
  const toast = useToast();
  const decide = useDecide();
  const now = useNow(60_000);
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const min = new Date(now + 86_400_000 + 2 * 3600_000)
    .toISOString()
    .slice(0, 10);
  const submit = () => {
    if (!note.trim() && !r.comments.length) return setErr(c.ret.noteErr);
    decide.mutate(
      {
        id: r.id,
        decision: "return",
        note: note.trim(),
        due: due || undefined,
      },
      {
        onSuccess: () => {
          setNote("");
          onClose();
          toast({
            title: fill(c.ret.result, {
              a: r.authorName,
              d: due ? formatDate(`${due}T12:00:00Z`, locale) : "…",
            }),
            tone: "success",
            action: {
              label: c.undo,
              onClick: () => decide.mutate({ id: r.id, decision: "reopen" }),
            },
          });
        },
        onError: () => setErr(c.failed),
      },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.ret.title}
      description={`${r.ref} · ${r.authorName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button dots loading={decide.isPending} onClick={submit}>
            {c.ret.confirm}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <section className="grid gap-2">
          <h3 className="text-label">{c.ret.perFile}</h3>
          {r.comments.length === 0 ? (
            <p className="text-small text-fg-muted">{c.ret.none}</p>
          ) : (
            <ul className="grid gap-2">
              {r.files.map((f) => {
                const list = r.comments.filter((m) => m.fileId === f.id);
                return list.length ? (
                  <li key={f.id} className="bg-bg-subtle p-3 text-small">
                    <span className="font-medium">{f.name}</span>
                    <ul className="mt-1 list-disc pl-5">
                      {list.map((m) => (
                        <li key={m.id}>{m.body}</li>
                      ))}
                    </ul>
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </section>
        <label className="grid gap-1.5">
          <span className="text-label">{c.ret.note}</span>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => (setNote(e.target.value), setErr(null))}
            maxLength={1000}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-label">{c.ret.due}</span>
          <DateInput
            value={due}
            min={min}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        {err && (
          <p role="alert" className="text-small font-medium text-danger">
            {err}
          </p>
        )}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- RV4 gate override
function GateBanner({ r }: { r: ReviewDetail }) {
  const { c, locale } = useR();
  const toast = useToast();
  const override = useOverrideGate();
  const stepUp = useStepUp();
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border border-danger/30 bg-danger-bg px-4 py-3"
    >
      {stepUp.dialog}
      <Icon name="lock" size={18} aria-hidden className="text-danger" />
      <p className="min-w-0 flex-1 text-small font-medium text-danger">
        {fill(c.gate.banner, {
          amount: formatMoney(r.outstanding, "RWF", locale),
        })}
      </p>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Icon name="shield" size={14} aria-hidden />
        {c.gate.override}
      </Button>
      <ReasonDialog
        open={open}
        onClose={() => (setOpen(false), setProof(null))}
        title={c.gate.title}
        description={c.gate.desc}
        options={Object.entries(c.gate.reasons).map(([value, label]) => ({
          value,
          label,
        }))}
        asRadios
        audited
        destructive
        noteLabel={c.ret.note}
        confirmLabel={c.gate.confirm}
        extra={
          <label className="grid gap-1.5">
            <span className="text-label">{c.gate.proof}</span>
            <span className="text-small text-fg-subtle">
              {c.gate.proofHint}
            </span>
            <Input
              type="file"
              accept="application/pdf,image/*"
              className="h-auto py-2"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setProof(null);
                if (f) uploadFile(f, "proof").then((u) => setProof(u.href)).catch((err) => toast({ title: String(err instanceof Error ? err.message : err), tone: "danger" }));
              }}
            />
          </label>
        }
        onConfirm={async ({ reason, note }) => {
          if (reason === "paid_offline" && !proof)
            throw new Error(c.gate.proofErr);
          let token: string;
          try {
            token = await stepUp.request(c.gate.stepUp);
          } catch (e) {
            if (e instanceof StepUpCancelled) throw new Error(c.gate.stepUpCancelled);
            throw e;
          }
          try {
            // proof = stored upload href (/api/files/:id/:name), audited with the override.
            await override.mutateAsync({
              id: r.id,
              reason,
              note,
              proof,
              token,
            });
          } catch (e) {
            if (e instanceof ApiError && e.errorType === "step_up_required")
              stepUp.reset();
            throw e;
          }
          toast({ title: fill(c.gate.done, { r: r.ref }), tone: "success" });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- RV5 approval chain
function Chain({ r }: { r: ReviewDetail }) {
  const { c, locale } = useR();
  const toast = useToast();
  const req = useSecondApproval();
  const approve2 = useSecondApprove();
  const second = r.chain[1];
  return (
    <Panel title={c.chain.title}>
      {r.secondLevel && (
        <p className="mb-3 text-small text-fg-muted">
          {fill(c.chain.high, { amount: formatMoney(r.amount, "RWF", locale) })}
        </p>
      )}
      <ol className="flex flex-wrap items-center gap-2">
        {r.chain.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2">
            {i > 0 && (
              <Icon
                name="arrowRight"
                size={14}
                aria-hidden
                className="text-fg-subtle"
              />
            )}
            <span
              className={cx(
                "inline-flex items-center gap-1.5 px-3 py-1 text-small",
                s.state === "approved"
                  ? "bg-success-bg text-success"
                  : s.state === "requested"
                    ? "bg-warning-bg text-warning"
                    : s.state === "pending"
                      ? "bg-bg-tint text-fg"
                      : "bg-bg-subtle text-fg-muted",
              )}
            >
              <Icon
                name={
                  s.state === "approved"
                    ? "check"
                    : s.state === "requested"
                      ? "clock"
                      : "user"
                }
                size={13}
                aria-hidden
              />
              {s.name} · {c.chain.states[s.state]}
            </span>
          </li>
        ))}
      </ol>
      {second && second.state === "waiting" && r.state === "awaiting" && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          loading={req.isPending}
          onClick={() =>
            req.mutate(
              { id: r.id },
              {
                onSuccess: () =>
                  toast({ title: c.chain.sent, tone: "success" }),
                onError: () => toast({ title: c.failed, tone: "danger" }),
              },
            )
          }
        >
          {c.chain.request}
        </Button>
      )}
      {second?.state === "requested" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p
            role="status"
            className="flex items-center gap-1.5 text-small text-fg-muted"
          >
            <Icon name="check" size={14} aria-hidden />
            {c.chain.sent}
          </p>
          <Button
            size="sm"
            loading={approve2.isPending}
            onClick={() =>
              approve2.mutate(
                { id: r.id },
                {
                  onSuccess: () =>
                    toast({ title: fill(c.chain.done, { r: r.ref }), tone: "success" }),
                  onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
                },
              )
            }
          >
            {c.chain.approve}
          </Button>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- RV6 allocation
function Donut({ a, h, label }: { a: number; h: number; label: string }) {
  const r = 15.9,
    len = 2 * Math.PI * r,
    total = a + h || 1;
  return (
    <svg
      viewBox="0 0 36 36"
      className="size-20 -rotate-90"
      role="img"
      aria-label={label}
    >
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--color-navy-200)"
        strokeWidth="5"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--color-navy-700)"
        strokeWidth="5"
        strokeDasharray={`${(a / total) * len} ${len}`}
      />
    </svg>
  );
}

function AllocationPanel({ r }: { r: ReviewDetail }) {
  const { c, locale } = useR();
  const toast = useToast();
  const save = useAllocation();
  const al = r.allocation!;
  const [shares, setShares] = useState(al.shares);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const res = allocate({ ...al, shares });
  const total = shares.reduce((s, x) => s + x.pct, 0);
  const m = (n: number) => formatMoney(n, "RWF", locale);
  const submit = () => {
    if (!res.valid) return setErr(fill(c.alloc.total, { p: total }));
    if (!reason.trim()) return setErr(c.alloc.reasonErr);
    setErr(null);
    save.mutate(
      { id: r.id, shares, reason: reason.trim() },
      {
        onSuccess: () => toast({ title: c.alloc.done, tone: "success" }),
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  };
  return (
    <Panel title={c.alloc.title}>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-small">
        <dt className="text-fg-muted">{c.alloc.fee}</dt>
        <dd className="text-right tabular">{m(al.fee)}</dd>
        {al.deductions.map((d) => (
          <div key={d.label} className="contents">
            <dt className="text-fg-muted">− {d.label}</dt>
            <dd className="text-right tabular">{m(d.amount)}</dd>
          </div>
        ))}
        <dt className="border-t border-border pt-1 font-medium">
          {c.alloc.net}
        </dt>
        <dd className="border-t border-border pt-1 text-right font-medium tabular">
          {m(res.net)}
        </dd>
      </dl>
      <div className="mt-4 flex items-center gap-4">
        <Donut
          a={res.pool}
          h={res.hebuza}
          label={fill(c.alloc.chart, { a: m(res.pool), h: m(res.hebuza) })}
        />
        <ul className="grid gap-1 text-small">
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 bg-navy-700" />
            {fill(c.alloc.agents, { p: al.agentPct })} ·{" "}
            <span className="tabular">{m(res.pool)}</span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 bg-navy-200" />
            {fill(c.alloc.hebuza, { p: 100 - al.agentPct })} ·{" "}
            <span className="tabular">{m(res.hebuza)}</span>
          </li>
        </ul>
      </div>
      {al.reviewed ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-1.5 text-small text-success"
        >
          <Icon name="check" size={14} aria-hidden />
          {c.alloc.reviewed}
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {shares.map((s, i) => (
            <label
              key={s.id}
              className="grid grid-cols-[1fr_5rem_auto] items-center gap-2 text-small"
            >
              <span>{fill(c.alloc.share, { n: s.name })}</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={s.pct}
                onChange={(e) =>
                  setShares((xs) =>
                    xs.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            pct: Math.max(
                              0,
                              Math.min(100, Number(e.target.value) || 0),
                            ),
                          }
                        : x,
                    ),
                  )
                }
                className="h-9 text-right tabular"
              />
              <span className="w-24 text-right tabular text-fg-muted">
                {m(res.agents[i].amount)}
              </span>
            </label>
          ))}
          {total !== 100 && (
            <p className="text-small font-medium text-danger">
              {fill(c.alloc.total, { p: total })}
            </p>
          )}
          <label className="grid gap-1">
            <span className="text-label">{c.alloc.reason}</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              required
            />
          </label>
          {err && (
            <p role="alert" className="text-small font-medium text-danger">
              {err}
            </p>
          )}
          <Button dots loading={save.isPending} onClick={submit}>
            {c.alloc.mark}
          </Button>
        </div>
      )}
    </Panel>
  );
}

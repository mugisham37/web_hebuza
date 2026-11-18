"use client";
// U6–U7 case page: header, claim lock, status changer (E), hold / reject / other reason dialogs, tabs in ?tab=,
// view-as-client banner. Data from useCase (core) + useRecord (lane B).
import { errorCopy } from "@/lib/api/error-copy";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { opsCommon } from "@/content/pages/ops-common";
import { opsCase, fill } from "@/content/pages/ops-case";
import {
  useCase,
  useClaim,
  useSetStatus,
  type CaseDetailVM,
} from "@/lib/ops/api";
import { useRecord, useViewAs } from "@/lib/ops/b";
import { useShortcut } from "@/lib/ops/shortcuts";
import { ApiError } from "@/lib/api/client";
import { CASE_STATUS_META, type CaseStatus } from "@/shared/domain/case-status";
import type { Move } from "@/shared/ops/transitions";
import {
  OpsStatus,
  SlaChip,
  FlagChip,
  Kbd,
  PaymentChip,
} from "@/components/atoms/ops";
import { CopyRef, ReasonDialog, EmptyPanel } from "@/components/molecules/ops/ops";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { Avatar } from "@/components/atoms/misc";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { StatusPill } from "@/components/atoms/domain";
import {
  AnswersPanel,
  ChecklistPanel,
  RequestDocsDialog,
  AfterSent,
  ReuploadBanner,
  SHEET_SM,
} from "@/components/organisms/ops/triage";
import { DocViewer } from "@/components/organisms/ops/doc-viewer";
import { QuoteBuilder } from "@/components/organisms/ops/quote";
import { TimelineTab, AuditTab, MessagesTab, BillingTab } from "@/components/organisms/ops/record";
import { CaseFieldTab } from "@/components/organisms/field/visit-evidence-panel";
import { fieldCopy } from "@/lib/field/copy";

const TABS = [
  "triage",
  "answers",
  "documents",
  "timeline",
  "messages",
  "billing",
  "audit",
  "field", // Stage 9 field evidence
] as const;
type Tab = (typeof TABS)[number];
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const stamp = () => Date.now(); // event-time clock, kept out of render for the purity lint

export function CaseView({ refId }: { refId: string }) {
  const { locale } = useI18n();
  const t = opsCase(locale);
  const q = useCase(refId);
  const rec = useRecord(refId);
  const params = useUrlParams();
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "")
    ? (params.get("tab") as Tab)
    : "triage";
  // shortcut: a hand-typed ?viewAs=1&why=… skips the dialog/audit; fine while it only renders mock data, gate server-side when the real view-as session lands.
  const viewAs = params.get("viewAs") === "1" && !!params.get("why");
  const toast = useToast();
  const setStatus = useSetStatus();
  const composer = useRef<HTMLTextAreaElement>(null);

  // Claim on open; a 409 means another manager holds it → read-only.
  const { mutate: claim } = useClaim();
  const [claimedByOther, setClaimed] = useState(false);
  useEffect(() => {
    claim(
      { ref: refId },
      { onError: (e) => setClaimed(e instanceof ApiError && e.status === 409) },
    );
  }, [claim, refId]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [dialog, setDialog] = useState<null | {
    kind: "hold" | "reject" | "other";
    move: Move;
  }>(null);
  const [request, setRequest] = useState<null | {
    keys: string[];
    due: string;
  }>(null);
  const [quoteAt, setQuoteAt] = useState<number | null>(null);
  const [sub, setSub] = useState("");

  const dialogTo = dialog ? dialog.move.to : null; // read once: optional chains on state inside JSX props mis-compiled
  const c = q.data;
  const locked = claimedByOther || !!(c && CASE_STATUS_META[c.status].terminal);
  const go = (patch: Record<string, string | null>) => setUrlParams(patch);
  const openRequest = (keys?: string[]) => {
    if (!c) return;
    const missing = c.checklist
      .filter(
        (i) => i.required && (i.state === "missing" || i.state === "rejected"),
      )
      .map((i) => i.key);
    setRequest({
      keys: keys ?? missing,
      due: day(stamp() + 4 * 86_400_000),
    });
  };
  const moveTo = (
    to: CaseStatus,
    extra: { reason?: string; subStatus?: string } = {},
  ) => {
    if (!c) return Promise.resolve();
    const prev = c.status;
    return setStatus
      .mutateAsync({ ref: c.ref, status: to, ...extra })
      .then(() =>
        toast({
          title: fill(t.status.moved, { s: opsCommon(locale).status[to] }),
          tone: "success",
          action: extra.reason
            ? undefined
            : {
                label: t.docs.undo,
                onClick: () =>
                  setStatus.mutate(
                    { ref: c.ref, status: prev },
                    {
                      onError: (e) =>
                        toast({ title: errorCopy(e, locale), tone: "danger" }),
                    },
                  ),
              },
        }),
      );
  };
  const pick = (m: Move) => {
    setStatusOpen(false);
    if (m.to === "on_hold") return setDialog({ kind: "hold", move: m });
    if (m.to === "rejected") return setDialog({ kind: "reject", move: m });
    if (m.to === "awaiting_client_documents") return openRequest();
    if (m.to === "awaiting_quotation") return setQuoteAt(stamp());
    if (m.reason) return setDialog({ kind: "other", move: m });
    moveTo(m.to, { subStatus: sub || undefined }).catch((e) =>
      toast({ title: errorCopy(e, locale), tone: "danger" }),
    );
  };
  const holdMove = c?.moves.find((m) => m.to === "on_hold");
  const resume =
    c?.status === "on_hold"
      ? c.moves.find((m) => m.to !== "cancelled" && !m.blocked)
      : undefined;

  useShortcut(
    "e",
    t.kbd.status,
    () => c && !locked && setStatusOpen(true),
    "case",
  );
  useShortcut(
    "h",
    t.kbd.hold,
    () => holdMove && !locked && setDialog({ kind: "hold", move: holdMove }),
    "case",
  );
  useShortcut(
    "a",
    t.kbd.assign,
    () =>
      c && window.location.assign(localHref(locale, `/ops/assign/${c.ref}`)),
    "case",
  );
  useShortcut(
    "n",
    t.kbd.note,
    () => {
      go({ tab: "timeline" });
      setTimeout(() => composer.current?.focus(), 50);
    },
    "case",
  );

  if (q.isPending) return <CaseSkeleton />;
  if (q.isError) {
    const nf = q.error instanceof ApiError && q.error.isNotFound;
    return nf ? (
      <EmptyPanel
        title={t.notFound}
        body={t.notFoundBody}
        action={
          <ButtonLink href={localHref(locale, "/ops/cases")} size="sm">
            {t.back}
          </ButtonLink>
        }
      />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    );
  }
  const kase = c!;
  const cl = kase.clientInfo;
  const reuploaded = rec.data?.reuploaded ?? 0;

  if (viewAs)
    return <ViewAsClient c={kase} why={params.get("why")!} onExit={() => go({ viewAs: null, why: null })} />;

  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      <Header c={kase} locked={locked} onStatus={() => setStatusOpen(true)} />
      {claimedByOther && (
        <div
          role="alert"
          className="flex items-start gap-3 border border-warning/30 bg-warning-bg px-4 py-3 text-warning"
        >
          <Icon name="lock" size={18} aria-hidden className="mt-0.5" />
          <p className="text-small">
            <span className="font-medium">
              {fill(t.claimed, { name: kase.claimedBy ?? "—" })}
            </span>{" "}
            · {t.claimedBody}
          </p>
        </div>
      )}
      {kase.status === "on_hold" && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 border border-gold-300 bg-gold-50 px-4 py-3"
        >
          <Icon name="clock" size={18} aria-hidden />
          <p className="flex-1 text-small">
            <span className="font-medium">{t.hold.bannerNoDate}</span>
            {kase.subStatus && ` · ${kase.subStatus}`}
          </p>
          <SlaChip due={kase.dueAt} paused />
          {resume && (
            <Button
              size="sm"
              disabled={locked}
              loading={setStatus.isPending}
              onClick={() =>
                moveTo(resume.to)
                  .then(() => toast({ title: t.hold.resumed, tone: "success" }))
                  .catch((e) => toast({ title: errorCopy(e, locale), tone: "danger" }))
              }
            >
              {t.hold.resumeNow}
            </Button>
          )}
        </div>
      )}
      <ReuploadBanner
        n={reuploaded}
        onReview={() => go({ tab: "documents", doc: null })}
      />
      {rec.data && <AfterSent rec={rec.data} c={kase} locked={locked} />}

      <Tabs
        value={tab}
        onChange={(id) => go({ tab: id === "triage" ? null : id })}
        tabs={TABS.map((id) => ({
          id,
          label: id === "field" ? fieldCopy(locale).field : t.tabs[id],
          count: id === "documents" ? rec.data?.docs.length : undefined,
          content:
            id === "triage" ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <AnswersPanel rec={rec} />
                <ChecklistPanel
                  c={kase}
                  locked={locked}
                  onView={(doc) => go({ tab: "documents", doc })}
                  onRequest={openRequest}
                  onReject={() => {
                    const m = kase.moves.find((x) => x.to === "rejected");
                    if (m) setDialog({ kind: "reject", move: m });
                    else
                      toast({
                        title: opsCommon(locale).status[kase.status],
                        body: t.status.whyBody,
                      });
                  }}
                />
              </div>
            ) : id === "answers" ? (
              <AnswersPanel rec={rec} wide />
            ) : id === "documents" ? (
              <DocViewer
                refId={kase.ref}
                rec={rec}
                clientName={kase.client}
                selected={params.get("doc")}
                onSelect={(doc) => go({ doc })}
                locked={locked}
                onRequest={() => openRequest()}
              />
            ) : id === "timeline" ? (
              <TimelineTab
                c={kase}
                composerRef={composer}
                locked={claimedByOther}
              />
            ) : id === "messages" ? (
              <MessagesTab refId={kase.ref} clientName={kase.client} />
            ) : id === "billing" ? (
              <BillingTab c={kase} />
            ) : id === "field" ? (
              <CaseFieldTab caseRef={kase.ref} />
            ) : (
              <AuditTab refId={kase.ref} />
            ),
        }))}
      />

      <StatusSheet
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        c={kase}
        sub={sub}
        setSub={setSub}
        onPick={pick}
      />

      <ReasonDialog
        open={dialog?.kind === "hold"}
        onClose={() => setDialog(null)}
        title={t.hold.title}
        description={t.hold.description}
        asRadios
        audited
        options={Object.values(t.hold.reasons).map((v) => ({
          value: v,
          label: v,
        }))}
        noteLabel={t.hold.note}
        confirmLabel={t.hold.confirm}
        extra={<HoldExtras />}
        onConfirm={async ({ reason, note }) => {
          const el = document.getElementById(
            "hold-resume",
          ) as HTMLInputElement | null;
          const resumeAt = el?.value || undefined;
          const label = resumeAt
            ? `${reason} · ${fill(t.hold.banner, { d: formatDate(resumeAt, locale, { weekday: "short", day: "numeric", month: "short" }) }).split(" · ")[1]}`
            : reason;
          await setStatus.mutateAsync({
            ref: kase.ref,
            status: "on_hold",
            reason: note ? `${reason} — ${note}` : reason,
            subStatus: label,
            resumeAt,
          });
          toast({ title: t.hold.done, tone: "success" });
        }}
      />

      <ReasonDialog
        open={dialog?.kind === "reject"}
        onClose={() => setDialog(null)}
        title={t.reject.title}
        description={t.reject.description}
        asRadios
        destructive
        audited
        options={Object.values(t.reject.reasons).map((v) => ({
          value: v,
          label: v,
        }))}
        noteLabel={t.reject.message}
        notePlaceholder={t.reject.messageDefault}
        confirmLabel={t.reject.confirm}
        extra={
          <label className="flex items-center gap-2 text-small">
            <input
              id="reject-consult"
              type="checkbox"
              className="size-4 accent-navy-700"
            />
            {t.reject.consult}
          </label>
        }
        notice={
          kase.payment === "paid" && kase.amount ? (
            <p className="flex items-start gap-2 bg-warning-bg px-3 py-2.5 text-small text-warning">
              <Icon
                name="wallet"
                size={16}
                aria-hidden
                className="mt-0.5 shrink-0"
              />
              {fill(t.reject.refund, {
                amount: formatMoney(kase.amount, "RWF", locale),
                m: "MTN MoMo",
              })}
            </p>
          ) : undefined
        }
        onConfirm={async ({ reason, note }) => {
          const consult = (
            document.getElementById("reject-consult") as HTMLInputElement | null
          )?.checked;
          await setStatus.mutateAsync({
            ref: kase.ref,
            status: "rejected",
            reason: [reason, note, consult ? t.reject.consult : ""]
              .filter(Boolean)
              .join(" — "),
          });
          toast({ title: t.reject.done, tone: "success" });
        }}
      />

      <ReasonDialog
        open={dialog?.kind === "other"}
        onClose={() => setDialog(null)}
        audited
        destructive={dialogTo === "cancelled"}
        title={
          dialogTo ? fill(t.other.title, { s: opsCommon(locale).status[dialogTo] }) : ""
        }
        options={Object.values(t.other.reasons).map((v) => ({
          value: v,
          label: v,
        }))}
        noteLabel={t.other.note}
        confirmLabel={dialogTo ? opsCommon(locale).status[dialogTo] : ""}
        onConfirm={({ reason, note }) =>
          moveTo(dialogTo!, {
            reason: note ? `${reason} — ${note}` : reason,
            subStatus: sub || undefined,
          })
        }
      />

      {request && (
        <RequestDocsDialog
          open
          onClose={() => setRequest(null)}
          c={kase}
          preselect={request.keys}
          due0={request.due}
          clientName={cl?.name ?? kase.client}
        />
      )}
      {quoteAt && rec.data && (
        <QuoteBuilder
          open
          onClose={() => setQuoteAt(null)}
          refId={kase.ref}
          client={kase.client}
          service={kase.service}
          priceList={rec.data.priceList}
          issuedAt={quoteAt}
        />
      )}
    </div>
  );
}

function HoldExtras() {
  const { locale } = useI18n();
  const t = opsCase(locale).hold;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-label">
        {t.resume}
        <input
          id="hold-resume"
          type="date"
          className="h-10 border border-border-strong bg-white px-3 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-small">
        <input
          type="checkbox"
          defaultChecked
          className="size-4 accent-navy-700"
        />
        {t.notify}
      </label>
    </div>
  );
}

function Header({
  c,
  locked,
  onStatus,
}: {
  c: CaseDetailVM;
  locked: boolean;
  onStatus: () => void;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale);
  const cl = c.clientInfo;
  const [askViewAs, setAskViewAs] = useState(false);
  const viewAsM = useViewAs();
  const meta = CASE_STATUS_META[c.status];
  const firstResponse =
    !!c.firstResponseDueAt &&
    (c.status === "received" || c.status === "under_review");
  const price =
    c.amount == null
      ? t.price.quote
      : fill(
          c.payment === "paid"
            ? t.price.paidVia
            : c.payment === "covered"
              ? t.price.covered
              : t.price.unpaid,
          { amount: formatMoney(c.amount, "RWF", locale), m: "MTN MoMo" },
        );
  return (
    <header className="grid gap-4 border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={localHref(locale, "/ops/cases")}
          aria-label={t.back}
          className="flex size-9 items-center justify-center hover:bg-navy-50"
        >
          <Icon
            name="arrowRight"
            size={18}
            className="rotate-180"
            aria-hidden
          />
        </Link>
        <h1 className="text-h3">
          <CopyRef value={c.ref} />
        </h1>
        <button
          type="button"
          onClick={onStatus}
          disabled={locked}
          aria-haspopup="dialog"
          aria-label={`${t.status.change}: ${opsCommon(locale).status[c.status]}`}
          className="inline-flex items-center gap-1.5 p-1 hover:bg-navy-50 disabled:cursor-not-allowed"
        >
          <OpsStatus status={c.status} sub={c.subStatus} />
          {!locked && (
            <>
              <Icon name="chevronDown" size={14} aria-hidden />
              <Kbd className="max-lg:hidden">E</Kbd>
            </>
          )}
        </button>
        <SlaChip
          due={firstResponse ? c.firstResponseDueAt : c.dueAt}
          firstResponse={firstResponse}
          paused={meta.pausesSla}
          done={c.status === "completed_delivered"}
        />
        {c.status === "rejected" && c.payment === "paid" && (
          <span className="inline-flex h-6 items-center bg-warning-bg px-2.5 text-eyebrow font-medium text-warning">
            {t.reject.refundChip}
          </span>
        )}
        {c.flags.map((f) => (
          <FlagChip
            key={f}
            flag={f}
            detail={
              f === "partner"
                ? c.partner
                : f === "dedicated"
                  ? c.dedicatedAgent
                  : null
            }
          />
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAskViewAs(true)}
          >
            <Icon name="user" size={15} aria-hidden />
            {t.viewAs.button}
          </Button>
          <ReasonDialog
            open={askViewAs}
            onClose={() => setAskViewAs(false)}
            title={t.viewAs.title}
            description={t.viewAs.desc}
            options={Object.entries(t.viewAs.reasons).map(([value, label]) => ({ value, label }))}
            asRadios
            audited
            confirmLabel={t.viewAs.confirm}
            onConfirm={async ({ reason, note }) => {
              await viewAsM.mutateAsync({ ref: c.ref, reason, note });
              setUrlParams({ viewAs: "1", why: t.viewAs.reasons[reason] ?? reason });
            }}
          />
          <ButtonLink
            size="sm"
            variant="primary"
            href={localHref(locale, `/ops/assign/${c.ref}`)}
          >
            {t.assign}
            <Kbd className="max-lg:hidden">A</Kbd>
          </ButtonLink>
        </div>
      </div>
      <p className="-mt-2 text-small text-fg-muted">{c.service}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={cl?.name ?? c.client} />
          <div className="min-w-0">
            <p className="truncate text-label">{cl?.name ?? c.client}</p>
            {cl && (
              <p className="text-eyebrow text-fg-muted">
                {c.clientType === "company"
                  ? t.client.company
                  : t.client.individual}{" "}
                · <span className="tabular">{cl.phone}</span> · {cl.language} ·{" "}
                {fill(t.client.since, { y: cl.since })} ·{" "}
                {fill(t.client.past, { n: cl.past })}
              </p>
            )}
          </div>
        </div>
        <p className="flex items-center gap-2 text-small font-medium tabular">
          {price}
          <PaymentChip status={c.payment} />
        </p>
        <div className="flex gap-2 sm:ml-auto">
          {cl && (
            <a
              href={`tel:${cl.phone.replace(/\s/g, "")}`}
              className="inline-flex h-9 items-center gap-2 border border-border-strong px-4 text-small font-medium hover:bg-navy-50"
            >
              <Icon name="phone" size={15} aria-hidden />
              {t.client.call}
            </a>
          )}
          <Link
            href={localHref(locale, `/ops/conversations?case=${c.ref}`)}
            className="inline-flex h-9 items-center gap-2 border border-border-strong px-4 text-small font-medium hover:bg-navy-50"
          >
            <Icon name="message" size={15} aria-hidden />
            {t.client.message}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** CS1 + PC2: allowed moves with guard text; centred on desktop, bottom sheet on phones. */
function StatusSheet({
  open,
  onClose,
  c,
  sub,
  setSub,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  c: CaseDetailVM;
  sub: string;
  setSub: (s: string) => void;
  onPick: (m: Move) => void;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).status;
  const oc = opsCommon(locale);
  const [why, setWhy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={SHEET_SM}
      title={t.change}
      description={
        <>
          {t.current}:{" "}
          <span className="font-medium text-fg">{oc.status[c.status]}</span>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-eyebrow text-fg-muted">{t.allowed}</p>
        <ul className="grid gap-1.5">
          {c.moves.map((m) => {
            const hint = m.blocked
              ? (oc.guard[m.blocked as keyof typeof oc.guard] ?? m.blocked)
              : t.hints[m.to]
                ? fill(t.hints[m.to], {
                    amount: c.amount
                      ? formatMoney(c.amount, "RWF", locale)
                      : "—",
                  })
                : m.reason
                  ? t.reasonNeeded
                  : null;
            return (
              <li key={m.to}>
                <button
                  type="button"
                  disabled={!!m.blocked}
                  onClick={() => onPick(m)}
                  aria-describedby={hint ? `mv-${m.to}` : undefined}
                  className={cx(
                    "flex w-full items-center gap-3 border px-3.5 py-2.5 text-left transition-colors",
                    m.blocked
                      ? "cursor-not-allowed border-border bg-bg-subtle text-fg-subtle"
                      : "border-border hover:border-navy-700 hover:bg-navy-50",
                  )}
                >
                  <OpsStatus status={m.to} />
                  <span
                    id={`mv-${m.to}`}
                    className="ml-auto flex items-center gap-1.5 text-right text-eyebrow"
                  >
                    {m.blocked && (
                      <>
                        <Icon name="lock" size={12} aria-hidden />
                        <span className="sr-only">{t.locked}: </span>
                      </>
                    )}
                    {hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <label className="grid gap-1.5 text-label">
          {t.sub}
          <select
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            className="h-10 border border-border-strong bg-white px-3 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
          >
            <option value="">{t.subNone}</option>
            {t.subs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            type="button"
            aria-expanded={why}
            onClick={() => setWhy(!why)}
            className="text-small font-medium text-link underline-offset-4 hover:underline"
          >
            {t.why}
          </button>
          {why && (
            <p className="mt-2 bg-bg-subtle px-3 py-2.5 text-small text-fg-muted">
              {t.whyBody}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/** CS6: read-only client view, framed so it's never mistaken for the staff page. */
function ViewAsClient({ c, why, onExit }: { c: CaseDetailVM; why: string; onExit: () => void }) {
  const { locale } = useI18n();
  const t = opsCase(locale).viewAs;
  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      <div
        role="status"
        className="theme-dark sticky top-14 z-20 flex flex-wrap items-center gap-3 bg-navy-900 px-4 py-3 text-fg"
      >
        <Icon name="user" size={18} aria-hidden />
        <p className="flex-1 text-small">
          <span className="font-medium">
            {fill(t.banner, { name: c.client })}
          </span>{" "}
          · {fill(t.reason, { r: why })}
        </p>
        <Button size="sm" variant="inverse" onClick={onExit}>
          {t.exit}
        </Button>
      </div>
      <div
        inert
        className="mx-auto grid w-full max-w-xl gap-4 border-4 border-dashed border-border-strong bg-bg-subtle p-5 opacity-90"
      >
        <p className="text-eyebrow text-fg-muted">{t.yourRequest}</p>
        <h1 className="text-h3">{c.service}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular">{c.ref}</span>
          <StatusPill status={c.status} />
        </div>
        <div className="bg-white p-4">
          <p className="text-label">{t.next}</p>
          <p className="text-small text-fg-muted">{t.nextBody}</p>
        </div>
        {c.amount != null && (
          <p className="text-small tabular">
            {formatMoney(c.amount, "RWF", locale)} ·{" "}
            <PaymentChip status={c.payment} />
          </p>
        )}
      </div>
    </div>
  );
}

function CaseSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-36" />
      <Skeleton className="h-11" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

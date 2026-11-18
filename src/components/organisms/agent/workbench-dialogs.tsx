"use client";
import { uploadFile, uploadName } from "@/lib/api/upload";
import { useWs } from "@/lib/agent/ws";
// Workbench dialogs (board 07): WC1 status changer + WC2 institution fields, outcome editor, WC4 propose date ·
// field visit · flag, WC5 dispute internal response. Phone: every dialog is a bottom sheet (SHEET_SM).
import { errorCopy } from "@/lib/api/error-copy";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { opsCommon } from "@/content/pages/ops-common";
import { agentWorkbench, fill } from "@/content/pages/agent-workbench";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Textarea, Select, Radio } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { ReasonDialog } from "@/components/molecules/ops/ops";
import { SHEET_SM } from "@/components/organisms/ops/triage";
import { useOnline } from "@/components/atoms/hooks";
import {
  useSetStatus,
  useOutcome,
  useProposeDue,
  useFieldVisit,
  useFlag,
  useDisputeResponse,
  type WorkbenchVM,
  type Outcome,
} from "@/lib/agent/b";
import type { CaseStatus } from "@/shared/domain/case-status";

const stamp = () => Date.now(); // event-time clock, kept out of render for the purity lint
export const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const useW = () => agentWorkbench(useI18n().locale);

/** Shared form dialog: inline error (shake), busy state, disabled offline. `run` returns an error string or a promise. */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  submit,
  run,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  submit: string;
  run: () => string | Promise<unknown>;
  children: ReactNode;
}) {
  const w = useW();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const online = useOnline();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const go = async () => {
    setErr(null);
    const r = run();
    if (typeof r === "string") {
      setErr(r);
      setShake((n) => n + 1);
      return;
    }
    setBusy(true);
    try {
      await r;
      onClose();
    } catch (e) {
      setErr(errorCopy(e, locale));
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className={SHEET_SM}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {w.cancel}
          </Button>
          <Button dots loading={busy} disabled={!online} onClick={go}>
            {submit}
          </Button>
        </div>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        {children}
        {!online && (
          <p className="text-small text-warning">{w.states.offline}</p>
        )}
        {err && (
          <p
            key={shake}
            role="alert"
            className="m-shake text-small font-medium text-danger"
          >
            {err}
          </p>
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- WC1 status changer (+ WC2 institution fields)
const INSTITUTIONS = ["RRA", "RDB", "RURA"] as const;
export function StatusDialog({
  c,
  open,
  onClose,
}: {
  c: WorkbenchVM;
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const w = useW();
  const S = opsCommon(locale).status;
  const toast = useToast();
  const set = useSetStatus(c.ref);
  const [to, setTo] = useState<CaseStatus | null>(null);
  const [note, setNote] = useState("");
  const [inst, setInst] = useState({
    institution: "RRA",
    other: "",
    submissionRef: "",
    submittedOn: "",
    expectedDecision: "",
    evidence: null as string | null,
  });
  const pick = c.moves.find((m) => m.to === to);
  const close = () => {
    setTo(null);
    onClose();
  };
  const run = () => {
    if (!pick || pick.blocked) return w.status.none;
    if (to === "on_hold" && !note.trim()) return w.status.reasonPh;
    const institution =
      inst.institution === "Other" ? inst.other.trim() : inst.institution;
    if (
      to === "awaiting_external_institution" &&
      (!institution || !inst.submissionRef.trim() || !inst.submittedOn)
    )
      return w.institution.required;
    return set
      .mutateAsync({
        status: pick.to,
        note: note.trim() || undefined,
        x_agent:
          to === "awaiting_external_institution"
            ? { ...inst, institution }
            : undefined,
      })
      .then(() =>
        toast({
          title: fill(w.status.moved, { s: S[pick.to] }),
          tone: "success",
        }),
      );
  };
  return (
    <FormDialog
      open={open}
      onClose={close}
      title={
        to === "awaiting_external_institution"
          ? w.institution.title
          : w.status.title
      }
      description={fill(w.status.current, { s: S[c.status] })}
      submit={
        to === "awaiting_external_institution"
          ? w.institution.confirm
          : w.status.confirm
      }
      run={run}
    >
      {c.moves.length === 0 && (
        <p className="text-small text-fg-muted">{w.status.none}</p>
      )}
      <fieldset className="grid gap-2">
        <legend className="sr-only">{w.status.title}</legend>
        {c.moves.map((m) => {
          const via = m.to === "awaiting_internal_review"; // only via Submit deliverables (core.agentMoves)
          return (
            <div
              key={m.to}
              className={cx(
                " border p-3",
                to === m.to
                  ? "border-navy-700 bg-tint"
                  : "border-border",
                m.blocked && "opacity-70",
              )}
            >
              <Radio
                name="to"
                label={S[m.to]}
                checked={to === m.to}
                disabled={!!m.blocked}
                onChange={() => setTo(m.to)}
              />
              {m.blocked && (
                <p className="mt-1 ml-7 text-small text-fg-muted">
                  {via ? (
                    <Link
                      href={`${localHref(locale, wsHref(`/agent/cases/${c.ref}`))}?tab=deliverables`}
                      onClick={close}
                      className="underline underline-offset-4"
                    >
                      {w.status.viaSubmit}
                    </Link>
                  ) : (
                    fill(w.status.blocked, {
                      r: w.status.guards[m.blocked] ?? m.blocked,
                    })
                  )}
                </p>
              )}
            </div>
          );
        })}
      </fieldset>
      {to === "on_hold" && (
        <Field label={w.status.reasonLabel}>
          {(p) => (
            <Textarea
              id={p.id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={w.status.reasonPh}
              required
            />
          )}
        </Field>
      )}
      {to === "awaiting_external_institution" && (
        <div className="grid gap-3 m-rise">
          <Field label={w.institution.institution}>
            {(p) => (
              <Select
                id={p.id}
                value={inst.institution}
                onChange={(e) =>
                  setInst({ ...inst, institution: e.target.value })
                }
              >
                {INSTITUTIONS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
                <option value="Other">{w.institution.other}</option>
              </Select>
            )}
          </Field>
          {inst.institution === "Other" && (
            <Field label={w.institution.other}>
              {(p) => (
                <Input
                  id={p.id}
                  value={inst.other}
                  onChange={(e) => setInst({ ...inst, other: e.target.value })}
                />
              )}
            </Field>
          )}
          <Field label={w.institution.ref}>
            {(p) => (
              <Input
                id={p.id}
                value={inst.submissionRef}
                onChange={(e) =>
                  setInst({ ...inst, submissionRef: e.target.value })
                }
                placeholder="RRA-88310"
              />
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={w.institution.on}>
              {(p) => (
                <Input
                  id={p.id}
                  type="date"
                  value={inst.submittedOn}
                  onChange={(e) =>
                    setInst({ ...inst, submittedOn: e.target.value })
                  }
                />
              )}
            </Field>
            <Field label={w.institution.expected}>
              {(p) => (
                <Input
                  id={p.id}
                  type="date"
                  value={inst.expectedDecision}
                  onChange={(e) =>
                    setInst({ ...inst, expectedDecision: e.target.value })
                  }
                />
              )}
            </Field>
          </div>
          <Evidence
            label={w.institution.evidence}
            value={inst.evidence}
            onChange={(evidence) => setInst({ ...inst, evidence })}
          />
        </div>
      )}
      {to && to !== "on_hold" && to !== "awaiting_external_institution" && (
        <Field label={w.status.noteLabel}>
          {(p) => (
            <Textarea
              id={p.id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      )}
    </FormDialog>
  );
}

function Evidence({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-label">{label}</span>
      {value ? (
        <p className="flex items-center gap-2 bg-ink-100 px-3 py-2 text-small">
          <Icon name="fileCheck" size={16} aria-hidden />
          <span className="min-w-0 flex-1 truncate">{value.startsWith("/api/files/") ? uploadName(value) : value}</span>
          <button
            type="button"
            aria-label="Remove"
            className="p-1 hover:bg-white"
            onClick={() => onChange(null)}
          >
            <Icon name="x" size={14} aria-hidden />
          </button>
        </p>
      ) : (
        <FileDrop
          accept="application/pdf,image/*"
          maxSizeMb={10}
          onFiles={(f) => f[0] && uploadFile(f[0], "evidence").then((u) => onChange(u.href)).catch(() => onChange(null))}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- WC2 outcome
const OUTCOMES: Outcome["state"][] = [
  "pending",
  "approved",
  "rejected",
  "more_info",
];
export function OutcomeDialog({
  c,
  open,
  onClose,
}: {
  c: WorkbenchVM;
  open: boolean;
  onClose: () => void;
}) {
  const w = useW();
  const toast = useToast();
  const m = useOutcome(c.ref);
  const cur = c.outcome;
  const [state, setState] = useState<Outcome["state"]>(
    cur ? cur.state : "pending",
  );
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<string | null>(null);
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={w.outcomeDialog.title}
      description={[c.institution, c.submissionRef].filter(Boolean).join(" · ")}
      submit={w.outcomeDialog.save}
      run={() =>
        (state === "rejected" || state === "more_info") && !note.trim()
          ? w.outcomeDialog.noteRequired
          : m
              .mutateAsync({ state, note: note.trim(), evidence })
              .then(() =>
                toast({ title: w.outcomeDialog.saved, tone: "success" }),
              )
      }
    >
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1 text-label">{w.outcomeDialog.state}</legend>
        {OUTCOMES.map((o) => (
          <Radio
            key={o}
            name="outcome"
            label={w.outcome[o]}
            checked={state === o}
            onChange={() => setState(o)}
          />
        ))}
      </fieldset>
      <Field label={w.outcomeDialog.note}>
        {(p) => (
          <Textarea
            id={p.id}
            value={note}
            placeholder={w.outcomeDialog.notePh}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <Evidence
        label={w.outcomeDialog.evidence}
        value={evidence}
        onChange={setEvidence}
      />
    </FormDialog>
  );
}

// ---------------------------------------------------------------- WC4 propose · field visit · flag
export function ProposeDialog({
  c,
  open,
  onClose,
}: {
  c: WorkbenchVM;
  open: boolean;
  onClose: () => void;
}) {
  const w = useW();
  const toast = useToast();
  const m = useProposeDue(c.ref);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={w.propose.title}
      submit={w.propose.submit}
      run={() =>
        !date || date < day(stamp())
          ? w.propose.pastDate
          : m.mutateAsync({ due_date: date, note: note.trim() }).then(() =>
              toast({
                title: fill(w.propose.sent, { m: c.manager }),
                tone: "success",
              }),
            )
      }
    >
      <Field label={w.propose.date}>
        {(p) => (
          <Input
            id={p.id}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
      </Field>
      <Field label={w.propose.reason}>
        {(p) => (
          <Input
            id={p.id}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <p className="flex items-start gap-2 text-small text-fg-muted">
        <Icon name="shield" size={16} aria-hidden />
        {fill(w.propose.hint, { m: c.manager })}
      </p>
    </FormDialog>
  );
}

export function FieldVisitDialog({
  c,
  open,
  onClose,
}: {
  c: WorkbenchVM;
  open: boolean;
  onClose: () => void;
}) {
  const w = useW();
  const toast = useToast();
  const m = useFieldVisit(c.ref);
  const [v, setV] = useState({ location: "", purpose: "", date: "" });
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={w.field.title}
      submit={w.field.submit}
      run={() =>
        !v.location.trim() || !v.purpose.trim() || !v.date
          ? w.field.required
          : m
              .mutateAsync(v)
              .then(() => toast({ title: w.field.sent, tone: "success" }))
      }
    >
      <Field label={w.field.location}>
        {(p) => (
          <Input
            id={p.id}
            value={v.location}
            placeholder="Kigali, Kicukiro"
            onChange={(e) => setV({ ...v, location: e.target.value })}
          />
        )}
      </Field>
      <Field label={w.field.purpose}>
        {(p) => (
          <Input
            id={p.id}
            value={v.purpose}
            onChange={(e) => setV({ ...v, purpose: e.target.value })}
          />
        )}
      </Field>
      <Field label={w.field.date}>
        {(p) => (
          <Input
            id={p.id}
            type="date"
            value={v.date}
            onChange={(e) => setV({ ...v, date: e.target.value })}
          />
        )}
      </Field>
    </FormDialog>
  );
}

const FLAGS = ["blocked", "unresponsive", "fraud", "conflict"] as const;
export function FlagDialog({
  c,
  open,
  onClose,
}: {
  c: WorkbenchVM;
  open: boolean;
  onClose: () => void;
}) {
  const w = useW();
  const toast = useToast();
  const m = useFlag(c.ref);
  return (
    <ReasonDialog
      open={open}
      onClose={onClose}
      title={w.flag.title}
      description={c.manager}
      asRadios
      options={FLAGS.map((f) => ({ value: f, label: w.flag.reasons[f] }))}
      noteLabel={w.flag.note}
      confirmLabel={w.flag.submit}
      audited
      onConfirm={({ reason, note }) =>
        m
          .mutateAsync({
            kind: reason === "conflict" ? "reassign" : "attention",
            note: `${w.flag.reasons[reason as (typeof FLAGS)[number]]}${note ? ` — ${note}` : ""}`,
          })
          .then(() =>
            toast({
              title: fill(w.flag.sent, { m: c.manager }),
              tone: "success",
            }),
          )
      }
    />
  );
}

// ---------------------------------------------------------------- WC5 dispute
export function DisputeDialog({
  c,
  open,
  onClose,
}: {
  c: WorkbenchVM;
  open: boolean;
  onClose: () => void;
}) {
  const w = useW();
  const toast = useToast();
  const m = useDisputeResponse(c.ref);
  const [text, setText] = useState("");
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={w.dispute.dialog}
      description={w.dispute.note}
      submit={w.dispute.respond}
      run={() =>
        !text.trim()
          ? w.dispute.ph
          : m
              .mutateAsync(text.trim())
              .then(
                () => (
                  setText(""),
                  toast({ title: w.dispute.sent, tone: "success" })
                ),
              )
      }
    >
      <Field label={w.dispute.dialog}>
        {(p) => (
          <Textarea
            id={p.id}
            value={text}
            placeholder={w.dispute.ph}
            onChange={(e) => setText(e.target.value)}
          />
        )}
      </Field>
    </FormDialog>
  );
}

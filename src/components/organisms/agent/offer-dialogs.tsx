"use client";
import { useWs } from "@/lib/agent/ws";
// U4 OF2/OF3: Accept (conflict declaration, D5; start-now, D4) and Decline dialogs. Lane A's Today strip renders these too.
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Radio, Switch, Textarea, Field } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { Icon } from "@/components/atoms/icon";
import { Countdown, useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSummary } from "@/lib/agent/api";
import {
  acceptMode,
  CONFLICTS,
  DECLINE_REASONS,
  type Conflict,
} from "@/shared/agent/core";
import {
  offerKeys,
  useOfferActions,
  useOffers,
  type OfferVM,
} from "@/lib/agent/c";
import { api, ApiError, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/agent-common";
import { agentOffers } from "@/content/pages/agent-offers";
import { cx } from "@/shared/format";

export const useO = () => agentOffers(useI18n().locale);
/** Service manager's first name from the agent summary (the manager field is the full name). */
const useManager = () => useSummary().data?.me.manager.split(" ")[0] ?? "";

const mq = "(max-width: 1023px)";
const sub = (fn: () => void) => {
  const m = window.matchMedia(mq);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};
/** Phone/tablet layout → dialogs and drawers become bottom sheets. */
export const useIsPhone = () =>
  useSyncExternalStore(
    sub,
    () => window.matchMedia(mq).matches,
    () => false,
  );

/** Why Accept is disabled (not cleared / on leave / away / offline), or null. */
export function useAcceptBlock():
  keyof ReturnType<typeof agentOffers>["blocked"] | null {
  const s = useSummary().data;
  const online = useOnline();
  if (!online) return "offline";
  if (!s) return null;
  if (s.clearance !== "cleared") return "notCleared";
  if (s.onLeaveNow) return "leave";
  if (s.duty === "away") return "away";
  return null;
}

type Props = {
  offerId: string | null;
  onClose: () => void;
  onDone?: (id: string) => void;
};
// Stage 8 adds external accept guards (contract_expired, service_not_cleared, worker_not_cleared) → shown via errorCopy.
const BLOCK_ERRS = ["not_cleared", "away", "contract_expired", "service_not_cleared", "worker_not_cleared"] as const;
type BlockErr = (typeof BLOCK_ERRS)[number];
type Err = "expired" | "taken" | BlockErr | "other" | null;
const errOf = (e: unknown): Err =>
  e instanceof ApiError
    ? (BLOCK_ERRS as readonly string[]).includes(e.errorType ?? "")
      ? (e.errorType as BlockErr)
      : e.status === 410
      ? "expired"
      : e.status === 409
        ? "taken"
        : "other"
    : "other";

function useOfferState(id: string, err: Err) {
  const offer = useOffers().data?.find((o) => o.id === id);
  const now = useNow();
  const expired =
    err === "expired" ||
    offer?.status === "expired" ||
    (!!offer && now !== null && Date.parse(offer.expiresAt) <= now);
  const taken =
    !expired && (err === "taken" || (!!offer && offer.status !== "pending"));
  return { offer, expired, taken };
}

function Gone({
  kind,
  onClose,
}: {
  kind: "expired" | "taken";
  onClose: () => void;
}) {
  const MANAGER = useManager();
  const o = useO();
  return (
    <div
      role="alert"
      className="grid justify-items-center gap-3 py-4 text-center m-pop"
    >
      <span className="grid size-12 place-items-center rounded-full bg-ink-100">
        <Icon
          name={kind === "expired" ? "clock" : "users"}
          size={22}
          aria-hidden
        />
      </span>
      <p className="text-card-title">
        {fill(kind === "expired" ? o.expiredTitle : o.takenTitle, {
          m: MANAGER,
        })}
      </p>
      <p className="max-w-sm text-small text-fg-muted">
        {fill(kind === "expired" ? o.expiredBody : o.takenBody, { m: MANAGER })}
      </p>
      <Button variant="secondary" onClick={onClose}>
        {o.close}
      </Button>
    </div>
  );
}


const Summary = ({ offer }: { offer: OfferVM }) => (
  <div className="mb-4 flex flex-wrap items-center gap-2 text-small text-fg-muted">
    <span className="font-medium text-fg">{offer.ref}</span>
    <Countdown to={offer.expiresAt} kind="respond" />
  </div>
);

// ---------------------------------------------------------------- accept
export function AcceptOfferDialog(p: Props) {
  return p.offerId ? <Accept key={p.offerId} {...p} id={p.offerId} /> : null;
}
function Accept({ id, onClose, onDone }: Props & { id: string }) {
  const MANAGER = useManager();
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const router = useRouter();
  const toast = useToast();
  const { accept, refresh } = useOfferActions();
  const block = useAcceptBlock();
  const [err, setErr] = useState<Err>(null);
  const { offer, expired, taken } = useOfferState(id, err);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [note, setNote] = useState("");
  const [startNow, setStartNow] = useState(true);
  const [shake, setShake] = useState(0);
  const mode = acceptMode(conflict);
  const phone = useIsPhone();
  const noteMissing = conflict === "other" && !note.trim();

  function submit() {
    if (!offer || conflict === null || noteMissing || block)
      return setShake((n) => n + 1);
    const ref = offer.ref;
    accept.mutate(
      { id, conflict, note: note.trim() || undefined, start_now: startNow },
      {
        onSuccess: (r) => {
          if (r.status === "returned")
            toast({
              title: fill(o.returned, { m: MANAGER }),
              body: o.returnedBody,
            });
          else
            toast({
              tone: "success",
              title: o.accepted,
              body: fill(o.acceptedBody, { ref }),
              // Undo only while work hasn't started (D4); otherwise jump straight into the case.
              action: r.started
                ? {
                    label: o.openCase,
                    onClick: () =>
                      router.push(localHref(locale, wsHref(`/agent/cases/${ref}`))),
                  }
                : {
                    label: o.undo,
                    onClick: () =>
                      // plain call: this dialog is unmounted by the time Undo is clicked, so mutation callbacks would never fire
                      unwrap(api.POST("/api/agent/x/offers/{id}/undo", { params: { path: { id } } })).then(() => { refresh(); toast({ title: o.undone }); }),
                  },
            });
          if (onDone) onDone(id);
          else refresh();
          onClose();
        },
        onError: (e) => setErr(errOf(e)),
      },
    );
  }

  const gone = expired ? "expired" : taken ? "taken" : null;
  const title = offer
    ? fill(o.acceptTitle, { service: offer.service, client: offer.client })
    : o.accept;
  return (
    <Dialog
      open
      onClose={onClose}
      side={phone ? "bottom" : undefined}
      title={
        gone
          ? fill(gone === "expired" ? o.expiredTitle : o.takenTitle, {
              m: MANAGER,
            })
          : title
      }
      description={gone ? undefined : o.conflictQ}
      footer={
        gone ? undefined : (
          <>
            <Button variant="outline" onClick={onClose}>
              {o.cancel}
            </Button>
            <Button
              key={shake}
              variant={mode === "return" ? "danger" : "primary"}
              dots={mode !== "return"}
              loading={accept.isPending}
              className={cx(
                shake > 0 && "m-shake",
                (conflict === null || noteMissing || block) && "opacity-50",
              )}
              onClick={submit}
            >
              {mode === "return" ? o.returnBtn : o.acceptBtn}
            </Button>
          </>
        )
      }
    >
      {gone ? (
        <Gone kind={gone} onClose={onClose} />
      ) : !offer ? (
        <div aria-hidden className="h-40 m-shimmer" />
      ) : (
        <>
          <Summary offer={offer} />
          <fieldset className="grid gap-3">
            <legend className="sr-only">{o.conflictQ}</legend>
            {CONFLICTS.map((c) => (
              <Radio
                key={c}
                name="conflict"
                value={c}
                checked={conflict === c}
                onChange={() => setConflict(c)}
                label={o.conflict[c]}
              />
            ))}
          </fieldset>
          {mode === "return" && (
            <div className="mt-4 grid gap-3 m-rise">
              <Field
                label={o.conflictNote} error={shake && noteMissing ? o.noteRequired : undefined}
              >
                {(f) => (
                  <Textarea
                    id={f.id}
                    aria-describedby={f.describedBy}
                    aria-invalid={f.invalid}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-20"
                  />
                )}
              </Field>
              <p className="flex gap-2 bg-tint p-3 text-small">
                <Icon
                  name="shield"
                  size={16}
                  aria-hidden
                  className="mt-0.5 shrink-0"
                />
                {fill(o.conflictInfo, { m: MANAGER })}
              </p>
            </div>
          )}
          {mode !== "return" && (
            <div className="mt-5 flex items-start justify-between gap-4 border-t border-border pt-4">
              <div>
                <Switch
                  label={o.startNow}
                  checked={startNow}
                  onChange={(e) => setStartNow(e.target.checked)}
                />
                <p className="mt-1 text-small text-fg-muted">
                  {startNow ? o.startNowHint : o.startLaterHint}
                </p>
              </div>
            </div>
          )}
          <div aria-live="polite"className="mt-3 text-small">
            {block && <p className="text-warning">{o.blocked[block]}</p>}
            {conflict === null && shake > 0 && (
              <p className="text-danger">{o.pickFirst}</p>
            )}
            {err === "other" && <p className="text-danger">{o.error}</p>}
            {err && (BLOCK_ERRS as readonly string[]).includes(err) && (
              <p role="alert"className="text-danger">
                {errorCopy(new ApiError(0, err, "", null), locale)}
              </p>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- decline
export function DeclineOfferDialog(p: Props) {
  return p.offerId ? <Decline key={p.offerId} {...p} id={p.offerId} /> : null;
}
function Decline({ id, onClose, onDone }: Props & { id: string }) {
  const MANAGER = useManager();
  const o = useO();
  const toast = useToast();
  const { decline, refresh } = useOfferActions();
  const online = useOnline();
  const [err, setErr] = useState<Err>(null);
  const { offer, expired, taken } = useOfferState(id, err);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(0);
  const noteMissing = reason === "other" && !note.trim();
  const phone = useIsPhone();

  function submit() {
    if (!offer || !reason || noteMissing || !online)
      return setTried((n) => n + 1);
    const ref = offer.ref;
    decline.mutate(
      { id, reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast({
            title: o.declined,
            body: fill(o.declinedBody, { ref, m: MANAGER }),
          });
          if (onDone) onDone(id);
          else refresh();
          onClose();
        },
        onError: (e) => setErr(errOf(e)),
      },
    );
  }
  const gone = expired ? "expired" : taken ? "taken" : null;
  return (
    <Dialog
      open
      onClose={onClose}
      side={phone ? "bottom" : undefined}
      title={
        gone
          ? fill(gone === "expired" ? o.expiredTitle : o.takenTitle, {
              m: MANAGER,
            })
          : o.declineTitle
      }
      description={gone ? undefined : o.declineQ}
      footer={
        gone ? undefined : (
          <>
            <Button variant="outline" onClick={onClose}>
              {o.cancel}
            </Button>
            <Button
              key={tried}
              variant="danger"
              loading={decline.isPending}
              className={cx(tried > 0 && "m-shake")}
              onClick={submit}
            >
              {o.declineBtn}
            </Button>
          </>
        )
      }
    >
      {gone ? (
        <Gone kind={gone} onClose={onClose} />
      ) : (
        <>
          {offer && <Summary offer={offer} />}
          <fieldset className="grid gap-3"aria-invalid={tried > 0 && !reason}>
            <legend className="sr-only">{o.declineQ}</legend>
            {DECLINE_REASONS.map((r) => (
              <Radio
                key={r}
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                label={o.reasons[r]}
              />
            ))}
          </fieldset>
          <Field
            className="mt-4"
            label={o.noteLabel}
            error={tried > 0 && noteMissing ? o.noteRequired : undefined}
          >
            {(f) => (
              <Textarea
                id={f.id}
                aria-describedby={f.describedBy}
                aria-invalid={f.invalid}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-20"
              />
            )}
          </Field>
          <p className="mt-4 flex gap-2 bg-tint p-3 text-small">
            <Icon
              name="refresh"
              size={16}
              aria-hidden
              className="mt-0.5 shrink-0"
            />
            {fill(o.backToQueue, { m: MANAGER })}
          </p>
          <div aria-live="polite"className="mt-3 text-small text-danger">
            {tried > 0 && !reason && <p>{o.reasonRequired}</p>}
            {!online && <p>{o.blocked.offline}</p>}
            {err === "other" && <p>{o.error}</p>}
          </div>
        </>
      )}
    </Dialog>
  );
}

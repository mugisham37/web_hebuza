"use client";
// Lane C (board 06 HO3): counter-propose a deadline, counter state chip, and the external accept-block reason.
// Rendered by agent/c/offers.tsx only when ws.external.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { cx, formatDateTime } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { useExternal } from "@/lib/work/api";
import { scopeOf, why } from "@/lib/work/limits";
import { useCounter, type ExtOfferVM } from "@/lib/work/c";
import { workHome } from "@/content/pages/work-home";
import { fill } from "@/content/pages/work-common";
import { useW } from "@/components/atoms/work";
import { useO } from "@/components/organisms/agent/offer-dialogs";

export const useH = () => workHome(useI18n().locale);

/** why() text for Accept on this offer (contract expired / service not cleared / not cleared), or null. */
export function useExtAcceptWhy(offer: { service: string }) {
  const w = useW();
  const { ext } = useExternal();
  if (!ext) return null;
  const svc = ext.services.find((s) => s.name === offer.service || s.slug === offer.service);
  const k = why(scopeOf(ext, { serviceState: svc?.state }), "accept");
  return k ? w.why[k] : null;
}

/** "Counter sent · waiting for Diane" / accepted / declined, plus mock SM decision. */
export function CounterState({ offer }: { offer: ExtOfferVM }) {
  const h = useH();
  const { locale } = useI18n();
  const { ext } = useExternal();
  const c = offer.counter;
  if (!c) return null;
  const m = (ext?.manager ?? "Diane").split(" ")[0];
  const tone = c.status === "pending" ? "bg-tint" : c.status === "accepted" ? "bg-success-bg text-success" : "bg-ink-100";
  return (
    <div className={cx("flex flex-wrap items-center gap-2 px-3 py-2 text-small m-pop", tone)} role="status">
      <Icon name={c.status === "pending" ? "clock" : c.status === "accepted" ? "check" : "x"} size={14} aria-hidden />
      <span className="flex-1">
        {c.status === "pending"
          ? `${fill(h.counter.waiting, { m })} · ${h.counter.paused}`
          : fill(c.status === "accepted" ? h.counter.accepted : h.counter.declined, { m, d: formatDateTime(c.due, locale) })}
      </span>
      {c.status === "pending" && (
        <>
        </>
      )}
    </div>
  );
}

const toLocal = (iso: string) => {
  const d = new Date(Date.parse(iso) + 2 * 3600_000); // Africa/Kigali wall clock (UTC+2, no DST)
  return d.toISOString().slice(0, 16);
};

export function CounterDialog({ offer, onClose }: { offer: ExtOfferVM | null; onClose: () => void }) {
  return offer ? <Counter key={offer.id} offer={offer} onClose={onClose} /> : null;
}
function Counter({ offer, onClose }: { offer: ExtOfferVM; onClose: () => void }) {
  const h = useH();
  const o = useO();
  const { locale } = useI18n();
  const toast = useToast();
  const { ext } = useExternal();
  const m = useCounter();
  const [due, setDue] = useState(toLocal(new Date(Date.parse(offer.dueAt) + 2 * 86_400_000).toISOString()));
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dueIso = due ? new Date(`${due}:00+02:00`).toISOString() : "";
  const dueBad = !dueIso || Date.parse(dueIso) <= Date.parse(offer.dueAt);
  const reasonBad = !reason.trim();
  const manager = (ext?.manager ?? "Diane").split(" ")[0];
  const submit = () => {
    setTried(true);
    if (dueBad || reasonBad) return;
    m.mutate(
      { id: offer.id, due: dueIso, reason: reason.trim() },
      {
        onSuccess: () => {
          toast({ tone: "success", title: h.counter.sent, body: fill(h.counter.waiting, { m: manager }) });
          onClose();
        },
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={h.counter.title}
      description={`${offer.service} · ${offer.ref}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {o.close}
          </Button>
          <Button loading={m.isPending} aria-busy={m.isPending} onClick={submit}>
            {h.counter.send}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="text-small text-fg-muted">{fill(h.counter.body, { m: manager })}</p>
        <Field label={h.counter.due} hint={fill(h.counter.dueHint, { d: formatDateTime(offer.dueAt, locale) })} error={tried && dueBad ? h.counter.dueErr : undefined}>
          {(f) => (
            <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} type="datetime-local" value={due} min={toLocal(offer.dueAt)} onChange={(e) => setDue(e.target.value)} />
          )}
        </Field>
        <Field label={h.counter.reason} error={tried && reasonBad ? h.counter.reasonErr : undefined}>
          {(f) => (
            <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={3} placeholder={h.counter.reasonPh} value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
        </Field>
        {err && (
          <p role="alert"className="text-small text-danger m-shake">
            {err}
          </p>
        )}
      </form>
    </Dialog>
  );
}

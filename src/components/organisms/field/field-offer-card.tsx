"use client";
// U4 field offers (plan §7.5). Accept works offline (queued visit.accept); decline is online only (D-15).
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { ReasonDialog } from "@/components/molecules/ops/ops";
import { errorCopy } from "@/lib/api/error-copy";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyA } from "@/lib/field/copy-a";
import { enqueue } from "@/lib/field/sync";
import { fx } from "@/lib/field/api";
import { useOnline } from "@/lib/field/net";
import { formatDistance } from "@/lib/field/geo";
import { formatRelative } from "@/shared/format";
import type { FieldVisit } from "@/shared/field/types";
import { hhmm, useFieldBase, NeedsConnection } from "@/components/atoms/field-agent";

export function useOfferActions(v: FieldVisit) {
  const { c, locale } = useFieldCopy();
  const a = useCopyA();
  const toast = useToast();
  const qc = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    setBusy(true);
    try {
      await enqueue({ kind: "visit.accept", visitId: v.id, body: { base_version: v.version } });
      toast({ title: a.acceptedToast, tone: "success" });
    } catch { toast({ title: c.quotaFull, tone: "danger" }); } finally { setBusy(false); }
  };
  const dialog = (
    <ReasonDialog open={declining} onClose={() => setDeclining(false)} title={a.declineTitle} asRadios confirmLabel={a.decline} destructive
      options={Object.entries(a.declineReasons).map(([value, label]) => ({ value, label }))}
      onConfirm={async ({ reason, note }) => {
        try {
          await fx("POST", `/api/x_field/visits/${v.id}/decline`, { reason, note });
        } catch (e) { throw new Error(errorCopy(e, locale)); }
        setDeclining(false);
        toast({ title: a.declined });
        await qc.invalidateQueries({ queryKey: ["field"] });
      }} />
  );
  return { accept, decline: () => setDeclining(true), busy, dialog };
}

export function FieldOfferCard({ v, distanceM, accepted }: { v: FieldVisit; distanceM: number | null; accepted?: boolean }) {
  const { locale } = useFieldCopy();
  const a = useCopyA();
  const online = useOnline();
  const base = useFieldBase();
  const { accept, decline, busy, dialog } = useOfferActions(v);
  return (
    <article className="m-rise overflow-hidden border border-border bg-surface">
      <p className="flex items-center gap-2 bg-gold-200 px-4 py-2.5 text-small font-medium text-navy-950">
        <Icon name="zap" size={16} aria-hidden />{a.offer}
        {v.offerExpiresAt && <span className="ml-auto text-eyebrow normal-case">{fill(a.offerExpires, { time: formatRelative(v.offerExpiresAt, locale) })}</span>}
      </p>
      <div className="grid gap-3 p-4 text-center sm:p-5">
        <p className="text-label-lg">{v.title_i18n[locale]}</p>
        <p className="text-small text-fg-muted">{v.institution ?? v.address}</p>
        <p className="flex justify-center gap-4 text-small tabular">
          <span className="inline-flex items-center gap-1"><Icon name="mapPin" size={14} aria-hidden />{distanceM !== null ? formatDistance(distanceM) : a.distanceUnknown}</span>
          <span className="inline-flex items-center gap-1"><Icon name="clock" size={14} aria-hidden />{hhmm(v.windowStart, locale)}</span>
        </p>
        {accepted ? (
          <p className="m-pop bg-success-bg px-4 py-2 text-small font-medium text-success">{a.accepted}</p>
        ) : (
          <div className="grid gap-2">
            <Button size="lg" className="w-full justify-center" loading={busy} onClick={accept}>{a.accept}</Button>
            <NeedsConnection online={online}>
              <Button size="lg" variant="outline" className="w-full justify-center" disabled={!online} onClick={decline}>{a.decline}</Button>
            </NeedsConnection>
            <ButtonLink href={base(`/visits/${v.id}`)} variant="ghost" className="justify-center">{a.details}</ButtonLink>
          </div>
        )}
      </div>
      {dialog}
    </article>
  );
}

"use client";
// U10 conflict review (plan §2.8, board SY3): office vs mine, journey copy, two choices only (review, not edit).
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { useToast } from "@/components/atoms/toast";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyD } from "@/lib/field/copy-d";
import { useFieldMe } from "@/lib/field/api";
import { resolveConflict } from "@/lib/field/sync";
import type { ConflictPayload } from "@/shared/field/types";

const show = (v: unknown, c: ReturnType<typeof useFieldCopy>["c"]): string => {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) return v.map((x) => show(x, c)).join(" · ");
  const s = String(v);
  return (c.status as Record<string, string>)[s] ?? (c.outcome as Record<string, string>)[s] ?? s;
};

export function ConflictReview({ opId, payload, onDone }: { opId: string; payload: ConflictPayload; onDone: () => void }) {
  const { c } = useFieldCopy();
  const d = useCopyD();
  const toast = useToast();
  const manager = useFieldMe().data?.manager ?? "";
  const [busy, setBusy] = useState<"office" | "escalate" | null>(null);
  const mine = payload.mine as Record<string, unknown>;
  const what = show(mine.outcome ?? mine.status, c);
  const lead = fill(d.conflictLead, {
    merged: payload.autoMerged.includes("notes") ? d.mergedNotes : "",
    review: mine.outcome || mine.status ? fill(d.reviewStatus, { what }) : d.reviewGeneric,
  });
  const keys = [...new Set([...payload.needsReview.filter((k) => k in payload.office || k in mine), ...Object.keys(payload.office), ...Object.keys(mine)])]
    .filter((k) => !["kind", "version", "client_op_id", "base_version", "resolution"].includes(k));

  const act = async (choice: "office" | "escalate") => {
    setBusy(choice);
    await resolveConflict(opId, choice);
    toast({ title: choice === "office" ? d.resolvedOffice : fill(d.resolvedMine, { name: manager }), tone: "success" });
    onDone();
  };
  return (
    <div className="grid gap-4">
      <p role="alert" className="m-shake bg-warning-bg px-4 py-3 text-small font-medium">{lead}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([["office", d.office, payload.office as Record<string, unknown>], ["mine", d.mine, mine]] as const).map(([k, title, src]) => (
          <section key={k} className={k === "mine" ? " border-2 border-navy-300 bg-surface p-4" : " border border-border bg-bg-subtle p-4"}>
            <h3 className="mb-2 text-label">{title}</h3>
            <dl className="grid gap-2 text-small">
              {keys.map((f) => {
                const changed = payload.needsReview.includes(f) || JSON.stringify(payload.office[f as keyof typeof payload.office]) !== JSON.stringify(mine[f]);
                return (
                  <div key={f} className={changed ? " bg-gold-100 px-2 py-1" : "px-2 py-1"}>
                    <dt className="text-eyebrow normal-case text-fg-subtle">{d.fields[f] ?? f}</dt>
                    <dd className="break-words">{show(src[f], c)}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
      <div className="grid gap-2 sm:flex sm:justify-end">
        <Button variant="outline" size="lg" className="justify-center" loading={busy === "office"} disabled={!!busy} onClick={() => act("office")}>{d.useOffice}</Button>
        <Button size="lg" className="justify-center" loading={busy === "escalate"} disabled={!!busy} onClick={() => act("escalate")}>{fill(d.keepMine, { name: manager.split(" ")[0] })}</Button>
      </div>
    </div>
  );
}

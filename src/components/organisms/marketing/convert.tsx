"use client";
// CU2 Convert dialog: "Link to existing client" vs "Send account invitation". Stage stays until the first paid invoice (§2.4).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { errorCopy } from "@/lib/api/error-copy";
import { useConvert, useCustomers } from "@/lib/marketing/crm";
import type { Lead } from "@/shared/marketing/types";
import { cx } from "@/shared/format";
import { fill } from "@/content/pages/mkt-common";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Input } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { useM } from "@/components/atoms/marketing";
import { useC } from "@/components/molecules/marketing/crm";

export function ConvertDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const conv = useConvert();
  const q = useCustomers(lead.id);
  const matched = (q.data?.items ?? []).find((r) => r.match);
  const [picked, setPick] = useState(lead.clientId ?? "");
  const pick = picked || matched?.id || "";
  const [search, setSearch] = useState("");
  // The server matches the lead's phone/email against client records (`match`); the first match is preselected.
  const rows = (q.data?.items ?? []).filter((r) => !search || [r.name, r.customerId].some((x) => x?.toLowerCase().includes(search.toLowerCase())));
  const run = async (mode: "link" | "invite") => {
    try { await conv.mutateAsync({ id: lead.id, mode, clientId: mode === "link" ? pick : undefined }); toast({ title: c.convert.done, tone: "success" }); onClose(); }
    catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
  };
  return (
    <Dialog open onClose={onClose} title={c.convert.title} description={lead.name}
      footer={<div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={conv.isPending} onClick={() => run("invite")}>{c.convert.invite}</Button>
        <Button disabled={!pick} loading={conv.isPending} onClick={() => run("link")}>{c.convert.link}</Button>
      </div>}>
      <div className="grid gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={c.customers.search} aria-label={c.customers.search} />
        {q.isPending ? <div className="h-24 m-shimmer" /> : !rows.length ? <p className="text-small text-fg-muted">{c.convert.none}</p> : (
          <ul className="grid max-h-72 gap-2 overflow-y-auto">{rows.map((r) => (
            <li key={r.id}><label className={cx("flex cursor-pointer items-center gap-3 border p-3 text-small", pick === r.id ? "border-navy-700 bg-navy-50" : "border-border")}>
              <input type="radio" name="client" checked={pick === r.id} onChange={() => setPick(r.id)} className="accent-navy-700" />
              <span className="min-w-0 flex-1"><span className="block font-medium">{r.name}</span><span className="text-eyebrow tabular text-fg-subtle">{r.customerId} · {r.phoneMasked}</span></span>
              {(r.match || lead.clientId === r.id) && <span className="text-eyebrow text-success">{fill(c.convert.matched, { by: c.convert.by[r.match ?? "both"] })}</span>}
            </label></li>
          ))}</ul>
        )}
        <p className="text-eyebrow text-fg-subtle">{c.convert.inviteNote}</p>
        <span className="sr-only">{m.common.optional}</span>
      </div>
    </Dialog>
  );
}

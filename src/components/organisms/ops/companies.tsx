"use client";
// ORG-04: staff list of companies with detail + verification (SM).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDate } from "@/shared/format";
import { opsCompanies } from "@/content/pages/ops-companies";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";

type VStatus = "unverified" | "pending_verification" | "verified" | "rejected";
type Row = { id: string; name: string; legalName: string; tin: string | null; customerNo: string | null; members: number; verificationStatus: VStatus; duplicateTin: boolean; createdAt: string };
type Detail = Row & { orgType: string; rdbNumber: string | null; district: string | null; province: string | null; email: string | null; phone: string | null; verificationNote: string | null;
  members: { id: string; name: string; contact: string; role: string; pending: boolean }[]; requests: { code: string; service: string; status: string }[] };
const STATUSES: VStatus[] = ["pending_verification", "unverified", "verified", "rejected"];
const TONE: Record<VStatus, "success" | "warning" | "danger" | undefined> = { verified: "success", pending_verification: "warning", rejected: "danger", unverified: undefined };

export function CompanyQueue() {
  const { locale } = useI18n();
  const c = opsCompanies(locale);
  const p = useUrlParams();
  const status = p.get("status") ?? "";
  const [text, setText] = useState(p.get("q") ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["ops", "companies", status, p.get("q") ?? ""],
    queryFn: () => unwrap(api.GET("/api/admin/organizations", { params: { query: { status: (status || undefined) as VStatus | undefined, q: p.get("q") || undefined } } })) as Promise<{ rows: Row[] }>,
  });
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-h2">{c.title}</h1>
        <p className="text-body text-fg-muted">{c.lede}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <form className="min-w-0 flex-1 basis-60" onSubmit={(e) => { e.preventDefault(); setUrlParams({ q: text.trim() || null }); }}>
          <Field label={c.search}>{({ id }) => <Input id={id} type="search" value={text} onChange={(e) => setText(e.target.value)} />}</Field>
        </form>
        <div role="tablist" aria-label={c.cols.status} className="flex flex-wrap gap-1">
          {["", ...STATUSES].map((s) => (
            <button key={s || "all"} type="button" role="tab" aria-selected={status === s} onClick={() => setUrlParams({ status: s || null })}
              className={status === s ? "h-9 bg-secondary px-3 text-small text-on-secondary" : "h-9 border border-border bg-white px-3 text-small hover:bg-navy-50"}>
              {s ? c.status[s as VStatus] : c.all}
            </button>
          ))}
        </div>
      </div>
      {q.isPending ? <Skeleton className="h-48" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data.rows.length ? <EmptyState title={c.empty} /> : (
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full min-w-[40rem] text-small">
            <thead className="bg-navy-50 text-left">
              <tr>{(["name", "tin", "customer", "members", "status", "created"] as const).map((k) => <th key={k} scope="col" className="px-4 py-2 font-medium">{c.cols[k]}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {q.data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3"><button type="button" className="text-left font-medium underline underline-offset-2" onClick={() => setOpen(r.id)}>{r.name}</button></td>
                  <td className="px-4 py-3 font-mono tabular">{r.tin ?? "—"}{r.duplicateTin && <span className="ml-2"><Badge tone="danger">{c.dupTin}</Badge></span>}</td>
                  <td className="px-4 py-3 font-mono tabular">{r.customerNo ?? "—"}</td>
                  <td className="px-4 py-3 tabular">{r.members}</td>
                  <td className="px-4 py-3"><Badge tone={TONE[r.verificationStatus]}>{c.status[r.verificationStatus]}</Badge></td>
                  <td className="px-4 py-3 tabular">{formatDate(r.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <CompanyDetail id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CompanyDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { locale } = useI18n();
  const c = opsCompanies(locale);
  const qc = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState("");
  const q = useQuery({
    queryKey: ["ops", "company", id],
    queryFn: () => unwrap(api.GET("/api/admin/organizations/{id}", { params: { path: { id } } })) as Promise<Detail>,
  });
  const decide = useMutation({
    mutationFn: (decision: "verified" | "rejected") => unwrap(api.POST("/api/admin/organizations/{id}/verify", { params: { path: { id } }, body: { decision, note: note.trim() || undefined } })),
    onSuccess: () => { toast({ title: c.done, tone: "success" }); void qc.invalidateQueries({ queryKey: ["ops"] }); },
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  const d = q.data;
  return (
    <Dialog open onClose={onClose} side="right" title={d?.name ?? c.title}
      footer={d && d.verificationStatus !== "verified" ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={note.trim().length < 3} loading={decide.isPending && decide.variables === "rejected"} onClick={() => decide.mutate("rejected")}>{c.reject}</Button>
          <Button loading={decide.isPending && decide.variables === "verified"} onClick={() => decide.mutate("verified")}>{c.verify}</Button>
        </div>
      ) : <Button variant="ghost" onClick={onClose}>{c.close}</Button>}>
      {q.isPending ? <Skeleton className="h-40" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : d && (
        <div className="grid gap-5 text-small">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-fg-muted">{c.cols.name}</dt><dd>{d.legalName}</dd>
            <dt className="text-fg-muted">{c.cols.tin}</dt><dd className="font-mono">{d.tin ?? "—"}</dd>
            <dt className="text-fg-muted">RDB</dt><dd className="font-mono">{d.rdbNumber ?? "—"}</dd>
            <dt className="text-fg-muted">{c.cols.customer}</dt><dd className="font-mono">{d.customerNo ?? "—"}</dd>
            <dt className="text-fg-muted">{c.cols.status}</dt><dd><Badge tone={TONE[d.verificationStatus]}>{c.status[d.verificationStatus]}</Badge></dd>
          </dl>
          <section>
            <h2 className="mb-2 text-label">{c.reps}</h2>
            {d.members.length ? <ul className="divide-y divide-border">{d.members.map((m) => <li key={m.id} className="py-2">{m.name} · {m.role}{m.pending ? " · …" : ""}</li>)}</ul> : <p className="text-fg-muted">{c.none}</p>}
          </section>
          <section>
            <h2 className="mb-2 text-label">{c.requests}</h2>
            {d.requests.length ? <ul className="divide-y divide-border">{d.requests.map((r) => <li key={r.code} className="py-2"><span className="font-mono">{r.code}</span> · {r.service} · {r.status.replace(/_/g, " ")}</li>)}</ul> : <p className="text-fg-muted">{c.none}</p>}
          </section>
          {d.verificationStatus !== "verified" && (
            <Field label={c.note} hint={c.noteHint}>{({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
          )}
        </div>
      )}
    </Dialog>
  );
}

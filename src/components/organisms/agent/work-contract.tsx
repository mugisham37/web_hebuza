"use client";
// Lane F · /work/contract (board 05 CT1–CT5, PCT1) and /work/contract/sign/[docId] (CT2, XK7). Plan §7.8.
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Textarea, Radio } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { PanelError, EmptyPanel } from "@/components/molecules/ops/ops";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { errorCopy } from "@/lib/api/error-copy";
import { useExternal, type ContractDoc, type LicenceInvoice, type RateCardRow } from "@/lib/work/api";
import { useSummary } from "@/lib/agent/api";
import { useContract, useLicence, useNotice, useRateRequest, useRenew, useSign, type ContractVM, type HistItem } from "@/lib/work/f";
import { expiry, why, scopeOf } from "@/lib/work/limits";
import { workContract, type WorkContractCopy } from "@/content/pages/work-contract";
import { fill } from "@/content/pages/work-common";
import { POLICY } from "@/shared/policy";
import { EvidenceLine, ExpiryChip, WhyNote, useW } from "@/components/atoms/work";
import { SignDocument } from "@/components/molecules/agent/agent";

const useC = () => workContract(useI18n().locale);
const box = " border border-border bg-white p-4 sm:p-5";
const TABS = ["overview", "documents", "rates", "licence", "renewal", "history"] as const;
type Tab = (typeof TABS)[number];

/** Server-rendered PDF (contract terms + signature evidence, licence invoice) saved through the browser. */
function downloadFile(path: string, name: string) {
  return fetch(path, { credentials: "include" }).then(async (r) => {
    if (!r.ok) throw new Error(String(r.status));
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement("a"), { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

export function ContractView() {
  const c = useC();
  const q = useContract();
  const params = useUrlParams();
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "overview";
  const { ext } = useExternal();
  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        title={c.title}
        sub={c.sub}
      />
      <div role="tablist"aria-label={c.title} className="mb-5 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setUrlParams({ tab: t === "overview" ? null : t })}
            className={cx("-mb-px h-11 shrink-0 border-b-2 px-3 text-small transition-colors", tab === t ? "border-navy-700 font-medium" : "border-transparent text-fg-muted hover:text-fg")}
          >
            {c.tabs[t]}
          </button>
        ))}
      </div>
      {q.isPending ? (
        <SkeletonRows n={5} />
      ) : q.isError ? (
        <PanelError what={c.title} onRetry={() => q.refetch()} />
      ) : (
        <div className="m-rise"key={tab}>
          {q.data.notice && <NoticeBanner d={q.data.notice.lastDay} />}
          {ext?.contractState === "expired" && tab !== "renewal" && <ExpiredState />}
          {tab === "overview" && <Overview v={q.data} />}
          {tab === "documents" && <Documents v={q.data} />}
          {tab === "rates" && <Rates v={q.data} />}
          {tab === "licence" && <Licence v={q.data} />}
          {tab === "renewal" && <Renewal v={q.data} />}
          {tab === "history" && <History items={q.data.history} />}
        </div>
      )}
    </div>
  );
}

function NoticeBanner({ d }: { d: string }) {
  const c = useC();
  const { locale } = useI18n();
  return (
    <p role="status"className="mb-4 flex items-center gap-2 bg-ink-100 px-4 py-3 text-small">
      <Icon name="clock" size={16} aria-hidden />
      {fill(c.overview.noticeBanner, { d: formatDate(d, locale) })}
    </p>
  );
}
function ExpiredState() {
  const c = useC();
  return (
    <div role="alert"className="mb-4 flex flex-wrap items-center gap-3 bg-danger-bg p-4">
      <Icon name="x"size={18} aria-hidden className="text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-label">{c.overview.expiredTitle}</p>
        <p className="text-small">{c.overview.expiredBody}</p>
      </div>
      <Button size="sm" onClick={() => setUrlParams({ tab: "renewal" })}>
        {useW().contract.renew}
      </Button>
    </div>
  );
}

const statusTone = (s: ContractDoc["status"]) =>
  s === "pending_signature" ? "bg-navy-50 text-navy-700" : s === "expired" || s === "terminated" ? "bg-danger-bg text-danger" : s === "expiring" ? "bg-warning-bg text-warning" : "bg-success-bg text-success";

function DocRow({ d }: { d: ContractDoc }) {
  const c = useC();
  const { locale } = useI18n();
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <Icon name={d.status === "pending_signature" ? "file" : "fileCheck"} size={18} aria-hidden className={d.status === "pending_signature" ? "text-navy-700" : "text-success"} />
      <span className="min-w-0 flex-1 text-small">
        {c.kind[d.kind]} <span className="text-fg-subtle">v{d.version}</span>
      </span>
      {d.signedAt ? (
        <span className="text-eyebrow text-fg-muted">{fill(c.overview.signedOn, { d: formatDate(d.signedAt, locale) })}</span>
      ) : (
        <ButtonLink size="sm" href={localHref(locale, `/work/contract/sign/${d.id}`)}>
          {c.overview.toSign}
        </ButtonLink>
      )}
    </li>
  );
}


function Overview({ v }: { v: ContractVM }) {
  const c = useC();
  const w = useW();
  const { locale } = useI18n();
  const toast = useToast();
  const sa = v.contract.find((d) => d.kind === "service_agreement");
  const special = v.rates.find((r) => r.status === "approved" && r.bps !== undefined && r.bps !== v.revenue.bps);
  const p = v.revenue.bps / 100;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className={box}>
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center bg-navy-50 text-navy-700">
            <Icon name="file" size={26} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-h4">{c.overview.heading}</h2>
            <p className="text-small text-fg-muted">
              {sa?.end ? fill(w.contract.until, { d: formatDate(sa.end, locale) }) : w.expiry.none} · {w.contract.reminders}
            </p>
          </div>
          {sa && <span className={cx("inline-flex h-7 items-center px-3 text-eyebrow font-medium normal-case", statusTone(sa.status))}>{c.docStatus[sa.status]}</span>}
        </div>
        {sa?.end && (
          <div className="mt-3">
            <ExpiryChip date={sa.end} />
          </div>
        )}
        <h3 className="mt-5 mb-1 text-label">{c.overview.docs}</h3>
        <ul className="divide-y divide-border">
          {v.contract.map((d) => (
            <DocRow key={d.id} d={d} />
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {sa && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void downloadFile(`/api/work/x/contract/${sa.id}/file`, `contract-${sa.id}-v${sa.version}.pdf`).then(
                  () => toast({ title: c.documents.pdfReady }),
                  () => toast({ title: c.title, tone: "danger" }),
                );
              }}
            >
              <Icon name="file" size={14} aria-hidden /> {c.overview.viewPdf}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setUrlParams({ tab: "history" })}>
            {c.overview.history} <Icon name="arrowRight" size={14} aria-hidden />
          </Button>
        </div>
      </section>
      <section className={cx(box, "grid content-start gap-3")}>
        <h3 className="text-label">{c.overview.revenue}</h3>
        <p className="text-h4 tabular">{fill(c.overview.split, { p, h: 100 - p })}</p>
        <p className="text-small text-fg-muted">{c.overview.splitNote}</p>
        {special && (
          <p className="text-small">
            {c.tabs.rates}: {special.serviceName} {special.bps! / 100}%
          </p>
        )}
        <p className="bg-bg-subtle px-3 py-2 text-small tabular">
          {fill(c.overview.licence, { amount: formatMoney(v.revenue.licenceMonthly, "RWF", locale), w: v.revenue.whtBps / 100 })}
        </p>
        <Button variant="outline" size="sm" onClick={() => setUrlParams({ tab: "rates" })}>
          {c.tabs.rates} <Icon name="arrowRight" size={14} aria-hidden />
        </Button>
      </section>
    </div>
  );
}

function Documents({ v }: { v: ContractVM }) {
  const c = useC();
  const { locale } = useI18n();
  const toast = useToast();
  return (
    <ul className="grid gap-3 m-stagger">
      {v.contract.map((d, i) => (
        <li key={d.id} style={{ ["--i"as string]: i }} className={cx(box, "grid gap-3")}>
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-label">{c.kind[d.kind]}</p>
            <span className={cx("inline-flex h-6 items-center px-2.5 text-eyebrow font-medium normal-case", statusTone(d.status))}>{c.docStatus[d.status]}</span>
          </div>
          {/* Versions: current + previous (illustrative history from the version number). */}
          <ol className="grid gap-1 text-small">
            {Array.from({ length: d.version }, (_, k) => d.version - k).map((ver) => (
              <li key={ver} className="flex items-center gap-2">
                <span className="tabular">{fill(c.documents.version, { v: ver })}</span>
                {ver === d.version ? <span className="bg-gold-400 text-on-gold px-2 text-eyebrow normal-case">{c.documents.current}</span> : null}
                {ver === d.version && <span className="text-fg-subtle">{fill(c.documents.from, { d: formatDate(d.start, locale) })}</span>}
              </li>
            ))}
          </ol>
          {d.signedAt && d.evidence && <EvidenceLine signedAt={d.signedAt} ip={d.evidence.ip} sha={d.evidence.sha256} compact />}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void downloadFile(`/api/work/x/contract/${d.id}/file`, `${d.kind}-v${d.version}.pdf`).then(
                  () => toast({ title: c.documents.pdfReady }),
                  () => toast({ title: c.title, tone: "danger" }),
                );
              }}
            >
              <Icon name="file" size={14} aria-hidden /> {c.documents.pdf}
            </Button>
            {d.status === "pending_signature" && (
              <ButtonLink size="sm" href={localHref(locale, `/work/contract/sign/${d.id}`)}>
                {c.documents.sign}
              </ButtonLink>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function rateText(r: Pick<RateCardRow, "bps" | "flat">, c: WorkContractCopy, locale: "rw" | "en" | "fr") {
  return r.flat !== undefined ? fill(c.rates.flat, { amount: formatMoney(r.flat, "RWF", locale) }) : fill(c.rates.pct, { p: (r.bps ?? 0) / 100 });
}

function Rates({ v }: { v: ContractVM }) {
  const c = useC();
  const w = useW();
  const { locale } = useI18n();
  const { data } = useSummary();
  const { ext } = useExternal();
  const manager = data?.me.manager ?? "";
  const [open, setOpen] = useState(false);
  const denied = why(scopeOf(ext), "contract.manage");
  const approved = v.rates.filter((r) => r.status === "approved");
  const others = v.rates.filter((r) => r.status !== "approved");
  const from = approved.map((r) => r.from).sort().at(-1);
  return (
    <div className="grid gap-4">
      {from && <p className="text-small text-fg-muted">{fill(c.rates.effective, { d: formatDate(from, locale) })}</p>}
      <div className="overflow-x-auto border border-border bg-white">
        <table className="w-full min-w-[28rem] text-small">
          <thead className="bg-bg-subtle text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{c.rates.service}</th>
              <th className="px-4 py-3 font-medium">{c.rates.rate}</th>
              <th className="px-4 py-3 font-medium">{c.rates.from}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...approved, ...others].map((r) => (
              <tr key={`${r.serviceId}-${r.status}`} className={r.status !== "approved" ? "bg-tint/50" : undefined}>
                <td className="px-4 py-3">
                  {r.serviceName}
                  {r.status !== "approved" && (
                    <span className={cx("ml-2 px-2 text-eyebrow normal-case", r.status === "proposed" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger")}>
                      {r.status === "proposed" ? c.rates.proposed : c.rates.rejected}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular">{rateText(r, c, locale)}</td>
                <td className="px-4 py-3 tabular text-fg-muted">{formatDate(r.from, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {others
        .filter((r) => r.status === "proposed")
        .map((r) => (
          <div key={r.serviceId} role="status"className="flex flex-wrap items-center gap-3 bg-warning-bg px-4 py-3 text-small">
            <Icon name="clock" size={16} aria-hidden />
            <span className="flex-1">
              {r.serviceName}: {fill(c.rates.pending, { m: manager })}
            </span>
          </div>
        ))}
      {denied === "adminOnly" ? (
        <WhyNote>{c.rates.memberNote}</WhyNote>
      ) : denied ? (
        <WhyNote>{w.why[denied]}</WhyNote>
      ) : (
        <button type="button"onClick={() => setOpen(true)} className="flex w-full items-center gap-3 bg-tint p-4 text-left m-press hover:bg-navy-100/60">
          <Icon name="sparkle"size={18} aria-hidden className="text-navy-700" />
          <span className="min-w-0 flex-1">
            <span className="block text-label">{c.rates.propose}</span>
            <span className="block text-small text-fg-muted">{fill(c.rates.proposeSub, { m: manager })}</span>
          </span>
          <Icon name="arrowRight" size={16} aria-hidden />
        </button>
      )}
      <RateChangeDialog open={open} onClose={() => setOpen(false)} rates={approved} manager={manager} />
    </div>
  );
}

function RateChangeDialog({ open, onClose, rates, manager }: { open: boolean; onClose: () => void; rates: RateCardRow[]; manager: string }) {
  const c = useC();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useRateRequest();
  const [svc, setSvc] = useState(rates[0]?.serviceId ?? "");
  const [kind, setKind] = useState<"pct" | "flat">("pct");
  const [val, setVal] = useState("");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const n = Number(val);
  const valid = Number.isInteger(n) && n > 0 && (kind === "flat" || n <= 100);
  const reasonOk = reason.trim().length > 0;
  const close = () => {
    setVal("");
    setReason("");
    setTried(false);
    m.reset();
    onClose();
  };
  const send = () => {
    setTried(true);
    if (!valid || !reasonOk || m.isPending) return;
    m.mutate(
      { serviceId: svc, ...(kind === "pct" ? { bps: n * 100 } : { flat: n }), reason },
      { onSuccess: () => (toast({ title: fill(c.rates.sent, { m: manager }), tone: "success" }), close()) },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={c.rates.dialogTitle}
      description={fill(c.rates.proposeSub, { m: manager })}
      footer={
        <Button onClick={send} loading={m.isPending} aria-busy={m.isPending}>
          {c.rates.send}
        </Button>
      }
    >
      <div className="grid gap-4">
        <Field label={c.rates.service}>
          {(f) => (
            <select id={f.id} value={svc} onChange={(e) => setSvc(e.target.value)} className="h-12 w-full border border-border-strong bg-white px-3">
              {rates.map((r) => (
                <option key={r.serviceId} value={r.serviceId}>
                  {r.serviceName} — {rateText(r, c, locale)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{c.rates.kindLabel}</legend>
          <Radio name="rk" label={c.rates.kindPct} checked={kind === "pct"} onChange={() => setKind("pct")} />
          <Radio name="rk" label={c.rates.kindFlat} checked={kind === "flat"} onChange={() => setKind("flat")} />
        </fieldset>
        <Field label={c.rates.value} hint={kind === "pct" ? c.rates.pctHint : c.rates.flatHint} error={tried && !valid ? c.rates.invalid : undefined}>
          {(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ""))} />}
        </Field>
        <Field label={c.rates.reason} error={tried && !reasonOk ? c.rates.reasonRequired : undefined}>
          {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {m.isError && (
          <p role="alert"className="text-small text-danger m-shake">
            {errorCopy(m.error, locale)}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function Licence({ v }: { v: ContractVM }) {
  const c = useC();
  const w = useW();
  const { locale } = useI18n();
  const toast = useToast();
  const { ext } = useExternal();
  const [filter, setFilter] = useState<"all" | "paid" | "due">("all");
  const [pay, setPay] = useState<LicenceInvoice | null>(null);
  const denied = why(scopeOf(ext), "contract.manage");
  const open = (l: LicenceInvoice) => l.status === "due" || l.status === "overdue";
  const list = v.licence.filter((l) => filter === "all" || (filter === "due" ? open(l) : !open(l)));
  if (!v.licence.length) return <EmptyPanel title={c.licence.empty} />;
  return (
    <div className="grid gap-4">
      <div className="flex gap-2"role="group"aria-label={c.tabs.licence}>
        {(["all", "paid", "due"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cx("h-9 px-4 text-small m-press", filter === f ? "bg-secondary text-on-navy" : "bg-ink-100")}
          >
            {c.licence.filters[f]}
            {f === "all" && ` (${v.licence.length})`}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 m-stagger">
        {list.map((l, i) => (
          <li key={l.number} style={{ ["--i"as string]: i }} className={cx(box, "grid gap-2")}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-label tabular">{l.number}</span>
              <span className={cx("px-2.5 py-0.5 text-eyebrow normal-case", open(l) ? (l.status === "overdue" ? "bg-danger-bg text-danger" : "bg-gold-400") : "bg-success-bg text-success")}>
                {fill(w.licence.status[l.status], { d: formatDate(l.due, locale, { day: "numeric", month: "short" }) })}
              </span>
            </div>
            <p className="text-small text-fg-muted">
              {c.licence.period}: {formatDate(`${l.period}-01`, locale, { month: "long", year: "numeric" })}
            </p>
            <p className="text-h4 tabular">{formatMoney(l.amount, "RWF", locale)}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void downloadFile(`/api/work/x/licence/${encodeURIComponent(l.number)}/file`, `${l.number}.pdf`).then(
                  () => toast({ title: c.documents.pdfReady }),
                  () => toast({ title: c.title, tone: "danger" }),
                );
                }}
              >
                {c.licence.viewPdf}
              </Button>
              {open(l) && !denied && (
                <Button size="sm" onClick={() => setPay(l)}>
                  {c.licence.pay}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {denied ? (
        <WhyNote>{w.why[denied]}</WhyNote>
      ) : (
        v.licence.some(open) && (
          <button type="button"onClick={() => setPay(v.licence.find(open)!)} className="flex items-center gap-3 bg-tint p-4 text-left text-small m-press">
            <Icon name="card" size={18} aria-hidden />
            <span className="flex-1">{c.licence.payOrNet}</span>
            <Icon name="arrowRight" size={16} aria-hidden />
          </button>
        )
      )}
      <PayLicenceDialog inv={pay} onClose={() => setPay(null)} />
    </div>
  );
}

function PayLicenceDialog({ inv, onClose }: { inv: LicenceInvoice | null; onClose: () => void }) {
  const c = useC();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useLicence();
  const [how, setHow] = useState<"pay" | "net">("pay");
  const [phone, setPhone] = useState("+250 7");
  const [tried, setTried] = useState(false);
  const phoneOk = /^\+?250\s?7\d(\s?\d){7}$/.test(phone.trim());
  const close = () => {
    setTried(false);
    m.reset();
    onClose();
  };
  const go = () => {
    setTried(true);
    if (!inv || (how === "pay" && !phoneOk) || m.isPending) return;
    m.mutate(
      { number: inv.number, how, phone: how === "pay" ? phone : undefined },
      { onSuccess: () => (toast({ title: fill(how === "pay" ? c.licence.paid : c.licence.netted, { n: inv.number }), tone: "success" }), close()) },
    );
  };
  return (
    <Dialog
      open={!!inv}
      onClose={close}
      title={fill(c.licence.dialogTitle, { n: inv?.number ?? "" })}
      description={inv ? formatMoney(inv.amount, "RWF", locale) : undefined}
      footer={
        <Button onClick={go} loading={m.isPending} aria-busy={m.isPending}>
          {how === "pay" ? c.licence.confirmPay : c.licence.confirmNet}
        </Button>
      }
    >
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-label">{c.licence.how}</legend>
        {(["pay", "net"] as const).map((h) => (
          <label key={h} className={cx("grid cursor-pointer gap-0.5 border p-3", how === h ? "border-navy-700 bg-tint" : "border-border")}>
            <span className="flex items-center gap-2 text-label">
              <input type="radio"name="how"checked={how === h} onChange={() => setHow(h)} className="accent-navy-700" />
              {h === "pay" ? c.licence.momo : c.licence.net}
            </span>
            <span className="pl-6 text-small text-fg-muted">{h === "pay" ? c.licence.momoHint : c.licence.netHint}</span>
          </label>
        ))}
      </fieldset>
      {how === "pay" && (
        <Field className="mt-4"label={c.licence.phone} hint={c.licence.phoneHint} error={tried && !phoneOk ? c.licence.phoneBad : undefined}>
          {(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
      )}
      {m.isPending && how === "pay" && (
        <p role="status"className="mt-3 flex items-center gap-2 text-small">
          <span className="size-2 animate-pulse rounded-full bg-navy-700"aria-hidden />
          {c.licence.prompt}
        </p>
      )}
      {m.isError && (
        <p role="alert"className="mt-3 text-small text-danger m-shake">
          {errorCopy(m.error, locale)}
        </p>
      )}
    </Dialog>
  );
}

function Renewal({ v }: { v: ContractVM }) {
  const c = useC();
  const w = useW();
  const { locale } = useI18n();
  const toast = useToast();
  const { data } = useSummary();
  const { ext } = useExternal();
  const manager = data?.me.manager ?? "";
  const renew = useRenew();
  const [ack, setAck] = useState(false);
  const [notice, setNotice] = useState(false);
  const sa = v.contract.find((d) => d.kind === "service_agreement");
  const { days } = expiry(sa?.end ?? null);
  const denied = why(scopeOf(ext), "contract.manage");
  const canRenew = days !== null && days <= 60;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={cx(box, "grid content-start gap-3")}>
        <h2 className="flex items-center gap-2 text-h4">
          <Icon name="calendar"size={20} aria-hidden className="text-navy-700" /> {c.renewal.renewTitle}
        </h2>
        <p className="text-small text-fg-muted">{fill(c.renewal.renewBody, { d: sa?.end ? formatDate(sa.end, locale) : "—" })}</p>
        {sa?.end && <ExpiryChip date={sa.end} />}
        <div className="bg-bg-subtle p-3">
          <p className="mb-2 text-label">{c.renewal.renewTerms}</p>
          <ul className="grid list-disc gap-1 pl-5 text-small">
            {c.renewal.terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        {denied ? (
          <WhyNote>{w.why[denied]}</WhyNote>
        ) : !canRenew ? (
          <WhyNote tone="warning">{c.renewal.tooEarly}</WhyNote>
        ) : (
          <>
            <label className="flex items-start gap-2 text-small">
              <input type="checkbox"className="mt-1 accent-navy-700"checked={ack} onChange={(e) => setAck(e.target.checked)} />
              {w.sign.agree}
            </label>
            <Button
              disabled={!ack}
              loading={renew.isPending}
              aria-busy={renew.isPending}
              onClick={() =>
                renew.mutate(undefined, {
                  onSuccess: (r) => {
                    setAck(false);
                    toast({ title: fill(c.renewal.renewed, { d: formatDate(r.end, locale) }), body: c.renewal.renewedNote, tone: "success" });
                  },
                })
              }
            >
              {w.contract.renew}
            </Button>
          </>
        )}
        {renew.isError && (
          <p role="alert"className="text-small text-danger">
            {errorCopy(renew.error, locale)}
          </p>
        )}
      </section>
      <section className={cx(box, "grid content-start gap-3")}>
        <h2 className="flex items-center gap-2 text-h4">
          <Icon name="shield"size={20} aria-hidden className="text-danger" /> {c.renewal.noticeTitle}
        </h2>
        <p className="text-small text-fg-muted">{fill(c.renewal.noticeBody, { m: manager })}</p>
        {v.notice ? (
          <p role="status"className="bg-ink-100 px-3 py-2 text-small">
            {fill(c.renewal.noticeGiven, { d: formatDate(v.notice.at, locale), l: formatDate(v.notice.lastDay, locale) })}
          </p>
        ) : denied ? (
          <WhyNote>{w.why[denied]}</WhyNote>
        ) : (
          <Button variant="outline" onClick={() => setNotice(true)}>
            {c.renewal.noticeBtn}
          </Button>
        )}
      </section>
      <NoticeDialog open={notice} onClose={() => setNotice(false)} manager={manager} />
    </div>
  );
}

function NoticeDialog({ open, onClose, manager }: { open: boolean; onClose: () => void; manager: string }) {
  const c = useC();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useNotice();
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [lastDay] = useState(() => new Date(Date.now() + POLICY.contractNoticeDays * 86_400_000).toISOString());
  const close = () => {
    setReason("");
    setTried(false);
    m.reset();
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={c.renewal.noticeDialog}
      description={fill(c.renewal.noticeBody, { m: manager })}
      footer={
        <Button
          variant="danger"
          loading={m.isPending}
          aria-busy={m.isPending}
          onClick={() => {
            setTried(true);
            if (!reason.trim()) return;
            m.mutate(reason, { onSuccess: () => (toast({ title: fill(c.renewal.noticeSent, { m: manager }) }), close()) });
          }}
        >
          {c.renewal.noticeConfirm}
        </Button>
      }
    >
      <div className="grid gap-3">
        <p className="text-small">{fill(c.renewal.noticeDays, { n: POLICY.contractNoticeDays })}</p>
        <p className="bg-bg-subtle px-3 py-2 text-label">{fill(c.renewal.lastDay, { d: formatDate(lastDay, locale) })}</p>
        <Field label={c.renewal.noticeReason} error={tried && !reason.trim() ? c.rates.reasonRequired : undefined}>
          {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {m.isError && (
          <p role="alert"className="text-small text-danger">
            {errorCopy(m.error, locale)}
          </p>
        )}
      </div>
    </Dialog>
  );
}

const HIST_ICON: Record<HistItem["kind"], IconName> = { signed: "fileCheck", renewed: "refresh", notice: "clock", rate: "chart", version: "file", licence: "card", payout: "wallet" };
function History({ items }: { items: HistItem[] }) {
  const c = useC();
  const { locale } = useI18n();
  if (!items.length) return <EmptyPanel title={c.history.empty} />;
  return (
    <ol className={cx(box, "grid gap-4 m-stagger")}>
      {items.map((h, i) => (
        <li key={h.id} style={{ ["--i"as string]: i }} className="grid grid-cols-[2.25rem_1fr] gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-tint text-navy-700">
            <Icon name={HIST_ICON[h.kind]} size={16} aria-hidden />
          </span>
          <span>
            <span className="block text-small font-medium">{h.text}</span>
            <span className="block text-eyebrow text-fg-subtle">
              {h.by} · <time dateTime={h.at}>{formatDateTime(h.at, locale)}</time>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- /work/contract/sign/[docId] (CT2, PCT1)
export function SignPage({ docId }: { docId: string }) {
  const c = useC();
  const { locale } = useI18n();
  const q = useContract();
  const sign = useSign(docId);
  const { data } = useSummary();
  const toast = useToast();
  const w = useW();
  const back = (
    <Link href={localHref(locale, "/work/contract?tab=documents")} className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted">
      <Icon name="arrowRight"size={14} aria-hidden className="rotate-180" /> {c.sign.back}
    </Link>
  );
  let body: ReactNode;
  if (q.isPending) body = <SkeletonRows n={4} />;
  else if (q.isError) body = <PanelError what={c.title} onRetry={() => q.refetch()} />;
  else {
    const doc = q.data.contract.find((d) => d.id === docId);
    if (!doc) body = <EmptyPanel title={c.sign.notFound} />;
    else
      body = (
        <div className="grid gap-4">
          {doc.kind === "service_agreement" && (
            <p className="bg-tint px-4 py-3 text-small">
              <strong>{c.sign.preface}:</strong>{" "}
              {fill(c.sign.prefaceBody, { p: q.data.revenue.bps / 100, amount: formatMoney(q.data.revenue.licenceMonthly, "RWF", locale) })}
            </p>
          )}
          {doc.signedAt && (
            <div role="status"className="flex items-center gap-3 bg-success-bg p-4 m-pop">
              <Icon name="check"size={20} aria-hidden className="text-success m-tick" />
              <span>
                <span className="block text-label">{c.sign.done}</span>
                <span className="block text-small">{c.sign.doneBody}</span>
              </span>
            </div>
          )}
          <SignDocument
            doc={{ ...doc, title: c.kind[doc.kind] }}
            signerName={data?.me.name ?? ""}
            onSign={(name) => sign.mutateAsync(name).then(() => toast({ title: fill(w.sign.signed, { d: formatDateTime(new Date(), locale) }), tone: "success" }))}
          />
        </div>
      );
  }
  return (
    <div className="mx-auto max-w-2xl pb-24 lg:pb-8">
      <PageHead back={back} title={c.tabs.documents} />
      {body}
    </div>
  );
}


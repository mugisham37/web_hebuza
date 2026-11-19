"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate, formatMoney } from "@/shared/format";
import { c3Copy, fill } from "@/content/pages/c3";
import { Button, buttonClass } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { Checkbox, Field, Input, Radio, Textarea } from "@/components/atoms/field";
import { Dialog } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { PreviewDialog } from "@/components/organisms/client/document-preview";
import { kb } from "@/components/molecules/client/api";
import { api, unwrap } from "@/lib/api/client";
import { saveBlob, zipStore } from "@/components/molecules/client/zip";
import { useSession } from "@/lib/auth/session";
import { VerifyNotice } from "@/components/molecules/auth/auth";

export type DlvFile = {
  id: string;
  title: string;
  mime: string;
  sizeBytes: number;
  version: number;
  issuedAt: string;
  issuer?: string | null;
  signatureRequired?: boolean;
  signedAt?: string | null;
};
export type DlvGroup = {
  code: string;
  service: string;
  state: "in_progress" | "ready" | "locked";
  step: number;
  totalSteps: number;
  expectedAt?: string | null;
  balance?: number;
  currency?: string;
  review?: "accepted" | "changes_requested" | null;
  rating?: number | null;
  files: DlvFile[];
};

const KEY = ["c3", "deliverables"];

/** C09: results grouped by request: in progress / ready / locked by payment, preview, download, accept or request changes. */
export function Deliverables() {
  const { locale } = useI18n();
  const c = c3Copy(locale).dlv;
  const { user } = useSession();
  const unverified = !!user && !user.emailVerified;
  // ★ GET /api/me/deliverables (spec deliverables-and-review §11), not on the server yet.
  const q = useQuery({
    queryKey: KEY,
    queryFn: () =>
      unwrap<{ requests: DlvGroup[] }>(api.GET("/api/me/deliverables")).then(
        (d) => d.requests,
      ),
  });

  if (q.error)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.isPending)
    return (
      <div className="grid gap-4" aria-busy>
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-48 " />
        ))}
      </div>
    );
  if (!q.data.length)
    return <EmptyState title={c.emptyTitle} body={c.emptyBody} />;
  return (
    <div className="grid gap-5">
      {unverified && <VerifyNotice />}
      {q.data.map((g) => (
        <Group key={g.code} g={g} canDownload={!unverified} />
      ))}
    </div>
  );
}

function Group({ g, canDownload }: { g: DlvGroup; canDownload: boolean }) {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const [preview, setPreview] = useState<{
    name: string;
    mime: string;
    src: string;
    downloadHref?: string;
    watermark?: string;
  } | null>(null);
  const locked = g.state === "locked";

  return (
    <section
      aria-labelledby={`dlv-${g.code}`}
      className="grid gap-4 border border-border bg-surface p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`dlv-${g.code}`} className="text-fg-heading text-card-title">
          {g.service}
        </h2>
        <span className="text-small text-fg-subtle">{g.code}</span>
      </header>

      {g.state === "in_progress" ? (
        <div className="grid justify-items-center gap-3 bg-bg-subtle p-6 text-center">
          <Badge tone="info">{c.dlv.notYet}</Badge>
          <p className="text-card-title">{c.dlv.emptyTitle}</p>
          <p className="text-small">
            {fill(c.dlv.working, { step: g.step, total: g.totalSteps })}
          </p>
          <progress
            className="h-1.5 w-full max-w-xs accent-secondary"
            max={g.totalSteps}
            value={g.step}
            aria-label={fill(c.dlv.working, {
              step: g.step,
              total: g.totalSteps,
            })}
          />
          {g.expectedAt && (
            <p className="flex items-center gap-2 text-small text-fg-subtle">
              <Icon name="calendar" size={14} aria-hidden />
              {fill(c.dlv.expected, { date: formatDate(g.expectedAt, locale) })}
            </p>
          )}
        </div>
      ) : (
        <>
          {locked ? (
            <div className="flex flex-wrap items-center gap-4 border-l-3 border-gold-400 bg-gold-50 p-4">
              <Icon name="card" aria-hidden />
              <p className="min-w-0 flex-1 basis-48 font-medium">
                {fill(c.dlv.payBalance, {
                  amount: formatMoney(g.balance ?? 0, g.currency, locale),
                })}
              </p>
              <a
                href={localHref(locale, `/pay/${g.code}`)}
                className={buttonClass({ size: "sm" })}
              >
                {c.dlv.payNow}
              </a>
            </div>
          ) : (
            <p className="flex items-center gap-2 bg-success-bg p-4 font-medium text-success">
              <Icon name="check" aria-hidden />
              {c.dlv.ready}
            </p>
          )}
          <ul className="grid gap-2">
            {g.files.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-3 border border-border p-3 sm:p-4"
              >
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center bg-bg-tint"
                >
                  <Icon name="file" size={18} />
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-medium break-words">{f.title}</p>
                  <p className="text-small text-fg-subtle">
                    {[
                      f.issuer,
                      fill(c.dlv.issued, {
                        date: formatDate(f.issuedAt, locale),
                      }),
                      kb(f.sizeBytes),
                      `v${f.version}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPreview({
                        name: f.title,
                        mime: f.mime,
                        src: `/api/deliverables/${f.id}/preview`,
                        downloadHref: locked || !canDownload
                          ? undefined
                          : `/api/deliverables/${f.id}/download`,
                        watermark: locked
                          ? `${c.dlv.previewWatermark} · ${g.code}`
                          : undefined,
                      })
                    }
                  >
                    {c.common.preview}
                  </Button>
                  {locked ? (
                    <span className="inline-flex h-9 items-center gap-1.5 px-2 text-small text-fg-subtle">
                      <Icon name="lock" size={16} aria-hidden />
                      {c.dlv.locked}
                    </span>
                  ) : !canDownload ? null : (
                    <a
                      href={`/api/deliverables/${f.id}/download`}
                      download
                      className={buttonClass({ size: "sm" })}
                    >
                      {c.common.download}
                    </a>
                  )}
                  {!locked && canDownload && <KeepButton id={f.id} />}
                  {f.signatureRequired && (f.signedAt
                    ? <Badge tone="success">{fill(c.dlv.sign.signed, { date: formatDate(f.signedAt, locale) })}</Badge>
                    : !locked && canDownload && <SignButton id={f.id} name={f.title} />)}
                </div>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 text-small text-fg-subtle">
            <Icon
              name={locked ? "lock" : "shield"}
              size={14}
              aria-hidden
            />
            {locked ? c.dlv.watermark : c.dlv.secure}
          </p>
          {!locked && canDownload && g.files.length > 1 && <ZipAll g={g} />}
          {!locked && <Review g={g} />}
        </>
      )}
      <PreviewDialog file={preview} onClose={() => setPreview(null)} />
    </section>
  );
}

function Review({ g }: { g: DlvGroup }) {
  const { locale } = useI18n();
  const c = c3Copy(locale).dlv;
  const qc = useQueryClient();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<keyof typeof c.reasons>("missing");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string>();
  // ★ POST /api/deliverables/{id}/receipt {ok, note} is per file; a request's verdict applies to all its files.
  const send = useMutation({
    mutationFn: (body: { ok: boolean; note?: string }) =>
      Promise.all(
        g.files.map((f) =>
          unwrap(api.POST("/api/deliverables/{id}/receipt", { params: { path: { id: f.id } }, body })),
        ),
      ),
    onSuccess: (_, body) => {
      setAsking(false);
      toast({ title: body.ok ? c.accepted : c.sent, tone: "success" });
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: () =>
      toast({ title: c3Copy(locale).common.error, tone: "danger" }),
  });

  if (g.review === "accepted")
    return (
      <div className="grid gap-3 border-t border-border pt-4">
        <p className="font-medium text-success">{c.accepted}</p>
        {g.rating ? <p className="text-small text-fg-subtle">{c.rate.thanks}</p> : <Rate g={g} />}
      </div>
    );
  if (g.review === "changes_requested")
    return (
      <Badge tone="warning" className="justify-self-start">
        {c.changesRequested}
      </Badge>
    );

  return (
    <div className="grid gap-3 border-t border-border pt-4">
      <p className="text-card-title">{c.gotAll}</p>
      {!asking ? (
        <div className="flex flex-wrap gap-2">
          <Button
            loading={send.isPending}
            onClick={() => send.mutate({ ok: true })}
          >
            {c.yes}
          </Button>
          <Button variant="outline" onClick={() => setAsking(true)}>
            {c.changes}
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return setErr(c.noteRequired);
            setErr(undefined);
            send.mutate({
              ok: false,
              note: `${c.reasons[reason]}: ${note.trim()}`,
            });
          }}
        >
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label">{c.changesTitle}</legend>
            {(Object.keys(c.reasons) as (keyof typeof c.reasons)[]).map((k) => (
              <Radio
                key={k}
                name={`reason-${g.code}`}
                label={c.reasons[k]}
                checked={reason === k}
                onChange={() => setReason(k)}
              />
            ))}
          </fieldset>
          <Field label={c.note} error={err}>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                maxLength={2000}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={send.isPending}>
              {c.send}
            </Button>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              {c3Copy(locale).common.cancel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function ZipAll({ g }: { g: DlvGroup }) {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const files = await Promise.all(
        g.files.map(async (f) => {
          // Bytes, not JSON: same-origin download route redirects to a signed URL.
          const r = await fetch(`/api/deliverables/${f.id}/download`, { credentials: "include" });
          if (!r.ok) throw new Error(String(r.status));
          return { name: f.title, data: new Uint8Array(await r.arrayBuffer()) };
        }),
      );
      saveBlob(zipStore(files), `${g.code}.zip`);
    } catch {
      toast({ title: c.common.error, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" size="sm" className="justify-self-start" loading={busy} onClick={run}>
      <Icon name="layers" size={16} aria-hidden /> {c.dlv.zipAll}
    </Button>
  );
}

function Rate({ g }: { g: DlvGroup }) {
  const { locale } = useI18n();
  const c = c3Copy(locale).dlv.rate;
  const qc = useQueryClient();
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string>();
  const send = useMutation({
    mutationFn: () =>
      unwrap(api.POST("/api/me/deliverables/{code}/rating", { params: { path: { code: g.code } }, body: { stars, tags, comment: comment.trim() || undefined } })),
    onSuccess: () => {
      toast({ title: c.thanks, tone: "success" });
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: () => toast({ title: c3Copy(locale).common.error, tone: "danger" }),
  });
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!stars) return setErr(c.required);
        setErr(undefined);
        send.mutate();
      }}
    >
      <fieldset aria-describedby={err ? `rate-err-${g.code}` : undefined}>
        <legend className="mb-2 text-card-title">{c.title}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1 has-focus-visible:outline-2 has-focus-visible:outline-focus">
              <input type="radio" name={`stars-${g.code}`} className="sr-only" checked={stars === n} onChange={() => setStars(n)} />
              <span className="sr-only">{fill(c.stars, { n })}</span>
              <svg aria-hidden viewBox="0 0 24 24" className={`size-8 ${n <= stars ? "fill-gold-400 text-gold-600" : "fill-none text-fg-subtle"}`} stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
              </svg>
            </label>
          ))}
        </div>
        {err && <p id={`rate-err-${g.code}`} className="mt-1 text-small font-medium text-danger">{err}</p>}
      </fieldset>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-label">{c.tagsLabel}</legend>
        {Object.entries(c.tags).map(([k, label]) => {
          const on = tags.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => setTags(on ? tags.filter((t) => t !== k) : [...tags, k])}
              className={`border px-3 py-1 text-small ${on ? "border-secondary bg-secondary text-on-secondary" : "border-border bg-surface"}`}
            >
              {label}
            </button>
          );
        })}
      </fieldset>
      <Field label={c.comment}>
        {({ id }) => <Textarea id={id} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />}
      </Field>
      <Button type="submit" className="justify-self-start" loading={send.isPending}>{c.submit}</Button>
    </form>
  );
}

/** DLV-09: copy a released file into the client's document library. */
function KeepButton({ id }: { id: string }) {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const toast = useToast();
  const qc = useQueryClient();
  const keep = useMutation({
    mutationFn: () => unwrap(api.POST("/api/me/deliverables/{id}/save-to-library", { params: { path: { id } } })),
    onSuccess: () => { toast({ title: c.dlv.kept, tone: "success" }); void qc.invalidateQueries({ queryKey: ["c3"] }); },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });
  return <Button size="sm" variant="ghost" loading={keep.isPending} disabled={keep.isSuccess} onClick={() => keep.mutate()}>{c.dlv.keep}</Button>;
}

/** DLV-10: built-in e-signature (typed name or drawn), sealed server-side with the file's hash. */
function SignButton({ id, name }: { id: string; name: string }) {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const t = c.dlv.sign;
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [typed, setTyped] = useState(user?.name ?? "");
  const [agree, setAgree] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawn = useRef(false);
  const sign = useMutation({
    mutationFn: () => unwrap(api.POST("/api/me/deliverables/{id}/sign", { params: { path: { id } }, body: {
      method, name: typed.trim(), agree: true, image: method === "drawn" ? canvas.current!.toDataURL("image/png") : null,
    } })),
    onSuccess: () => { toast({ title: t.done, tone: "success" }); setOpen(false); void qc.invalidateQueries({ queryKey: ["c3"] }); },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });
  const pen = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvas.current!, ctx = cv.getContext("2d")!, r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * cv.width, y = ((e.clientY - r.top) / r.height) * cv.height;
    if (e.type === "pointerdown") { cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(x, y); return; }
    if (e.buttons !== 1) return;
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = getComputedStyle(cv).color; ctx.lineTo(x, y); ctx.stroke(); drawn.current = true;
  };
  const clear = () => { const cv = canvas.current; cv?.getContext("2d")?.clearRect(0, 0, cv.width, cv.height); drawn.current = false; };
  const ready = agree && typed.trim().length >= 2;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>{t.cta}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={fill(t.title, { name })} description={t.lede}
        footer={<Button disabled={!ready} loading={sign.isPending} onClick={() => (method === "drawn" && !drawn.current ? toast({ title: t.draw, tone: "danger" }) : sign.mutate())}>{t.submit}</Button>}>
        <div className="grid gap-4">
          <div role="radiogroup" aria-label={t.cta} className="flex gap-2">
            {(["typed", "drawn"] as const).map((m) => (
              <Button key={m} size="sm" variant={method === m ? "secondary" : "outline"} aria-pressed={method === m} onClick={() => setMethod(m)}>{t[m]}</Button>
            ))}
          </div>
          <Field label={t.name}>{(a) => <Input id={a.id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="name" />}</Field>
          {method === "typed" ? (
            <p aria-hidden className="border-b border-border pb-1 font-serif text-h3 italic">{typed || "\u00a0"}</p>
          ) : (
            <div className="grid gap-2">
              <canvas ref={canvas} width={560} height={180} aria-label={t.draw} role="img" onPointerDown={pen} onPointerMove={pen}
                className="h-36 w-full touch-none border border-border bg-white text-fg-heading" />
              <Button size="sm" variant="ghost" className="justify-self-start" onClick={clear}>{t.clear}</Button>
            </div>
          )}
          <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} label={t.agree} />
        </div>
      </Dialog>
    </>
  );
}

"use client";
// U14 Template editor `/system/notifications/templates/[key]?lang=rw|en|fr&v=` (plan 06 §7 U14, board 10 NT3/NT4/PNT1
// with §3 fixes: case refs HBZ-XXXXXX in samples). Language tabs, per-channel fields + counters, variable palette,
// live preview with sample data, lint, version history + diff, Save draft / Submit (Meta for WhatsApp) / Retire.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemNotifications } from "@/content/pages/system-notifications";
import { fill } from "@/content/pages/system-common";
import { cx, formatDateTime } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { WA_LIMITS, activeVersion, currentVersion, lint, render, smsSegments, validateVars } from "@/shared/system/templates";
import { useTemplate, useTemplateAction } from "@/lib/system/e";
import type { TemplateBody, TemplateVM, TemplateVersion, VarType } from "@/shared/system/types";
import type { Locale } from "@/shared/i18n/config";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Badge } from "@/components/atoms/tag";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { LockedContent, useS } from "@/components/atoms/system";
import { ConflictBanner, DiffView, EmailPreview, SmsBubble, WhatsAppBubble } from "@/components/molecules/system/system";
import { TemplateStatusBadge } from "@/components/organisms/system/notifications";
import { useErrText, useParamState } from "@/components/molecules/system/audit";
import { useOnline } from "@/components/atoms/hooks";

const useC = () => systemNotifications(useI18n().locale);
const LOCALES: Locale[] = ["rw", "en", "fr"];
const LIST = "/system/notifications?tab=templates";
type Langs = Record<Locale, TemplateBody | null>;
const SAMPLE: Record<VarType, string> = { string: "Jean Bosco", money: "250,000 RWF", date: "10/11/2026 14:32", ref: "HBZ-4F7K2Q", secure_link: "hebuza.rw/s/••••", code: "483 920" };
const sampleFor = (t: TemplateVM) => Object.fromEntries(Object.entries(t.variablesSchema).map(([k, v]) => [k, SAMPLE[v]]));
const fieldsFor = (ch: TemplateVM["channel"]): (keyof TemplateBody)[] => (ch === "whatsapp" ? ["header", "body", "footer", "button"] : ch === "email" ? ["subject", "body"] : ["body"]);

export function TemplateEditorView({ templateKey }: { templateKey: string }) {
  const c = useC();
  const { locale } = useI18n();
  const q = useTemplate(templateKey);
  const back = (
    <Link href={localHref(locale, LIST)} className="mb-3 inline-flex min-h-9 items-center gap-1.5 text-small font-medium text-fg-muted hover:text-fg">
      <Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.ed.back}
    </Link>
  );
  if (q.isPending) return <div className="grid gap-4">{back}<Skeleton className="h-10 w-72" /><Skeleton className="h-96 " /></div>;
  if (q.isError && !q.data) {
    const st = errorState(q.error);
    if (st === "locked") return <LockedContent reason="role" />;
    return <div>{back}{(q.error as { status?: number }).status === 404 ? <EmptyPanel title={c.ed.notFound} /> : <PanelError what={c.ed.what} onRetry={() => q.refetch()} />}</div>;
  }
  return <div className="m-rise"><Editor key={templateKey} t={q.data.template} rev={q.data.rev} onReload={() => q.refetch()} /></div>;
}

function Editor({ t, rev, onReload }: { t: TemplateVM; rev: number; onReload: () => void }) {
  const cc = useC();
  const c = cc.ed;
  const s = useS();
  const { locale } = useI18n();
  const toast = useToast();
  const errText = useErrText();
  const online = useOnline();
  const phone = usePhone();
  const router = useRouter();
  const [sp, set] = useParamState();
  const act = useTemplateAction(t.key);
  const cur = currentVersion(t);

  // Draft follows the server until the user types; a newer rev only replaces it while clean (adjust-state-in-render).
  const [base, setBase] = useState({ rev, langs: cur.languages, category: t.category });
  const [langs, setLangs] = useState<Langs>(cur.languages);
  const [category, setCategory] = useState(t.category);
  const dirty = JSON.stringify(langs) !== JSON.stringify(base.langs) || category !== base.category;
  if (rev !== base.rev && !dirty) { setBase({ rev, langs: cur.languages, category: t.category }); setLangs(cur.languages); setCategory(t.category); }

  const [conflict, setConflict] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [compareV, setCompareV] = useState<number | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const lang = (LOCALES as string[]).includes(sp.get("lang") ?? "") ? (sp.get("lang") as Locale) : locale;
  const viewV = Number(sp.get("v")) || null;
  const viewing: TemplateVersion | null = viewV && viewV !== cur.v ? t.versions.find((v) => v.v === viewV) ?? null : null;
  const readOnly = t.ownerKind !== "security";
  const pending = cur.status === "pending_provider_approval";
  const locked = readOnly || !!viewing || pending || !online;
  const shown: Langs = viewing ? viewing.languages : langs;
  const body = shown[lang];
  const fields = fieldsFor(t.channel);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  const setField = (f: keyof TemplateBody, v: string) => setLangs((L) => ({ ...L, [lang]: { ...(L[lang] ?? { body: "" }), [f]: v } }));
  const insertVar = (name: string) => {
    const el = bodyRef.current;
    const text = body?.body ?? "";
    const at = el?.selectionStart ?? text.length;
    const token = `{{${name}}}`;
    setField("body", text.slice(0, at) + token + text.slice(el?.selectionEnd ?? at));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + token.length, at + token.length); });
  };

  // Checks: per-language lint + WhatsApp all-three rule + schema use across languages.
  const written = LOCALES.filter((l) => langs[l]?.body.trim());
  const issues = [
    ...written.flatMap((l) => lint({ ...t, category }, langs[l]!).map((i) => ({ ...i, l }))),
    ...(t.channel === "whatsapp" ? LOCALES.filter((l) => !written.includes(l)).map((l) => ({ code: "missing_language" as const, detail: c.lang[l], l })) : []),
  ];
  const vars = validateVars(written.map((l) => fields.map((f) => langs[l]?.[f] ?? "").join("\n")), t.variablesSchema);
  const unusedIssues = written.length ? vars.unused.map((v) => ({ code: "unused" as const, detail: v, l: lang })) : [];
  const blocking = issues.length > 0 || !written.length;
  const lintText = (i: { code: keyof typeof c.lint; detail?: string; field?: string }) => fill(c.lint[i.code], { d: i.detail ?? (i.field ? c[i.field as "header"] : "") });

  const mutate = (v: Parameters<typeof act.mutate>[0], ok?: () => void) => act.mutate(v, {
    onSuccess: () => ok?.(),
    onError: (e) => (errorState(e) === "conflict" ? setConflict(true) : toast({ title: errText(e), tone: "danger" })),
  });
  const saveDraft = (then?: () => void) => mutate({ op: "save", rev, languages: langs, category }, () => {
    setBase({ rev: rev + 1, langs, category });
    toast({ title: c.saved, tone: "success" });
    then?.();
  });
  const submit = () => {
    const go = () => mutate({ op: "submit", rev: dirty ? rev + 1 : rev }, () => toast({ title: t.channel === "whatsapp" ? c.submitted : fill(c.activated, { v: cur.v }), tone: "success" }));
    if (dirty) saveDraft(go); else go();
  };

  const sample = sampleFor(t);
  const preview = (b: TemplateBody): TemplateBody => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, render(String(v ?? ""), sample)])) as TemplateBody;
  const compare = compareV !== null ? t.versions.find((v) => v.v === compareV) : null;
  const active = activeVersion(t);

  return (
    <div className="grid gap-5">
      <Link href={localHref(locale, LIST)} onClick={(e) => { if (dirty) { e.preventDefault(); setLeaving(true); } }} className="-mb-2 inline-flex min-h-9 items-center gap-1.5 justify-self-start text-small font-medium text-fg-muted hover:text-fg">
        <Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.back}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mono text-h3 break-all">{t.key}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-small text-fg-muted">
            {s.rule[t.channel]} · v{cur.v} <TemplateStatusBadge t={t} />{dirty && <Badge tone="warning">{c.unsaved}</Badge>}
          </p>
        </div>
        {!readOnly && !viewing && (
          <div className="flex flex-wrap gap-2">
            {active && <Button size="sm" variant="ghost" onClick={() => setRetiring(true)} disabled={!online}>{c.retire}</Button>}
            <Button size="sm" variant="outline" onClick={() => mutate({ op: "test", rev }, () => toast({ title: c.testSent, tone: "success" }))} disabled={!online || !written.length}>{c.testSend}</Button>
            <Button size="sm" variant="secondary" loading={act.isPending && act.variables?.op === "save"} disabled={!dirty || locked} onClick={() => saveDraft()}>{c.saveDraft}</Button>
          </div>
        )}
      </header>

      {conflict && <ConflictBanner by="" at={cur.editedAt} onReload={() => { setConflict(false); setBase({ rev: -1, langs: cur.languages, category: t.category }); setLangs(cur.languages); onReload(); }} />}
      {readOnly && <LockedNote text={fill(c.readOnly, { role: cc.tpl.ownerRole[t.ownerKind] })} />}
      {viewing && (
        <p role="status" className="flex flex-wrap items-center gap-3 bg-ink-100 p-4 text-small">
          {fill(c.viewing, { v: viewing.v })}<button type="button" className="font-medium underline underline-offset-4" onClick={() => set({ v: null })}>{c.backToCurrent}</button>
        </p>
      )}
      {pending && (
        <p role="status" className="flex items-center gap-3 border border-info/30 bg-info-bg p-4 text-small m-rise">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-info" /><span className="min-w-0 flex-1">{c.pendingMeta}</span>
          {process.env.NODE_ENV !== "production" && <Button size="sm" variant="ghost" loading={act.isPending && act.variables?.op === "simulate-rejection"} onClick={() => mutate({ op: "simulate-rejection", rev })}>{c.simulateReject}</Button>}
        </p>
      )}
      {cur.status === "rejected" && <p role="alert" className="border border-danger/30 bg-danger-bg p-4 text-small font-medium text-danger">{fill(c.rejected, { v: cur.v, r: cur.rejectedReason ?? "" })}</p>}
      {cur.status === "active" && !readOnly && !viewing && <p className="text-small text-fg-muted">{fill(c.newVersion, { v: cur.v })}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        {/* ---------------- form */}
        <section className="grid min-w-0 content-start gap-4 border border-border bg-surface p-4 sm:p-5">
          <div role="tablist" aria-label={c.lang.en} className="-mx-1 flex gap-1 overflow-x-auto border-b border-border">
            {LOCALES.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={l === lang} onClick={() => set({ lang: l })}
                className={cx("-mb-px flex h-11 items-center gap-1.5 border-b-2 px-3 text-button whitespace-nowrap", l === lang ? "border-primary text-navy-700" : "border-transparent text-fg-subtle hover:text-fg")}>
                {c.lang[l]}{!shown[l]?.body.trim() && <span aria-label={c.missingLang} className="size-1.5 rounded-full bg-warning" />}
              </button>
            ))}
          </div>
          {!body && !locked ? (
            <div className="grid place-items-center gap-3 border border-dashed border-border-strong px-4 py-10 text-center">
              <p className="text-label">{c.missingLang}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {written.filter((l) => l !== lang).map((l) => <Button key={l} size="sm" variant="outline" onClick={() => setLangs((L) => ({ ...L, [lang]: { ...L[l]! } }))}>{fill(c.startFrom, { l: c.lang[l] })}</Button>)}
                <Button size="sm" variant="ghost" onClick={() => setField("body", "")}><Icon name="plus" size={14} aria-hidden />{c.body}</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {fields.map((f) => {
                const v = body?.[f] ?? "";
                const max = t.channel === "whatsapp" ? WA_LIMITS[f as keyof typeof WA_LIMITS] : undefined;
                const label = c[f as "header"];
                return (
                  <Field key={`${lang}-${f}`} label={label} hint={f === "body" && t.channel === "sms" ? fill(s.preview.segments, (({ segments, encoding, length }) => ({ n: segments, enc: encoding, len: length }))(smsSegments(render(v, sample)))) : undefined}>
                    {({ id, describedBy }) => (
                      <div className="relative">
                        {f === "body"
                          ? <Textarea ref={bodyRef} id={id} aria-describedby={describedBy} value={v} readOnly={locked} onChange={(e) => setField(f, e.target.value)} className="min-h-36 font-mono text-[0.9rem]" />
                          : <Input id={id} aria-describedby={describedBy} value={v} readOnly={locked} onChange={(e) => setField(f, e.target.value)} />}
                        {max && <span className={cx("pointer-events-none absolute right-3 bottom-2 text-eyebrow tabular", v.length > max ? "text-danger" : "text-fg-subtle")}>{fill(c.counter, { n: v.length, max })}</span>}
                      </div>
                    )}
                  </Field>
                );
              })}
              {t.channel === "email" && (
                // shortcut: plain-text part is derived from the body (TemplateBody has no text field); add an editable field when the type gains one.
                <Field label={c.text}>{({ id }) => <Textarea id={id} readOnly value={render(body?.body ?? "", sample)} className="min-h-20 bg-bg-subtle text-small" />}</Field>
              )}
              {t.channel === "whatsapp" && (
                <Field label={c.category}>
                  {({ id }) => (
                    <Select id={id} value={category} disabled={locked} onChange={(e) => setCategory(e.target.value as TemplateVM["category"])}>
                      {(["utility", "marketing", "authentication"] as const).map((k) => <option key={k} value={k}>{c.cat[k]}</option>)}
                    </Select>
                  )}
                </Field>
              )}
            </div>
          )}
          {/* variable palette */}
          <div className="grid gap-2 border-t border-border pt-4">
            <p className="text-label">{c.vars}</p>
            <p className="text-eyebrow text-fg-subtle">{c.varsHint}</p>
            <ul className="flex flex-wrap gap-1.5">
              {Object.entries(t.variablesSchema).map(([k, type]) => (
                <li key={k}>
                  <button type="button" disabled={locked || !body} aria-label={fill(c.insert, { v: `{{${k}}}` })} onClick={() => insertVar(k)}
                    className="inline-flex h-8 items-center gap-1.5 bg-info-bg px-3 font-mono text-[0.78rem] m-press disabled:opacity-50">
                    {`{{${k}}}`}<span className="font-sans text-fg-subtle">{type}</span>
                  </button>
                </li>
              ))}
              {!Object.keys(t.variablesSchema).length && <li className="text-small text-fg-muted"></li>}
            </ul>
          </div>
        </section>

        {/* ---------------- preview + checks + versions */}
        <aside className="grid min-w-0 content-start gap-4">
          <section className="grid gap-2">
            <p className="flex items-center justify-between text-label">{fill(c.preview, { l: c.lang[lang] })}<span className="text-eyebrow text-fg-subtle">{c.sample}</span></p>
            {body?.body.trim() ? (
              <div key={lang} className="m-rise">
                {t.channel === "whatsapp" ? <WhatsAppBubble body={preview(body)} /> : t.channel === "email" ? <EmailPreview body={preview(body)} /> : t.channel === "sms" ? <SmsBubble text={render(body.body, sample)} /> : <p className="border border-border bg-surface p-4 text-small whitespace-pre-wrap">{render(body.body, sample)}</p>}
              </div>
            ) : <p className="border border-dashed border-border-strong p-6 text-center text-small text-fg-muted">{c.missingLang}</p>}
          </section>

          <section aria-labelledby="checks-h" className="grid gap-2 border border-border bg-surface p-4">
            <h2 id="checks-h" className="text-label">{c.checks}</h2>
            {[...issues, ...unusedIssues].length ? (
              <ul className="grid gap-1.5 text-small" aria-live="polite">
                {[...issues, ...unusedIssues].map((i, n) => (
                  <li key={n} className={cx("flex gap-2", i.code === "unused" ? "text-fg-muted" : "text-danger")}>
                    <Icon name={i.code === "unused" ? "clock" : "x"} size={14} aria-hidden className="mt-0.5 shrink-0" />
                    <span><span className="font-mono text-eyebrow uppercase">{i.l}</span> {lintText(i)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="flex items-center gap-2 text-small font-medium text-success m-tone"><Icon name="check" size={14} aria-hidden />{c.ready}</p>}
            {!readOnly && !viewing && (cur.status === "draft" || cur.status === "rejected" || dirty) && (
              <div className="grid gap-1.5 border-t border-border pt-3">
                <Button dots loading={act.isPending && act.variables?.op === "submit"} disabled={blocking || pending || !online} onClick={submit}>
                  {t.channel === "whatsapp" ? c.submitMeta : c.submitApproval}
                </Button>
                {t.channel === "whatsapp" && written.length < 3 && <p className="text-eyebrow text-fg-subtle">{c.needAll}</p>}
              </div>
            )}
          </section>

          <section aria-labelledby="ver-h" className="grid gap-2 border border-border bg-surface p-4">
            <h2 id="ver-h" className="text-label">{c.versions}</h2>
            <ol className="grid gap-1">
              {[...t.versions].reverse().map((v) => (
                <li key={v.v} className={cx("grid gap-1 px-2 py-2 text-small", (viewing?.v ?? cur.v) === v.v && "bg-bg-subtle")}>
                  <span className="flex flex-wrap items-center gap-2">
                    <button type="button" className="font-medium tabular underline-offset-4 hover:underline" onClick={() => set({ v: v.v === cur.v ? null : String(v.v) })}>v{v.v}</button>
                    <Badge tone={v.status === "active" ? "success" : v.status === "rejected" ? "danger" : v.status === "pending_provider_approval" ? "info" : "neutral"}>{cc.tpl.s[v.status]}</Badge>
                    {v.v === cur.v && <span className="text-eyebrow text-fg-subtle">{c.current}</span>}
                  </span>
                  <span className="text-eyebrow text-fg-subtle">{v.editedBy} · {formatDateTime(v.editedAt, locale)}{v.approvedBy && ` · ✓ ${v.approvedBy}`}</span>
                  {v.v !== cur.v && <button type="button" className="justify-self-start text-eyebrow font-medium text-link underline underline-offset-4" onClick={() => setCompareV(compareV === v.v ? null : v.v)}>{compareV === v.v ? c.hideCompare : fill(c.compare, { v: v.v })}</button>}
                </li>
              ))}
            </ol>
            {compare && <DiffView title={`v${compare.v} → v${cur.v}`} before={compare.languages} after={langs} />}
          </section>
        </aside>
      </div>

      <RetireDialog open={retiring} onClose={() => setRetiring(false)} busy={act.isPending} onConfirm={(reason) => mutate({ op: "retire", rev, reason }, () => { setRetiring(false); toast({ title: c.retiredToast, tone: "success" }); })} />
      <Dialog open={leaving} onClose={() => setLeaving(false)} side={phone ? "bottom" : undefined} title={c.unsaved}
        footer={<><Button variant="outline" onClick={() => setLeaving(false)}>{c.stay}</Button><Button variant="danger" onClick={() => router.push(localHref(locale, LIST))}>{c.leave}</Button></>} />
    </div>
  );
}

function LockedNote({ text }: { text: string }) {
  return <p className="flex items-start gap-3 border border-border bg-bg-subtle p-4 text-small"><Icon name="lock" size={16} aria-hidden className="mt-0.5 shrink-0 text-fg-muted" />{text}</p>;
}

function RetireDialog({ open, onClose, onConfirm, busy }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; busy: boolean }) {
  const c = useC().ed;
  const s = useS();
  const phone = usePhone();
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onClose={() => { setReason(""); onClose(); }} side={phone ? "bottom" : undefined} title={c.retireTitle} description={c.retireBody}
      footer={<><Button variant="outline" onClick={onClose}>{s.secret.cancel}</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>{c.retire}</Button></>}>
      <Field label={c.reason}>{({ id }) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
    </Dialog>
  );
}

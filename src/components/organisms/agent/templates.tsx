"use client";
import { useWs } from "@/lib/agent/ws";
// CM4 Templates & outbox: /agent/inbox/templates?tab=templates|outbox&t=<template id>
import { errorCopy } from "@/lib/api/error-copy";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate } from "@/shared/format";
import { localHref } from "@/shared/i18n/config";
import {
  useTemplates,
  useSaveTemplate,
  useDeleteTemplate,
  LANGS,
  VARS,
  type Lang,
  type Tpl,
} from "@/lib/agent/d";
import {
  useOutbox,
  pendingCount,
  retry,
  retryAll,
  discard,
} from "@/lib/agent/outbox";
import { fill } from "@/content/pages/agent-common";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { CountBadge } from "@/components/atoms/ops";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { Button, buttonClass } from "@/components/atoms/button";
import { Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { fillVars, useIC } from "@/components/organisms/agent/thread";

const SAMPLE = {
  client: "Kigali Fresh Foods Ltd",
  ref: "HBZ-8VB2XCQ",
  dueAt: "2026-11-21T10:00:00Z",
};
const NEW = "new";

export function TemplatesView() {
  const { c, locale } = useIC();
  const { wsHref } = useWs();
  const p = useUrlParams();
  const tab = p.get("tab") === "outbox" ? "outbox" : "templates";
  const n = pendingCount(useOutbox());
  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        title={c.tpl.pageTitle}
        sub={c.tpl.pageSub}
        back={
          <Link
            href={localHref(locale, wsHref("/agent/inbox"))}
            className="mb-1 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"
          >
            <Icon
              name="arrowRight"
              size={14}
              aria-hidden
              className="rotate-180"
            />
            {c.title}
          </Link>
        }
      />
      <div
        role="tablist"
        aria-label={c.tpl.pageTitle}
        className="mb-4 flex gap-1 border-b border-border"
      >
        {(["templates", "outbox"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setUrlParams({ tab: t === "templates" ? null : t })}
            className={cx(
              "-mb-px flex h-11 items-center gap-2 border-b-2 px-4 text-button",
              tab === t
                ? "border-navy-700"
                : "border-transparent text-fg-subtle hover:text-fg",
            )}
          >
            {c.tpl.tabs[t]}
            {t === "outbox" && <span className="tabular">({n})</span>}
          </button>
        ))}
      </div>
      {tab === "templates" ? <Editor /> : <OutboxPanel />}
    </div>
  );
}

function Editor() {
  const { c, locale } = useIC();
  const { wsHref } = useWs();
  const toast = useToast();
  const p = useUrlParams();
  const q = useTemplates();
  const save = useSaveTemplate();
  const del = useDeleteTemplate();
  const list = q.data ?? [];
  const selId = p.get("t");
  const cur: Tpl | null =
    selId === NEW
      ? null
      : (list.find((t) => t.id === selId) ?? list[0] ?? null);
  const curId = selId === NEW ? NEW : cur ? cur.id : NEW;
  if (q.isPending) return <SkeletonRows n={4} />;
  if (q.isError)
    return <PanelError what={c.tpl.title} onRetry={() => q.refetch()} />;
  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => setUrlParams({ t: NEW })}
        >
          <Icon name="plus" size={14} aria-hidden />
          {c.tpl.new}
        </Button>
        {list.length ? (
          <ul aria-label={c.tpl.list} className="grid gap-1">
            {list.map((t, i) => (
              <li
                key={t.id}
                style={{ "--i": Math.min(i, 6) } as CSSProperties}
              >
                <button
                  type="button"
                  aria-current={t.id === curId || undefined}
                  onClick={() => setUrlParams({ t: t.id })}
                  className={cx(
                    "w-full px-3 py-2.5 text-left text-small m-press",
                    t.id === curId
                      ? "bg-tint font-medium text-fg"
                      : "hover:bg-white",
                  )}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyPanel compact title={c.tpl.empty} body={c.tpl.emptyBody} />
        )}
      </div>
      <Form
        key={curId}
        tpl={cur}
        busy={save.isPending}
        onSave={(t) =>
          save.mutate(
            { ...t, id: cur?.id, isNew: !cur },
            {
              onSuccess: (r) => {
                toast({ title: c.tpl.saved, tone: "success" });
                setUrlParams({ t: r.id });
              },
              onError: (e) =>
                toast({ title: errorCopy(e, locale), tone: "danger" }),
            },
          )
        }
        onDelete={
          cur
            ? () =>
                del.mutate(cur.id, {
                  onSuccess: () => {
                    setUrlParams({ t: null });
                    toast({
                      title: c.tpl.deleted,
                      tone: "success",
                      action: {
                        label: c.tpl.undo,
                        onClick: () => save.mutate({ ...cur, isNew: true }),
                      },
                    });
                  },
                  onError: (e) =>
                    toast({ title: errorCopy(e, locale), tone: "danger" }),
                })
            : undefined
        }
        useHref={cur ? localHref(locale, wsHref(`/agent/inbox?tpl=${cur.id}`)) : null}
      />
    </div>
  );
}

function Form({
  tpl,
  busy,
  onSave,
  onDelete,
  useHref,
}: {
  tpl: Tpl | null;
  busy: boolean;
  onSave: (t: Pick<Tpl, "name" | "body_rw" | "body_en" | "body_fr">) => void;
  onDelete?: () => void;
  useHref: string | null;
}) {
  const { c } = useIC();
  const [name, setName] = useState(tpl?.name ?? "");
  const [bodies, setBodies] = useState<Record<Lang, string>>({
    rw: tpl?.body_rw ?? "",
    en: tpl?.body_en ?? "",
    fr: tpl?.body_fr ?? "",
  });
  const [lang, setLang] = useState<Lang>("en");
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const insertVar = (v: string) => {
    const el = box.current;
    const tok = `{${v}}`;
    const s = el ? el.selectionStart : bodies[lang].length;
    const e = el ? el.selectionEnd : s;
    const next = bodies[lang].slice(0, s) + tok + bodies[lang].slice(e);
    setBodies({ ...bodies, [lang]: next });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + tok.length, s + tok.length);
    });
  };
  const submit = () => {
    const filled = LANGS.filter((l) => bodies[l].trim());
    const missing = LANGS.find((l) => !bodies[l].trim());
    const e = !name.trim()
      ? c.tpl.nameRequired
      : filled.length && missing
        ? fill(c.tpl.bodyRequired, { l: missing.toUpperCase() })
        : !filled.length
          ? fill(c.tpl.bodyRequired, { l: lang.toUpperCase() })
          : null;
    setErr(e);
    if (e) {
      setShake((n) => n + 1);
      if (missing && name.trim()) setLang(missing);
      return;
    }
    onSave({
      name: name.trim(),
      body_rw: bodies.rw,
      body_en: bodies.en,
      body_fr: bodies.fr,
    });
  };
  return (
    <form
      key={shake}
      onSubmit={(e) => (e.preventDefault(), submit())}
      className={cx(
        "grid content-start gap-4 border border-border bg-white p-4 sm:p-5 m-rise",
        shake > 0 && "m-shake",
      )}
    >
      <label className="grid gap-1 text-small font-medium">
        {c.tpl.name}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!name.trim() && !!err}
          maxLength={80}
        />
      </label>
      <div className="grid gap-2">
        <div role="tablist"aria-label={c.tpl.lang} className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              onClick={() => setLang(l)}
              className={cx(
                "inline-flex h-9 items-center gap-1 border px-3 text-small uppercase",
                lang === l
                  ? "border-secondary bg-secondary font-medium text-on-navy"
                  : "border-border",
              )}
            >
              {l}
              {!bodies[l].trim() && (
                <span
                  className="size-1.5 rounded-full bg-warning"
                  aria-label={fill(c.tpl.missing, { l: l.toUpperCase() })}
                />
              )}
            </button>
          ))}
        </div>
        <label htmlFor="tpl-body"className="sr-only">
          {`${c.tpl.body} (${lang.toUpperCase()})`}
        </label>
        <Textarea
          id="tpl-body"
          ref={box}
          rows={5}
          value={bodies[lang]}
          onChange={(e) => setBodies({ ...bodies, [lang]: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2 text-small">
          <span className="text-fg-muted">{c.tpl.vars}:</span>
          {VARS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVar(v)}
              className="h-7 bg-tint px-2.5 font-mono text-eyebrow text-navy-800 m-press"
            >
              {`{${v}}`}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1">
        <p className="text-eyebrow text-fg-muted">
          {c.tpl.preview} · {c.tpl.sample}
        </p>
        <div
          aria-live="polite"
          className="bg-bg-subtle/60 p-3 text-small whitespace-pre-line"
        >
          {bodies[lang].trim() ? (
            fillVars(bodies[lang], SAMPLE, lang)
          ) : (
            <span className="text-fg-subtle">
              {fill(c.tpl.missing, { l: lang.toUpperCase() })}
            </span>
          )}
        </div>
      </div>
      {err && (
        <p role="alert"className="text-small text-danger">
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} dots>
          {c.tpl.save}
        </Button>
        {useHref && (
          <Link href={useHref} className={buttonClass({ variant: "primary" })}>
            {c.tpl.use}
          </Link>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            className="ml-auto text-danger"
            onClick={onDelete}
          >
            {c.tpl.delete}
          </Button>
        )}
      </div>
    </form>
  );
}

export function OutboxPanel() {
  const { c, locale } = useIC();
  const { wsHref } = useWs();
  const items = useOutbox();
  const online = useOnline();
  const n = pendingCount(items);
  return (
    <section
      aria-label={c.out.title}
      className={cx(
        "grid gap-3 border p-4 sm:p-5",
        n && !online
          ? "border-danger/25 bg-danger-bg/50"
          : "border-border bg-white",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid min-w-0 flex-1">
          <span className="text-label-lg">
            {online ? c.out.title : c.out.offlineTitle}
          </span>
          <span role="status"className="text-small text-fg-muted">
            {fill(c.out.pending, { n })}
          </span>
        </span>
        <CountBadge n={n} tone="attention" />
        <Button
          size="sm"
          variant="primary"
          disabled={!n}
          onClick={() => void retryAll()}
        >
          <Icon name="refresh" size={14} aria-hidden />
          {c.out.retryAll}
        </Button>
      </div>
      {!online && <p className="text-small text-warning">{c.out.offline}</p>}
      {items.length ? (
        <ul className="grid gap-2">
          {items.map((i) => (
            <li
              key={i.id}
              data-outbox={i.state}
              className="flex flex-wrap items-center gap-2 border border-border bg-white px-3 py-2 text-small m-rise"
            >
              <Icon
                name={
                  i.state === "failed"
                    ? "x"
                    : i.state === "sent"
                      ? "check"
                      : "clock"
                }
                size={14}
                aria-hidden
                className={
                  i.state === "failed" ? "text-danger" : "text-fg-muted"
                }
              />
              <span className="font-medium">{c.out[i.state]}</span>
              <span className="text-fg-muted">{i.ref}</span>
              {i.body.lane === "internal" && (
                <Icon
                  name="lock"
                  size={12}
                  aria-label={c.compose.internal}
                  className="text-warning"
                />
              )}
              <span className="min-w-0 flex-1 truncate">
                {i.body.body || c.voice.note}
              </span>
              <time
                className="text-eyebrow text-fg-subtle tabular"
                dateTime={i.at}
              >
                {formatDate(i.at, locale, { timeStyle: "short" })}
              </time>
              {(i.state === "failed" || i.state === "queued") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => void retry(i.id)}
                >
                  {c.out.retry}
                </Button>
              )}
              {i.state === "failed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => discard(i.id)}
                >
                  {c.out.discard}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanel compact title={c.out.empty} />
      )}
    </section>
  );
}

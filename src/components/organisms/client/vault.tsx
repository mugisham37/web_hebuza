"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { c3Copy, fill } from "@/content/pages/c3";
import { Button, buttonClass } from "@/components/atoms/button";
import { Tabs } from "@/components/atoms/tabs";
import { Sheet, Dialog } from "@/components/atoms/dialog";
import { Badge } from "@/components/atoms/tag";
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Spinner,
} from "@/components/atoms/feedback";
import { Field, Input, Select, DateInput } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { HighlightWord } from "@/components/atoms/brand";
import { Segmented } from "@/components/atoms/inputs";
import { useToast } from "@/components/atoms/toast";
import { Deliverables } from "@/components/organisms/client/deliverables";
import { PreviewDialog } from "@/components/organisms/client/document-preview";
import { daysUntil, kb, REF, uploadLibraryDoc, type LibDoc } from "@/components/molecules/client/api";

const KEY = ["c3", "docs"];
const KINDS = ["identity", "company", "tax", "certificate"];
const CLOSED = ["completed", "closed", "cancelled", "rejected"];
const dl = (id: string) => `/api/me/documents/${id}/download`;

/** /documents: Library (C10) + "From HEBUZA" deliverables (C09), tab kept in ?tab= so links can deep-link. */
export function DocumentsPage() {
  const { locale } = useI18n();
  const c = c3Copy(locale).docs;
  const router = useRouter();
  const path = usePathname();
  const tab =
    useSearchParams().get("tab") === "deliverables"
      ? "deliverables"
      : "library";
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-fg-heading text-h2">
          {c.title} <HighlightWord>{c.titleHi}</HighlightWord>
        </h1>
        <p className="mt-2 text-lead">
          {tab === "library" ? c.lede : c3Copy(locale).dlv.lede}
        </p>
      </header>
      <Tabs
        value={tab}
        onChange={(id) =>
          router.replace(id === "library" ? path : `${path}?tab=${id}`, {
            scroll: false,
          })
        }
        tabs={[
          { id: "library", label: c.tabs.library, content: <Library /> },
          {
            id: "deliverables",
            label: c.tabs.deliverables,
            content: <Deliverables />,
          },
        ]}
      />
    </div>
  );
}

function ExpiryBadge({ doc }: { doc: LibDoc }) {
  const { locale } = useI18n();
  const c = c3Copy(locale).docs;
  if (!doc.expiresOn) return null;
  const d = daysUntil(doc.expiresOn);
  if (d < 0) return <Badge tone="danger">{c.expired}</Badge>;
  if (d <= 30)
    return (
      <Badge tone="warning">
        <Icon name="clock" size={14} aria-hidden />
        {fill(c.expiresIn, { n: d })}
      </Badge>
    );
  return null;
}

const expiringSoon = (d: LibDoc) =>
  !!d.expiresOn && daysUntil(d.expiresOn) >= 0 && daysUntil(d.expiresOn) <= 30;

function Library() {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const q = useQuery({
    queryKey: KEY,
    queryFn: () =>
      unwrap<{ documents: LibDoc[] }>(api.GET("/api/me/documents")).then(
        (d) => d.documents as LibDoc[],
      ),
  });
  const [cat, setCat] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const docs = useMemo(() => q.data ?? [], [q.data]);
  const kindOf = (d: LibDoc) =>
    d.kind && KINDS.includes(d.kind) ? d.kind : "other";

  const shown = docs.filter(
    (d) =>
      (cat === "all" ||
        (cat === "expiring" ? expiringSoon(d) : kindOf(d) === cat)) &&
      `${d.label ?? ""} ${d.originalFilename}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const cats = [
    { id: "all", label: c.docs.all, n: docs.length },
    ...[...KINDS, "other"]
      .map((k) => ({
        id: k,
        label: c.docs.kinds[k] ?? c.docs.other,
        n: docs.filter((d) => kindOf(d) === k).length,
      }))
      .filter((x) => x.n),
  ];
  const soon = docs.filter(expiringSoon).length;
  const open = docs.find((d) => d.documentId === openId) ?? null;

  if (q.error)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav data-guide="client-docs-cats" aria-label={c.docs.categories} className="min-w-0">
        <h2 className="text-fg-heading mb-3 hidden text-card-title lg:block">
          {c.docs.categories}
        </h2>
        <ul className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 lg:mx-0 lg:flex-col lg:px-0">
          {cats.map((x) => (
            <li key={x.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={cat === x.id}
                onClick={() => setCat(x.id)}
                className={cx(
                  "flex h-10 w-full items-center justify-between gap-4 px-4 text-button",
                  cat === x.id
                    ? "bg-secondary text-on-secondary"
                    : "bg-surface hover:bg-navy-50 lg:bg-transparent",
                )}
              >
                {x.label}
                <span className="text-small text-fg-subtle">{x.n}</span>
              </button>
            </li>
          ))}
          {soon > 0 && (
            <li className="shrink-0 lg:mt-3">
              <button
                type="button"
                data-guide="client-docs-expiring"
                aria-pressed={cat === "expiring"}
                onClick={() => setCat("expiring")}
                className={cx(
                  "flex h-10 w-full items-center gap-2 px-4 text-button",
                  cat === "expiring" ? "bg-danger text-white" : "bg-gold-400 text-on-gold",
                )}
              >
                <Icon name="clock" size={16} aria-hidden />
                {c.docs.expiringSoon} ({soon})
              </button>
            </li>
          )}
        </ul>
      </nav>

      <div className="grid min-w-0 content-start gap-4">
        <div data-guide="client-docs-toolbar" className="flex flex-wrap items-center gap-3">
          <Segmented
            label={c.docs.view}
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: c.docs.grid },
              { value: "list", label: c.docs.list },
            ]}
          />
          <label data-guide="client-docs-search" className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">{c.common.search}</span>
            <Icon
              name="search"
              size={18}
              aria-hidden
              className="absolute top-1/2 left-4 -translate-y-1/2 text-fg-subtle"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={c.docs.searchPh}
              className="h-11 w-full border border-border bg-surface pr-4 pl-11 text-body focus:border-secondary focus:outline-none"
            />
          </label>
          <Button dots data-guide="vault-upload" onClick={() => setUploading(true)}>
            {c.docs.upload}
          </Button>
        </div>

        {q.isPending ? (
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4"
            aria-busy
          >
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-60 " />
            ))}
          </div>
        ) : !docs.length ? (
          <EmptyState
            title={c.docs.emptyTitle}
            body={c.docs.emptyBody}
            action={
              <Button dots onClick={() => setUploading(true)}>
                {c.docs.upload}
              </Button>
            }
          />
        ) : !shown.length ? (
          <EmptyState body={c.docs.noMatch} />
        ) : view === "grid" ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
            {shown.map((d) => (
              <li key={d.documentId}>
                <button
                  data-guide="client-docs-item"
                  type="button"
                  onClick={() => setOpenId(d.documentId)}
                  className="group grid h-full w-full content-start gap-3 border border-border bg-surface p-4 text-left transition-colors hover:border-navy-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span
                    aria-hidden
                    className="grid h-28 place-items-center bg-bg-subtle text-fg-subtle group-hover:bg-bg-tint"
                  >
                    <Icon name="file" size={36} />
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <ExpiryBadge doc={d} />
                  </span>
                  <span className="text-card-title break-words">
                    {d.label || d.originalFilename}
                  </span>
                  <span className="text-small text-fg-subtle">
                    {c.docs.kinds[kindOf(d)] ?? c.docs.other}
                  </span>
                  <span className="mt-auto flex items-center gap-2 text-small text-fg-subtle">
                    <Icon name="calendar" size={14} aria-hidden />
                    {fill(c.docs.uploaded, {
                      date: formatDate(d.createdAt, locale),
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border border border-border bg-surface">
            {shown.map((d) => (
              <li key={d.documentId}>
                <button
                  type="button"
                  onClick={() => setOpenId(d.documentId)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left hover:bg-navy-50"
                >
                  <Icon name="file" aria-hidden className="text-fg-subtle" />
                  <span className="min-w-0 flex-1 basis-40 font-medium break-words">
                    {d.label || d.originalFilename}
                  </span>
                  <ExpiryBadge doc={d} />
                  <span className="text-small text-fg-subtle">
                    {c.docs.kinds[kindOf(d)] ?? c.docs.other} ·{" "}
                    {kb(d.fileSizeBytes)} · {formatDate(d.createdAt, locale)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <UploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        docs={docs}
        onView={(id) => {
          setUploading(false);
          setOpenId(id);
        }}
      />
      <DocDrawer doc={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

type UpState =
  | { s: "idle" }
  | { s: "uploading"; name: string }
  | { s: "duplicate"; file: File; match?: LibDoc }
  | { s: "done"; id: string }
  | { s: "error" };

function UploadDialog({
  open,
  onClose,
  docs,
  onView,
}: {
  open: boolean;
  onClose: () => void;
  docs: LibDoc[];
  onView: (id: string) => void;
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const qc = useQueryClient();
  const [st, setSt] = useState<UpState>({ s: "idle" });
  const [kind, setKind] = useState("");
  const [label, setLabel] = useState("");
  const close = () => {
    setSt({ s: "idle" });
    setLabel("");
    onClose();
  };

  async function send(file: File, allowDuplicate = false) {
    setSt({ s: "uploading", name: file.name });
    try {
      const doc = await uploadLibraryDoc(file, { label: label.trim() || null, kind: kind || null, allowDuplicate });
      await qc.invalidateQueries({ queryKey: KEY });
      setSt({ s: "done", id: doc.documentId });
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.status === 409 || e.errorType === "duplicate")
      )
        return setSt({
          s: "duplicate",
          file,
          match: docs.find((d) => d.originalFilename === file.name),
        });
      setSt({ s: "error" });
    }
  }

  return (
    <Dialog open={open} onClose={close} title={c.docs.drop.title}>
      <div aria-live="polite" className="grid gap-4">
        {st.s === "uploading" ? (
          <div className="grid place-items-center gap-3 bg-bg-tint p-8 text-center">
            <Spinner label={fill(c.docs.drop.uploading, { name: st.name })} />
            <p className="break-all">
              {fill(c.docs.drop.uploading, { name: st.name })}
            </p>
          </div>
        ) : st.s === "duplicate" ? (
          <div className="grid gap-3 bg-danger-bg p-5">
            <p className="text-card-title text-danger">
              {c.docs.drop.dupTitle}
            </p>
            <p>{c.docs.drop.dupBody}</p>
            <p className="font-medium break-words">
              {st.match
                ? `${st.match.label || st.match.originalFilename} · ${fill(c.docs.uploaded, { date: formatDate(st.match.createdAt, locale) })}`
                : st.file.name}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => send(st.file, true)}>
                {c.docs.drop.keep}
              </Button>
              <Button variant="outline" onClick={() => setSt({ s: "idle" })}>
                {c.common.cancel}
              </Button>
            </div>
          </div>
        ) : st.s === "done" ? (
          <div className="grid justify-items-center gap-3 bg-success-bg p-6 text-center">
            <span className="grid size-12 place-items-center bg-success text-white">
              <Icon name="check" aria-hidden />
            </span>
            <p className="text-card-title">{c.docs.drop.doneTitle}</p>
            <p>{c.docs.drop.doneBody}</p>
            <Button dots onClick={() => onView(st.id)}>
              {c.docs.drop.viewDoc}
            </Button>
            <button
              type="button"
              className="text-button underline underline-offset-4"
              onClick={() => setSt({ s: "idle" })}
            >
              {c.docs.drop.another}
            </button>
          </div>
        ) : (
          <>
            {st.s === "error" && (
              <p
                role="alert"
                className="bg-danger-bg px-4 py-3 text-danger"
              >
                {c.docs.drop.failed}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={c.docs.drop.label}>
                {({ id }) => (
                  <Input
                    id={id}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={120}
                  />
                )}
              </Field>
              <Field label={c.docs.drop.kind}>
                {({ id }) => (
                  <Select
                    id={id}
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="">{c.docs.other}</option>
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {c.docs.kinds[k]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <FileDrop
              camera
              maxSizeMb={10}
              accept="application/pdf,image/jpeg,image/png,image/heic,.docx,.xlsx"
              onFiles={(f) => f[0] && send(f[0])}
            />
            <p data-guide="client-docs-hint" className="text-small text-fg-subtle">{c.docs.drop.hint}</p>
          </>
        )}
      </div>
    </Dialog>
  );
}

function DocDrawer({
  doc,
  onClose,
}: {
  doc: LibDoc | null;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const d = c.docs.drawer;
  const qc = useQueryClient();
  const toast = useToast();
  const [preview, setPreview] = useState<{
    name: string;
    mime: string;
    src: string;
    downloadHref: string;
  } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [ref, setRef] = useState("");
  const [refErr, setRefErr] = useState<string>();
  const [expiry, setExpiry] = useState<string | null>(null);
  const done = () => qc.invalidateQueries({ queryKey: KEY });

  const share = useMutation({
    mutationFn: (code: string) =>
      unwrap(api.POST("/api/me/documents/{id}/attach", { params: { path: { id: doc!.documentId } }, body: { code } })),
    onSuccess: (_, code) => {
      toast({ title: fill(d.shared, { ref: code }), tone: "success" });
      setRef("");
      done();
    },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });
  const saveExpiry = useMutation({
    mutationFn: (expiresOn: string | null) =>
      unwrap(api.PATCH("/api/me/documents/{id}", { params: { path: { id: doc!.documentId } }, body: { expiresOn } })),
    onSuccess: () => {
      toast({ title: d.expirySaved, tone: "success" });
      done();
    },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });
  const del = useMutation({
    mutationFn: () =>
      unwrap(api.DELETE("/api/me/documents/{id}", { params: { path: { id: doc!.documentId } } })),
    onSuccess: () => {
      setConfirm(false);
      onClose();
      toast({ title: d.deleted, tone: "success" });
      done();
    },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });

  const restore = useMutation({
    mutationFn: (v: number) => unwrap(api.POST("/api/me/documents/{id}/versions/{v}/restore", { params: { path: { id: doc!.documentId, v: String(v) } } })),
    onSuccess: () => { toast({ title: d.restored, tone: "success" }); done(); },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });
  if (!doc) return <Sheet open={false} onClose={onClose} title="" />;
  const name = doc.label || doc.originalFilename;
  const versions = [...(doc.versions ?? [])].sort(
    (a, b) => b.version - a.version,
  );
  const locked = (doc.usedIn ?? []).some((u) => !CLOSED.includes(u.status));
  const expiryVal = expiry ?? doc.expiresOn ?? "";

  return (
    <>
      <Sheet
        open
        onClose={() => {
          setExpiry(null);
          onClose();
        }}
        title={name}
        description={<ExpiryBadge doc={doc} />}
      >
        <Tabs
          tabs={[
            {
              id: "versions",
              label: d.versions,
              content: (
                <ol className="grid gap-4 border-l border-border pl-5">
                  {versions.map((v, i) => (
                    <li key={v.version} className="relative grid gap-2">
                      <span
                        aria-hidden
                        className={cx(
                          "absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full",
                          i ? "bg-ink-300" : "bg-secondary",
                        )}
                      />
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {fill(c.common.version, { n: v.version })}
                        {i === 0 && <Badge tone="success">{d.latest}</Badge>}
                      </p>
                      <p className="text-small text-fg-subtle">
                        {formatDateTime(v.uploadedAt, locale)} ·{" "}
                        {kb(v.fileSizeBytes)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPreview({
                              name: `${name} · v${v.version}`,
                              mime: v.mimeType,
                              src: `${dl(doc.documentId)}?version=${v.version}&inline=1`,
                              downloadHref: `${dl(doc.documentId)}?version=${v.version}`,
                            })
                          }
                        >
                          {c.common.preview}
                        </Button>
                        {i > 0 && (
                          <Button size="sm" variant="ghost" loading={restore.isPending && restore.variables === v.version} onClick={() => restore.mutate(v.version)}>
                            {d.restore}
                          </Button>
                        )}
                        {i === 0 && (
                          <a
                            href={dl(doc.documentId)}
                            download
                            className={buttonClass({ size: "sm" })}
                          >
                            {c.common.download}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ),
            },
            {
              id: "used",
              label: d.used,
              count: doc.usedIn?.length,
              content: doc.usedIn?.length ? (
                <ul className="grid gap-2">
                  {doc.usedIn.map((u) => (
                    <li
                      key={u.applicationDocumentId}
                      className="flex flex-wrap items-center justify-between gap-2 bg-bg-subtle p-3"
                    >
                      <span>
                        <span className="font-medium">{u.code}</span> ·{" "}
                        {u.serviceName}
                      </span>
                      <Badge>{fill(c.common.version, { n: u.version })}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-fg-subtle">{d.notUsed}</p>
              ),
            },
            {
              id: "share",
              label: d.share,
              content: (
                <form
                  noValidate
                  className="grid gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const code = ref.trim().toUpperCase();
                    if (!REF.test(code)) return setRefErr(d.badRef);
                    setRefErr(undefined);
                    share.mutate(code);
                  }}
                >
                  <p className="text-card-title">{d.shareTitle}</p>
                  <Field label={d.shareRef} hint={d.shareHint} error={refErr}>
                    {({ id, describedBy, invalid }) => (
                      <Input
                        id={id}
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        autoCapitalize="characters"
                      />
                    )}
                  </Field>
                  <Button
                    type="submit"
                    loading={share.isPending}
                    className="justify-self-start"
                  >
                    {d.shareCta}
                  </Button>
                </form>
              ),
            },
          ]}
        />

        <form
          className="mt-6 grid gap-3 border-t border-border pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveExpiry.mutate(expiryVal || null);
          }}
          data-guide="client-docs-expiry"
        >
          <Field label={d.expiry} hint={d.expiryHint}>
            {({ id, describedBy }) => (
              <DateInput
                id={id}
                value={expiryVal}
                onChange={(e) => setExpiry(e.target.value)}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={saveExpiry.isPending}
            disabled={expiryVal === (doc.expiresOn ?? "")}
            className="justify-self-start"
          >
            {d.saveExpiry}
          </Button>
        </form>

        <div className="mt-6 grid gap-2 border-t border-border pt-5">
          <Button
            data-guide="client-docs-delete"
            variant="outline"
            disabled={locked}
            onClick={() => setConfirm(true)}
            className="justify-self-start text-danger"
          >
            {d.delete}
          </Button>
          {locked && (
            <p className="text-small text-fg-subtle">{d.lockedDelete}</p>
          )}
        </div>
      </Sheet>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={d.deleteTitle}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {c.common.cancel}
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() => del.mutate()}
            >
              {d.deleteCta}
            </Button>
          </>
        }
      >
        <p>{fill(d.deleteBody, { name })}</p>
      </Dialog>
      <PreviewDialog file={preview} onClose={() => setPreview(null)} />
    </>
  );
}

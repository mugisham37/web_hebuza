"use client";
// CT2 document viewer: thumbnail rail, zoom / rotate / page, pre-check panel, accept / reject (with reason) + undo.
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { opsCase, fill } from "@/content/pages/ops-case";
import {
  DocTile,
  ReasonDialog,
  EmptyPanel,
  PanelError,
} from "@/components/molecules/ops/ops";
import { Kbd } from "@/components/atoms/ops";
import { Button } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useDocDecision, type CaseRecord, type DocVM } from "@/lib/ops/b";
import type { useRecord } from "@/lib/ops/b";

const ZOOMS = [50, 75, 100, 125, 150, 200];

export function DocViewer({
  refId,
  rec,
  clientName,
  selected,
  onSelect,
  locked,
  onRequest,
  readOnly,
}: {
  refId: string;
  rec: ReturnType<typeof useRecord>;
  clientName: string;
  selected: string | null;
  onSelect: (id: string) => void;
  locked: boolean;
  onRequest: () => void;
  /** Hide the manager's precheck decision buttons (agent workbench has its own QC actions). */
  readOnly?: boolean;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).docs;
  const docs: DocVM[] = (rec.data as CaseRecord | undefined)?.docs ?? [];
  const i = Math.max(
    0,
    docs.findIndex((d) => d.id === selected),
  );
  const doc = docs[i];
  useShortcut(
    "j",
    t.next,
    () => docs.length && onSelect(docs[(i + 1) % docs.length].id),
    "case",
  );
  useShortcut(
    "k",
    t.prev,
    () => docs.length && onSelect(docs[(i - 1 + docs.length) % docs.length].id),
    "case",
  );
  if (rec.isPending)
    return (
      <div className="grid gap-4 lg:grid-cols-[13rem_1fr_18rem]">
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  if (rec.isError)
    return <PanelError what={t.rail} onRetry={() => rec.refetch()} />;
  if (!doc)
    return (
      <EmptyPanel
        title={t.empty}
        body={t.emptyBody}
        action={
          <Button size="sm" onClick={onRequest} disabled={locked}>
            {opsCase(locale).triage.requestMissing}
          </Button>
        }
      />
    );
  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_18rem]">
      <nav data-guide="ops-doc-rail"
        aria-label={t.rail}
        className="max-lg:-mx-1 max-lg:overflow-x-auto max-lg:px-1"
      >
        <ul className="flex gap-2 lg:grid">
          {docs.map((d) => (
            <li key={d.id} className="max-lg:w-56 max-lg:shrink-0">
              <DocTile
                name={d.label}
                kind={d.kind}
                checks={d.checks}
                state={d.state}
                selected={d.id === doc.id}
                onOpen={() => onSelect(d.id)}
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 hidden text-eyebrow text-fg-subtle lg:block">
          <Kbd>J</Kbd>/<Kbd>K</Kbd> {opsCase(locale).kbd.docs}
        </p>
      </nav>
      <Preview key={doc.id} doc={doc} refId={refId} />
      <Precheck
        refId={refId}
        doc={doc}
        clientName={clientName}
        locked={locked}
        readOnly={readOnly}
      />
    </div>
  );
}

function Preview({ doc, refId }: { doc: DocVM; refId: string }) {
  const { locale } = useI18n();
  const t = opsCase(locale).docs;
  const [zoom, setZoom] = useState(100);
  const [rot, setRot] = useState(0);
  const [page, setPage] = useState(1);
  const zi = ZOOMS.indexOf(zoom);
  const tool =
    "flex size-9 items-center justify-center border border-border-strong bg-white hover:bg-navy-50 disabled:opacity-40";
  return (
    <section
      aria-label={doc.label}
      className="grid min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden border border-border bg-white"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2.5">
        <button
          type="button"
          className={tool}
          aria-label={t.zoomOut}
          disabled={zi <= 0}
          onClick={() => setZoom(ZOOMS[zi - 1])}
        >
          <Icon name="minus" size={16} aria-hidden />
        </button>
        <output
          className="w-12 text-center text-small tabular"
          aria-live="polite"
        >
          {zoom}%
        </output>
        <button data-guide="ops-doc-zoom"
          type="button"
          className={tool}
          aria-label={t.zoomIn}
          disabled={zi >= ZOOMS.length - 1}
          onClick={() => setZoom(ZOOMS[zi + 1])}
        >
          <Icon name="plus" size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={tool}
          aria-label={t.rotate}
          onClick={() => setRot((r) => (r + 90) % 360)}
        >
          <Icon name="refresh" size={16} aria-hidden />
        </button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setZoom(100);
            setRot(0);
          }}
        >
          {t.reset}
        </Button>
        {doc.pages > 1 && (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              className={tool}
              aria-label={t.prev}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <Icon
                name="arrowRight"
                size={16}
                className="rotate-180"
                aria-hidden
              />
            </button>
            <span className="text-small tabular">
              {fill(t.page, { p: page, n: doc.pages })}
            </span>
            <button
              type="button"
              className={tool}
              aria-label={t.next}
              disabled={page >= doc.pages}
              onClick={() => setPage(page + 1)}
            >
              <Icon name="arrowRight" size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label={t.scan}
        className="grid min-h-80 place-items-center overflow-auto bg-bg-subtle p-6 lg:min-h-[28rem]"
      >
        <div
          className="origin-center transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100}) rotate(${rot}deg)` }}
        >
          {/* Real file through the audited staff route (302 to a short-lived signed URL). */}
          {doc.kind === "pdf" ? (
            <iframe
              title={doc.label}
              src={`/api/admin/applications/${encodeURIComponent(refId)}/documents/${encodeURIComponent(doc.id)}/file#page=${page}`}
              className="h-[32rem] w-[min(40rem,80vw)] border border-border-strong bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL; next/image can't optimise it
            <img
              alt={doc.label}
              src={`/api/admin/applications/${encodeURIComponent(refId)}/documents/${encodeURIComponent(doc.id)}/file`}
              className="max-h-[32rem] max-w-[min(40rem,80vw)] border border-border-strong bg-white object-contain"
            />
          )}
        </div>
      </div>
      <p className="border-t border-border px-3 py-2 text-eyebrow text-fg-subtle">
        {fill(t.uploaded, { t: formatDateTime(doc.uploadedAt, locale) })}
      </p>
    </section>
  );
}

const REJECT = [
  "blurry",
  "expired",
  "wrong",
  "mismatch",
  "incomplete",
] as const;
function Precheck({
  refId,
  doc,
  clientName,
  locked,
  readOnly,
}: {
  refId: string;
  doc: DocVM;
  clientName: string;
  locked: boolean;
  readOnly?: boolean;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).docs;
  const dec = useDocDecision();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const nameOk = doc.nameOnDoc === clientName;
  const rows = [
    {
      ok: doc.legibility >= 80,
      text: fill(t.legibility, { n: doc.legibility }),
    },
    {
      ok: true,
      text: doc.expiry
        ? fill(t.expiry, { d: formatDate(doc.expiry, locale) })
        : t.noExpiry,
    },
    {
      ok: nameOk,
      text: nameOk
        ? fill(t.nameMatch, { n: clientName })
        : fill(t.nameMismatch, { d: doc.nameOnDoc, n: clientName }),
    },
    { ok: true, text: fill(t.type, { t: doc.typeDetected }) },
  ];
  const decide = (decision: "accepted" | "rejected", reason?: string) =>
    dec.mutateAsync({ ref: refId, docId: doc.id, decision, reason }).then(() =>
      toast({
        title: fill(
          decision === "accepted" ? t.acceptedToast : t.rejectedToast,
          { d: doc.label },
        ),
        tone: "success",
        action: {
          label: t.undo,
          onClick: () =>
            dec.mutate({ ref: refId, docId: doc.id, decision: doc.state }),
        },
      }),
    );
  return (
    <section
      aria-labelledby="pc-h"
      className="grid content-start gap-3 border border-border bg-white p-4"
    >
      <h2 data-guide="ops-precheck" id="pc-h" className="text-label-lg">
        {t.precheck}
      </h2>
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li key={r.text} className="flex items-start gap-2 text-small">
            <span
              className={cx(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                r.ok
                  ? "bg-success-bg text-success"
                  : "bg-danger-bg text-danger",
              )}
            >
              <Icon name={r.ok ? "check" : "x"} size={12} aria-hidden />
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      {doc.state && (
        <p
          role="status"
          className={cx(
            "px-3 py-2 text-small font-medium",
            doc.state === "accepted"
              ? "bg-success-bg text-success"
              : "bg-danger-bg text-danger",
          )}
        >
          {doc.state === "accepted"
            ? t.accepted
            : fill(t.rejected, { r: doc.reason ?? "" })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2" hidden={readOnly}>
        <Button data-guide="ops-doc-accept"
          className="justify-center max-sm:h-12"
          disabled={locked || doc.state === "accepted"}
          loading={dec.isPending && dec.variables?.decision === "accepted"}
          onClick={() =>
            decide("accepted").catch((e) =>
              toast({ title: errorCopy(e, locale), tone: "danger" }),
            )
          }
        >
          <Icon name="check" size={16} aria-hidden />
          {t.accept}
        </Button>
        <Button data-guide="ops-doc-reject"
          variant="outline"
          className="justify-center max-sm:h-12"
          disabled={locked}
          onClick={() => setRejecting(true)}
        >
          <Icon name="x" size={16} aria-hidden />
          {t.reject}
        </Button>
      </div>
      <ReasonDialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={t.rejectTitle}
        description={doc.label}
        asRadios
        options={REJECT.map((r) => ({
          value: t.rejectReasons[r],
          label: t.rejectReasons[r],
        }))}
        noteLabel={t.noteToClient}
        notePlaceholder={t.notePh}
        confirmLabel={t.reject}
        destructive
        audited
        onConfirm={({ reason, note }) =>
          decide("rejected", note ? `${reason}, ${note}` : reason)
        }
      />
    </section>
  );
}

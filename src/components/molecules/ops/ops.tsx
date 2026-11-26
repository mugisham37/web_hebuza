"use client";
// Stage 3 staff molecules (board 01 v2: K2, K4–K6, K8). Built on ui/* primitives; no business logic here.
import { ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { opsCommon } from "@/content/pages/ops-common";
import {
  Kbd,
  Sparkline,
  PrecheckBadge,
  LockLabel,
  type Precheck,
} from "@/components/atoms/ops";

const useC = () => opsCommon(useI18n().locale);

// ---------------------------------------------------------------- K5 filters, views, bulk
export type FilterChip = { key: string; label: string; onRemove: () => void };
/** Search + active filter chips + "Add filter" + "Clear all". Search is debounced by the caller via onSearch. */
export function FilterBar({
  search,
  onSearch,
  placeholder,
  chips,
  addFilter,
  right,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  chips: FilterChip[];
  addFilter?: ReactNode;
  right?: ReactNode;
}) {
  const c = useC();
  return (
    <div data-guide="ops-filterbar" className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-0 flex-1 basis-72 sm:min-w-72 sm:max-w-96">
        <span className="sr-only">{placeholder}</span>
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <input data-guide="ops-search"
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full border border-border-strong bg-surface pr-14 pl-10 text-small placeholder:text-fg-subtle focus:border-focus focus:outline-none"
        />
        <Kbd className="absolute top-1/2 right-3 -translate-y-1/2">/</Kbd>
      </label>
      {chips.map((f) => (
        <span
          key={f.key}
          className="inline-flex h-8 items-center gap-1 bg-bg-tint pr-1 pl-3 text-small text-link"
        >
          {f.label}
          <button
            type="button"
            onClick={f.onRemove}
            aria-label={`${c.clear}: ${f.label}`}
            className="flex size-6 items-center justify-center hover:bg-white/60"
          >
            <Icon name="x" size={12} />
          </button>
        </span>
      ))}
      {addFilter}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => chips.forEach((f) => f.onRemove())}
          className="text-small text-fg-muted underline underline-offset-4 hover:text-fg"
        >
          {c.clearAll}
        </button>
      )}
      {right && <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">{right}</div>}
    </div>
  );
}

/** Popover listing options as toggles (used for "Add filter" fields and multi-selects). Closes on Esc / outside click. */
export function MenuButton({
  label,
  icon,
  children,
  align = "left",
  active,
}: {
  label: ReactNode;
  icon?: IconName;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "inline-flex h-8 items-center gap-1.5 border px-3 text-small transition-colors",
          active
            ? "border-secondary bg-bg-tint text-link"
            : "border-border-strong bg-surface hover:border-secondary/40",
        )}
      >
        {icon && <Icon name={icon} size={14} aria-hidden />}
        {label}
        <Icon
          name="chevronDown"
          size={14}
          aria-hidden
          className={cx("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          id={id}
          className={cx(
            "absolute top-full z-40 mt-2 min-w-56 m-pop border border-border bg-surface p-1.5 shadow-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
export function MenuCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 text-small hover:bg-bg-subtle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-secondary"
      />
      {children}
    </label>
  );
}

/** Saved views as tabs with counts; the active one is underlined. Uses buttons with aria-pressed (URL owns state). */
export function SavedViewTabs({
  views,
  active,
  onChange,
  extra,
}: {
  views: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (k: string) => void;
  extra?: ReactNode;
}) {
  return (
    <div data-guide="ops-views"
      className="no-scrollbar -mx-gutter flex items-end gap-1 overflow-x-auto border-b border-border px-gutter sm:mx-0 sm:px-0"
      role="toolbar"
      aria-label="Views"
    >
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          aria-pressed={active === v.key}
          onClick={() => onChange(v.key)}
          className={cx(
            "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-small whitespace-nowrap transition-colors",
            active === v.key
              ? "border-secondary font-medium text-fg"
              : "border-transparent text-fg-muted hover:text-fg",
          )}
        >
          {v.label}
          {v.count !== undefined && (
            <span
              className={cx(
                "px-1.5 text-[0.75rem] tabular",
                active === v.key ? "bg-secondary text-on-navy" : "bg-ink-100",
              )}
            >
              {v.count}
            </span>
          )}
        </button>
      ))}
      {extra}
    </div>
  );
}

/** Floating navy bulk bar (appears with a selection). */
export function BulkBar({
  count,
  onClear,
  children,
  selectAll,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
  selectAll?: ReactNode;
}) {
  const c = useC();
  if (!count) return null;
  return (
    <div data-guide="ops-bulkbar"
      role="toolbar"
      aria-label={c.selected.replace("{n}", String(count))}
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 mx-auto flex max-w-3xl m-rise flex-wrap items-center gap-2 theme-dark bg-bg px-4 py-3 text-fg shadow-lg lg:bottom-6"
    >
      <span className="inline-flex h-8 items-center bg-primary px-3 text-label text-on-gold tabular">
        {c.selected.replace("{n}", String(count))}
      </span>
      {selectAll}
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {children}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="h-8 px-3 text-small text-fg-muted hover:bg-white/10 hover:text-fg"
      >
        {c.clear}
      </button>
    </div>
  );
}
export function BulkAction({
  onClick,
  children,
  icon,
}: {
  onClick: () => void;
  children: ReactNode;
  icon?: IconName;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 px-3 text-small hover:bg-white/10"
    >
      {icon && <Icon name={icon} size={14} aria-hidden />}
      {children}
    </button>
  );
}

export type Density = "comfortable" | "compact";
export function DensityToggle({
  value,
  onChange,
}: {
  value: Density;
  onChange: (d: Density) => void;
}) {
  const c = useC().density;
  return (
    <div data-guide="ops-density"
      role="radiogroup"
      aria-label={c.label}
      className="inline-flex h-8 border border-border-strong bg-surface p-0.5"
    >
      {(["comfortable", "compact"] as const).map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          onClick={() => onChange(d)}
          title={c[d]}
          className={cx(
            "inline-flex w-9 items-center justify-center transition-colors",
            value === d ? "bg-secondary text-on-navy" : "text-fg-muted hover:text-fg",
          )}
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          >
            {d === "comfortable" ? (
              <path d="M4 6h12M4 10h12M4 14h12" />
            ) : (
              <path d="M4 5h12M4 8h12M4 11h12M4 14h12M4 17h12" />
            )}
          </svg>
          <span className="sr-only">{c[d]}</span>
        </button>
      ))}
    </div>
  );
}

/** Column visibility + order. Order changes with ↑/↓ buttons (keyboard-friendly; no drag dependency). */
export function ColumnPicker({
  columns,
  visible,
  order,
  onChange,
}: {
  columns: { key: string; label: string; locked?: boolean }[];
  visible: string[];
  order: string[];
  onChange: (visible: string[], order: string[]) => void;
}) {
  const c = useC();
  const ordered = order
    .map((k) => columns.find((x) => x.key === k)!)
    .filter(Boolean);
  const move = (i: number, d: -1 | 1) => {
    const o = [...order];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    onChange(visible, o);
  };
  return (
    <MenuButton label={c.columns} icon="layers" align="right">
      {() => (
        <ul className="grid gap-0.5 p-1">
          {ordered.map((col, i) => (
            <li key={col.key} className="flex items-center gap-1">
              <MenuCheck
                checked={visible.includes(col.key)}
                onChange={(v) =>
                  !col.locked &&
                  onChange(
                    v
                      ? [...visible, col.key]
                      : visible.filter((k) => k !== col.key),
                    order,
                  )
                }
              >
                <span className={cx("flex-1", col.locked && "text-fg-subtle")}>
                  {col.label}
                </span>
              </MenuCheck>
              <span className="ml-auto flex">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move ${col.label} up`}
                  className="flex size-7 items-center justify-center text-fg-muted hover:bg-bg-subtle disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === ordered.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move ${col.label} down`}
                  className="flex size-7 items-center justify-center text-fg-muted hover:bg-bg-subtle disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </MenuButton>
  );
}

// ---------------------------------------------------------------- K6 reason dialogs
export type ReasonOption = { value: string; label: string };
/**
 * Generic reason dialog: required reason (select or radio), optional note, extra fields, notice, audit footer.
 * `destructive` styles the confirm button red. Returns the values via onConfirm (async; errors are shown inline).
 */
export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  options,
  asRadios,
  noteLabel,
  notePlaceholder,
  notice,
  extra,
  confirmLabel,
  destructive,
  audited,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  options: ReasonOption[];
  asRadios?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  notice?: ReactNode;
  extra?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  audited?: boolean;
  onConfirm: (v: { reason: string; note: string }) => Promise<void> | void;
}) {
  const { locale } = useI18n();
  const c = opsCommon(locale);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const reset = () => {
    setReason("");
    setNote("");
    setErr(null);
    setBusy(false);
  };
  const submit = async () => {
    if (!reason)
      return setErr(
        locale === "fr"
          ? "Choisissez une raison."
          : locale === "rw"
            ? "Hitamo impamvu."
            : "Choose a reason.",
      );
    setBusy(true);
    setErr(null);
    try {
      await onConfirm({ reason, note: note.trim() });
      reset();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError || !(e instanceof Error) ? errorCopy(e, locale) : e.message); // plain Errors carry our own copy
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={title}
      description={description}
      footer={
        <div className="grid w-full gap-3">
          {audited && (
            <p className="flex items-center gap-1.5 text-eyebrow text-fg-subtle">
              <Icon name="shield" size={12} aria-hidden />
              {c.auditNote}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              {locale === "fr"
                ? "Annuler"
                : locale === "rw"
                  ? "Reka"
                  : "Cancel"}
            </Button>
            <Button
              variant={destructive ? "danger" : "primary"}
              dots={!destructive}
              loading={busy}
              onClick={submit}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <fieldset
          className="grid gap-2"
          aria-invalid={!!err || undefined}
          aria-describedby={err ? `${id}-err` : undefined}
        >
          <legend className="mb-1 text-label">
            {locale === "fr"
              ? "Raison"
              : locale === "rw"
                ? "Impamvu"
                : "Reason"}{" "}
            <span aria-hidden className="text-danger">
              *
            </span>
          </legend>
          {asRadios ? (
            options.map((o) => (
              <label
                key={o.value}
                className={cx(
                  "flex cursor-pointer items-center gap-3 border px-3.5 py-2.5 text-small transition-colors",
                  reason === o.value
                    ? "border-secondary bg-bg-tint"
                    : "border-border hover:border-secondary/30",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-r`}
                  value={o.value}
                  checked={reason === o.value}
                  onChange={() => setReason(o.value)}
                  className="size-4 accent-secondary"
                />
                {o.label}
              </label>
            ))
          ) : (
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11 border border-border-strong bg-surface px-3 text-body focus:border-focus focus:outline-none"
            >
              <option value="" disabled>

              </option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {err && (
            <p
              id={`${id}-err`}
              role="alert"
              className="text-small font-medium text-danger"
            >
              {err}
            </p>
          )}
        </fieldset>
        {extra}
        {noteLabel && (
          <label className="grid gap-1.5">
            <span className="text-label">{noteLabel}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              rows={3}
              maxLength={1000}
              className="border border-border-strong bg-surface px-3 py-2.5 text-body focus:border-focus focus:outline-none"
            />
          </label>
        )}
        {notice}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- K2 split button, copy ref
export function SplitButton({ label, onClick, options, loading }: { label: string; onClick: () => void; options: { label: string; onClick: () => void; hint?: string }[]; loading?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex bg-secondary text-on-navy">
      <Button onClick={onClick} loading={loading} className="pr-4">{label}</Button>
      <span aria-hidden className="my-2 w-px bg-white/25" />
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: more options`} onClick={() => setOpen((o) => !o)}
        className="inline-flex w-10 items-center justify-center hover:bg-secondary-hover">
        <Icon name="chevronDown" size={16} className={cx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul role="menu" className="absolute top-full right-0 z-40 mt-2 grid min-w-60 m-pop gap-0.5 border border-border bg-surface p-1.5 text-fg shadow-md">
          {options.map((o) => <li key={o.label} role="none"><button role="menuitem" type="button" onClick={() => { setOpen(false); o.onClick(); }} className="grid w-full px-3 py-2 text-left text-small hover:bg-bg-subtle">{o.label}{o.hint && <span className="text-eyebrow text-fg-subtle">{o.hint}</span>}</button></li>)}
        </ul>
      )}
    </div>
  );
}

export function CopyRef({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 font-medium tabular",
        className,
      )}
    >
      {value}
      <button
        type="button"
        aria-label={`Copy ${value}`}
        onClick={async () => {
          await navigator.clipboard?.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
        className="flex size-7 items-center justify-center text-fg-subtle hover:bg-ink-100 hover:text-fg"
      >
        <Icon name={done ? "check" : "file"} size={14} aria-hidden />
      </button>
      <span aria-live="polite" className="sr-only">
        {done ? "Copied" : ""}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- K8 documents, timeline, notes
export function DocTile({ name, kind, checks, state, onAccept, onReject, onOpen, selected }: {
  name: string; kind: "pdf" | "image" | "id"; checks: { kind: Precheck; detail?: string }[]; state?: "accepted" | "rejected" | null;
  onAccept?: () => void; onReject?: () => void; onOpen?: () => void; selected?: boolean;
}) {
  return (
    <article className={cx("grid grid-cols-[4rem_1fr] gap-3 border bg-surface p-3 transition-colors", selected ? "border-secondary ring-2 ring-focus/20" : state === "accepted" ? "border-success/40" : state === "rejected" ? "border-danger/40" : "border-border")}>
      <button type="button" onClick={onOpen} className="flex aspect-[3/4] items-center justify-center bg-ink-100 text-fg-muted transition-colors hover:bg-ink-200" aria-label={`Open ${name}`}>
        <Icon name={kind === "pdf" ? "file" : kind === "id" ? "user" : "camera"} size={22} aria-hidden />
      </button>
      <div className="grid min-w-0 content-start gap-1.5">
        <p className="truncate text-small font-medium" title={name}>{name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">{checks.map((ch) => <PrecheckBadge key={ch.kind} kind={ch.kind} detail={ch.detail} />)}</div>
        {(onAccept || onReject) && (
          <div className="mt-1 flex gap-1.5">
            <button type="button" onClick={onAccept} aria-pressed={state === "accepted"} className={cx("inline-flex h-8 items-center gap-1 border px-3 text-small transition-colors", state === "accepted" ? "border-success bg-success text-white" : "border-border-strong hover:border-success hover:text-success")}><Icon name="check" size={14} aria-hidden />Accept</button>
            <button type="button" onClick={onReject} aria-pressed={state === "rejected"} className={cx("inline-flex h-8 items-center gap-1 border px-3 text-small transition-colors", state === "rejected" ? "border-danger bg-danger text-white" : "border-border-strong hover:border-danger hover:text-danger")}><Icon name="x" size={14} aria-hidden />Reject</button>
          </div>
        )}
      </div>
    </article>
  );
}

export type TimelineKind =
  | "status"
  | "document"
  | "assignment"
  | "note"
  | "message"
  | "payment"
  | "system";
const TL_ICON: Record<TimelineKind, IconName> = {
  status: "refresh",
  document: "upload",
  assignment: "user",
  note: "lock",
  message: "message",
  payment: "wallet",
  system: "zap",
};
export function TimelineItem({
  kind,
  title,
  meta,
  actor,
  time,
  last,
  children,
}: {
  kind: TimelineKind;
  title: ReactNode;
  meta?: ReactNode;
  actor?: string;
  time: string;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className="absolute top-8 bottom-0 left-4 w-px bg-border"
        />
      )}
      <span
        className={cx(
          "relative z-10 flex size-8 items-center justify-center rounded-full",
          kind === "note"
            ? "bg-warning-bg text-warning"
            : kind === "payment"
              ? "bg-success-bg text-success"
              : "bg-bg-tint text-link",
        )}
      >
        <Icon name={TL_ICON[kind]} size={15} aria-hidden />
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-small">
          <span className="font-medium">{title}</span>
          {actor && <span className="text-fg-muted"> · {actor}</span>}
        </p>
        <p className="text-eyebrow text-fg-subtle tabular">
          <time>{time}</time>
          {meta && <> · {meta}</>}
        </p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </li>
  );
}

/** Internal note (yellow tint + lock) vs client-visible message (white). */
export function NoteBubble({
  internal,
  author,
  time,
  children,
}: {
  internal?: boolean;
  author: string;
  time: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "grid gap-1.5 border px-4 py-3",
        internal ? "border-warning/25 bg-warning-bg" : "border-border bg-surface",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-small font-medium">{author}</span>
        {internal ? (
          <LockLabel />
        ) : (
          <time className="text-eyebrow text-fg-subtle">{time}</time>
        )}
      </div>
      <div className="text-small">{children}</div>
      {internal && <time className="text-eyebrow text-fg-subtle">{time}</time>}
    </div>
  );
}

// ---------------------------------------------------------------- Dashboard pieces
export function KpiTile({
  label,
  value,
  href,
  tone = "neutral",
  spark,
  note,
  icon,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  tone?: "neutral" | "attention" | "danger" | "warning";
  spark?: number[];
  note?: ReactNode;
  icon?: IconName;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-small text-fg-muted">
        {icon && (
          <Icon
            name={icon}
            size={15}
            aria-hidden
            className={
              tone === "danger"
                ? "text-danger"
                : tone === "warning"
                  ? "text-warning"
                  : "text-link"
            }
          />
        )}
        {label}
      </span>
      <span className="flex items-end justify-between gap-2">
        <span
          className={cx(
            "min-w-0 text-[2rem] leading-none font-medium tracking-[-0.03em] tabular [overflow-wrap:anywhere]",
            tone === "danger" && "text-danger",
          )}
        >
          {value}
        </span>
        {spark && (
          <span
            className={
              tone === "danger"
                ? "text-danger"
                : tone === "warning"
                  ? "text-warning"
                  : "text-link"
            }
          >
            <Sparkline values={spark} />
          </span>
        )}
      </span>
      {note && (
        <span
          className={cx(
            "w-fit px-2 py-0.5 text-eyebrow",
            tone === "attention"
              ? "bg-primary text-on-gold"
              : "bg-ink-100 text-fg-muted",
          )}
        >
          {note}
        </span>
      )}
    </>
  );
  const cls =
    "grid content-between gap-3 border border-border bg-surface p-4 min-h-32 transition-[border-color,box-shadow] hover:border-secondary/25 hover:shadow-sm focus-visible:outline-2";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Workload heat cell: shade by load/cap; over cap red. Number always shown (not colour alone). */
export function HeatCell({ load, cap }: { load: number; cap: number }) {
  const r = load / cap;
  const cls =
    r > 1
      ? "bg-danger-bg text-danger font-semibold"
      : r >= 0.8
        ? "bg-warning-bg text-warning"
        : r >= 0.5
          ? "bg-bg-tint text-link"
          : "bg-bg-subtle text-fg-muted";
  return (
    <span
      className={cx(
        "flex h-8 items-center justify-center text-eyebrow tabular",
        cls,
      )}
    >
      {load}
    </span>
  );
}

export function EmptyPanel({
  title,
  body,
  action,
  compact,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "relative grid place-items-center overflow-hidden border border-dashed border-border-strong bg-surface text-center",
        compact ? "gap-1.5 px-4 py-6" : "gap-3 px-6 py-12",
      )}
    >
      {!compact && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(closest-side,black,transparent)]"
        />
      )}
      {!compact && (
        <span className="relative flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-700">
          <Icon name="sparkle" size={22} aria-hidden />
        </span>
      )}
      <p
        className={cx(
          "relative",
          compact ? "text-small font-medium" : "text-h3",
        )}
      >
        {title}
      </p>
      {body && (
        <p className="relative max-w-sm text-small text-fg-muted">{body}</p>
      )}
      {action && <div className="relative">{action}</div>}
    </div>
  );
}

/** One panel failed while others loaded (partial failure). */
export function PanelError({
  what,
  onRetry,
}: {
  what: string;
  onRetry: () => void;
}) {
  const c = useC();
  return (
    <div
      role="alert"
      className="grid place-items-center gap-2 border border-danger/25 bg-danger-bg px-4 py-8 text-center"
    >
      <Icon name="x" size={20} aria-hidden className="text-danger" />
      <p className="text-small font-medium text-danger">
        {c.loadFailed.replace("{what}", what)}
      </p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {c.retry}
      </Button>
    </div>
  );
}

/** Section card used across ops pages: title row (+ action/link) and body. */
export function Panel({
  title,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx(
        "min-w-0 border border-border bg-surface",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {(title || action) && (
        <div
          className={cx(
            "mb-3 flex flex-wrap items-center justify-between gap-2",
            !padded && "px-4 pt-4 sm:px-5",
          )}
        >
          {title && <h2 className="text-fg-heading text-label-lg">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

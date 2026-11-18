"use client";
// U17 SP4 /ops/settings/statuses (board 17 v2): sub-statuses grouped by canonical status, ↑/↓ reorder (+ Alt+↑/↓),
// rw/en/fr names, canonical mapping, client-visible toggle with Undo, usage count, new/edit dialog. ★ mock endpoints.
import { useState, type KeyboardEvent } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import { CASE_STATUSES, type CaseStatus } from "@/shared/domain/case-status";
import {
  LANGS,
  l3,
  useSubStatuses,
  useSubStatusMutation,
  createSubStatus,
  patchSubStatus,
  reorderSubStatuses,
  deleteSubStatus,
  type SubStatus,
} from "@/lib/ops/e";
import { opsStatuses } from "@/content/pages/ops-catalogue";
import { opsCatalogue } from "@/content/pages/ops-catalogue";
import { opsCommon } from "@/content/pages/ops-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { OpsStatus, Kbd } from "@/components/atoms/ops";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select, Switch } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { EmptyState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { usePhone } from "@/components/atoms/step-up";
import { fill } from "@/components/organisms/ops/catalogue";

const DOT: Record<SubStatus["color"], string> = {
  lavender: "bg-navy-400",
  yellow: "bg-gold-400",
  green: "bg-success",
  grey: "bg-ink-300",
  red: "bg-danger",
};
const ORDER = new Map(CASE_STATUSES.map((s, i) => [s, i]));

export function StatusesView() {
  const { locale } = useI18n();
  const c = opsStatuses(locale);
  const status = opsCommon(locale).status as Record<CaseStatus, string>;
  const toast = useToast();
  const q = useSubStatuses();
  const [focused, setFocused] = useState<string | null>(null);
  const [editing, setEditing] = useState<SubStatus | "new" | null>(null);
  const [msg, setMsg] = useState("");
  useShortcut("n", c.new, () => setEditing("new"), "list");
  const reorder = useSubStatusMutation(
    (v: { canonical: CaseStatus; ids: string[] }) =>
      reorderSubStatuses(v.canonical, v.ids),
  );
  const patch = useSubStatusMutation(
    (v: { id: string; body: Partial<SubStatus> }) =>
      patchSubStatus(v.id, v.body),
  );

  const rows = [...(q.data?.items ?? [])].sort(
    (a, b) =>
      (ORDER.get(a.canonical) ?? 0) - (ORDER.get(b.canonical) ?? 0) ||
      a.order - b.order,
  );
  const siblings = (r: SubStatus) =>
    rows.filter((x) => x.canonical === r.canonical);
  const name = (r: SubStatus) => r.name[locale] || r.name.en;

  const moveRow = (r: SubStatus, d: -1 | 1) => {
    const sib = siblings(r);
    const i = sib.findIndex((x) => x.id === r.id);
    const j = i + d;
    if (j < 0 || j >= sib.length) return;
    const before = sib.map((x) => x.id);
    const ids = [...before];
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate(
      { canonical: r.canonical, ids },
      {
        onSuccess: () => {
          setMsg(fill(c.moved, { name: name(r), n: j + 1 }));
          toast({
            tone: "success",
            title: fill(c.moved, { name: name(r), n: j + 1 }),
            action: {
              label: c.undo,
              onClick: () =>
                reorder.mutate({ canonical: r.canonical, ids: before }),
            },
          });
        },
        onError: () => toast({ tone: "danger", title: c.failed }),
      },
    );
  };
  const toggle = (r: SubStatus, on: boolean) =>
    patch.mutate(
      { id: r.id, body: { clientVisible: on } },
      {
        onSuccess: () =>
          toast({
            tone: "success",
            title: fill(on ? c.shown : c.hidden, { name: name(r) }),
            action: {
              label: c.undo,
              onClick: () =>
                patch.mutate({ id: r.id, body: { clientVisible: !on } }),
            },
          }),
        onError: () => toast({ tone: "danger", title: c.failed }),
      },
    );
  const keys = (r: SubStatus) => (e: KeyboardEvent) => {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    moveRow(r, e.key === "ArrowUp" ? -1 : 1);
  };

  const btn =
    "flex size-8 items-center justify-center text-fg-muted hover:bg-navy-50 hover:text-fg disabled:opacity-30";
  const columns: OpsColumn<SubStatus>[] = [
    {
      key: "order",
      label: c.cols.order,
      card: false,
      className: "w-24",
      cell: (r) => {
        const sib = siblings(r);
        const i = sib.findIndex((x) => x.id === r.id);
        return (
          <span className="flex" onKeyDown={keys(r)}>
            <button
              type="button"
              className={btn}
              disabled={i === 0 || reorder.isPending}
              onClick={(e) => (e.stopPropagation(), moveRow(r, -1))}
              aria-label={fill(c.up, { name: name(r) })}
            >
              <Icon
                name="chevronDown"
                size={16}
                className="rotate-180"
                aria-hidden
              />
            </button>
            <button
              type="button"
              className={btn}
              disabled={i === sib.length - 1 || reorder.isPending}
              onClick={(e) => (e.stopPropagation(), moveRow(r, 1))}
              aria-label={fill(c.down, { name: name(r) })}
            >
              <Icon name="chevronDown" size={16} aria-hidden />
            </button>
          </span>
        );
      },
    },
    {
      key: "name",
      label: c.cols.name,
      className: "min-w-64",
      wrap: true,
      sort: (r) => name(r),
      cell: (r) => (
        <span className="grid">
          <span className="font-medium">{name(r)}</span>
          <span className="text-eyebrow text-fg-subtle">
            {LANGS.filter((l) => l !== locale)
              .map((l) => `${l.toUpperCase()}: ${r.name[l] || "—"}`)
              .join(" · ")}
          </span>
        </span>
      ),
    },
    {
      key: "canonical",
      label: c.cols.canonical,
      className: "min-w-48",
      wrap: true,
      cell: (r) => <OpsStatus status={r.canonical} />,
    },
    {
      key: "visible",
      label: c.cols.visible,
      card: false,
      className: "min-w-32",
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch
            label={
              <span className="sr-only">
                {fill(c.visibleLabel, { name: name(r) })}
              </span>
            }
            checked={r.clientVisible}
            disabled={patch.isPending}
            onChange={(e) => toggle(r, e.target.checked)}
          />
        </span>
      ),
    },
    {
      key: "colour",
      label: c.cols.colour,
      className: "min-w-28",
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className={cx("size-3 rounded-full", DOT[r.color])}
          />
          {c.colours[r.color]}
        </span>
      ),
    },
    {
      key: "usage",
      label: c.cols.usage,
      align: "right",
      className: "min-w-24",
      sort: (r) => r.usage,
      cell: (r) => (
        <span className="tabular">{fill(c.usage, { n: r.usage, s: r.usage === 1 ? "" : "s" })}</span>
      ),
    },
    {
      key: "actions",
      label: c.cols.actions,
      card: false,
      className: "w-20",
      cell: (r) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={(e) => (e.stopPropagation(), setEditing(r))}
          aria-label={fill(c.edit, { name: name(r) })}
        >
          <Icon name="menu" size={16} aria-hidden />
        </Button>
      ),
    },
  ];

  return (
    <div className="grid gap-5 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">{c.title}</h1>
          <p className="text-small text-fg-subtle">{c.lede}</p>
        </div>
        <Button dots onClick={() => setEditing("new")}>
          {c.new} <Kbd>N</Kbd>
        </Button>
      </header>
      <OpsTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        rowLabel={name}
        label={c.region}
        loading={q.isPending}
        error={q.error}
        onRetry={() => q.refetch()}
        focused={focused}
        onFocus={setFocused}
        onOpen={(r) => setEditing(r)}
        shortcuts
        groupBy={(r) => status[r.canonical]}
        groupHeader={(g, rs) => (
          <span>
            {g} <span className="text-fg-subtle tabular">({rs.length})</span>
          </span>
        )}
        renderCard={(r) => (
          <span className="grid gap-1 text-left">
            <span className="flex items-center gap-2 font-medium">
              <span
                aria-hidden
                className={cx("size-2.5 rounded-full", DOT[r.color])}
              />
              {name(r)}
            </span>
            <span className="text-small text-fg-subtle">
              {c.cols.visible}: {r.clientVisible ? c.yes : c.no} ·{" "}
              {fill(c.usage, { n: r.usage })}
            </span>
          </span>
        )}
        empty={
          <EmptyState
            title={c.emptyTitle}
            body={c.emptyBody}
            action={
              <Button size="sm" onClick={() => setEditing("new")}>
                {c.new}
              </Button>
            }
          />
        }
      />
      <p className="sr-only" aria-live="polite">
        {msg}
      </p>
      {editing && (
        <SubStatusDialog
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onMove={editing === "new" ? undefined : (d) => moveRow(editing, d)}
        />
      )}
    </div>
  );
}

function SubStatusDialog({
  item,
  onClose,
  onMove,
}: {
  item: SubStatus | null;
  onClose: () => void;
  onMove?: (d: -1 | 1) => void;
}) {
  const { locale } = useI18n();
  const c = opsStatuses(locale);
  const t = c.dialog;
  const lang = opsCatalogue(locale).lang;
  const status = opsCommon(locale).status as Record<CaseStatus, string>;
  const phone = usePhone();
  const toast = useToast();
  const [v, setV] = useState(() =>
    item
      ? {
          name: item.name,
          clientText: item.clientText,
          canonical: item.canonical,
          color: item.color,
          clientVisible: item.clientVisible,
        }
      : {
          name: l3(),
          clientText: l3(),
          canonical: "awaiting_external_institution" as CaseStatus,
          color: "lavender" as SubStatus["color"],
          clientVisible: true,
        },
  );
  const [err, setErr] = useState<string | null>(null);
  const save = useSubStatusMutation((b: typeof v) =>
    item ? patchSubStatus(item.id, b) : createSubStatus(b),
  );
  const del = useSubStatusMutation((id: string) => deleteSubStatus(id));
  const usage = item ? item.usage : 0;
  const itemId = item ? item.id : null;
  const nm = item ? item.name[locale] || item.name.en : "";
  const submit = () => {
    if (LANGS.some((l) => !v.name[l].trim())) return setErr(t.required);
    setErr(null);
    save.mutate(v, {
      onSuccess: () => {
        toast({ tone: "success", title: item ? t.saved : t.created });
        onClose();
      },
      onError: () => setErr(c.failed),
    });
  };
  return (
    <Dialog
      open
      onClose={onClose}
      side={phone ? "bottom" : "right"}
      title={item ? t.titleEdit : t.titleNew}
      footer={
        <>
          {itemId && (
            <span className="mr-auto grid gap-1">
              <Button
                variant="danger"
                size="sm"
                disabled={usage > 0}
                aria-describedby={usage > 0 ? "ss-in-use" : undefined}
                loading={del.isPending}
                onClick={() =>
                  del.mutate(itemId, {
                    onSuccess: () => (toast({ title: t.deleted }), onClose()),
                    onError: () => setErr(c.failed),
                  })
                }
              >
                {t.delete}
              </Button>
              {usage > 0 && (
                <span
                  id="ss-in-use"
                  className="max-w-56 text-eyebrow text-fg-subtle"
                >
                  {fill(t.inUse, { n: usage })}
                </span>
              )}
            </span>
          )}
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={submit} loading={save.isPending} dots>
            {item ? t.save : t.create}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {err && (
          <p role="alert" className="text-small text-danger">
            {err}
          </p>
        )}
        <p className="text-small text-fg-subtle">{t.example}</p>
        {LANGS.map((l) => (
          <Field key={l} label={fill(t.name, { lang: lang[l] })}>
            {(a) => (
              <Input
                id={a.id}
                value={v.name[l]}
                onChange={(e) =>
                  setV({ ...v, name: { ...v.name, [l]: e.target.value } })
                }
                className="h-10"
              />
            )}
          </Field>
        ))}
        <Field label={t.maps}>
          {(a) => (
            <Select
              id={a.id}
              value={v.canonical}
              onChange={(e) =>
                setV({ ...v, canonical: e.target.value as CaseStatus })
              }
              className="h-10"
            >
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {status[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <p className="-mt-2 text-small text-fg-subtle">{t.clientHint}</p>
        {LANGS.map((l) => (
          <Field key={l} label={fill(t.clientText, { lang: lang[l] })}>
            {(a) => (
              <Input
                id={a.id}
                value={v.clientText[l]}
                onChange={(e) =>
                  setV({
                    ...v,
                    clientText: { ...v.clientText, [l]: e.target.value },
                  })
                }
                className="h-10"
              />
            )}
          </Field>
        ))}
        <Field label={t.colour}>
          {(a) => (
            <Select
              id={a.id}
              value={v.color}
              onChange={(e) =>
                setV({ ...v, color: e.target.value as SubStatus["color"] })
              }
              className="h-10"
            >
              {(Object.keys(DOT) as SubStatus["color"][]).map((k) => (
                <option key={k} value={k}>
                  {c.colours[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Switch
          label={t.visible}
          checked={v.clientVisible}
          onChange={(e) => setV({ ...v, clientVisible: e.target.checked })}
        />
        {onMove && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onMove(-1)}
              aria-label={fill(c.up, { name: nm })}
            >
              <Icon
                name="chevronDown"
                size={16}
                className="rotate-180"
                aria-hidden
              />{" "}
              {c.cols.order}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onMove(1)}
              aria-label={fill(c.down, { name: nm })}
            >
              <Icon name="chevronDown" size={16} aria-hidden /> {c.cols.order}
            </Button>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

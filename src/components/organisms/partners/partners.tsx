"use client";
// PRT partner workspace: list + KPI strip, partner detail tabs, commissions (finance). Spec institutional-partners §9.
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { partnersCopy, type PartnersCopy } from "@/content/pages/partners";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import {
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { Tabs } from "@/components/atoms/tabs";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";

type Rec = Record<string, unknown> & { id: string };
type Health = "green" | "amber" | "red";
type Score = {
  health: Health;
  overdue: number;
  actionsOnTimePct: number | null;
  referrals: number;
  revenue: number;
  expiring: number;
};
type Partner = Rec & {
  name: string;
  type: string;
  tier: string;
  status: string;
  lastContactAt: string | null;
} & Score;
type Detail = Partner & {
  scorecard: Score;
  contacts: Rec[];
  agreements: Rec[];
  actions: Rec[];
  meetings: Rec[];
  correspondence: Rec[];
  referrals: Rec[];
  commissions: Rec[];
};
const HTONE: Record<Health, "success" | "warning" | "danger"> = {
  green: "success",
  amber: "warning",
  red: "danger",
};
const usePc = () => partnersCopy(useI18n().locale);
const S = (v: unknown) => (v == null || v === "" ? "—" : String(v));

function useAllowed() {
  const { user } = useSession();
  return (
    !user ||
    user.roles.some(
      (r) =>
        r === "staff:partner_manager" ||
        r === "staff:executive" ||
        r === "staff:finance",
    )
  );
}
const useCanWrite = () =>
  !!useSession().user?.roles.includes("staff:partner_manager");

// ---------------------------------------------------------------- generic form over a field spec
type FieldSpec = {
  k: string;
  label: string;
  type?:
    | "text"
    | "date"
    | "datetime"
    | "number"
    | "select"
    | "bool"
    | "area"
    | "lines"
    | "pct";
  options?: [string, string][];
  required?: boolean;
};
function SpecForm({
  fields,
  initial,
  onSubmit,
  pending,
  onCancel,
}: {
  fields: FieldSpec[];
  initial?: Rec | null;
  onSubmit: (b: Record<string, unknown>) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const c = usePc();
  const [err, setErr] = useState<Record<string, string>>({});
  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const out: Record<string, unknown> = {};
        const bad: Record<string, string> = {};
        for (const s of fields) {
          const raw = String(f.get(s.k) ?? "").trim();
          if (s.type === "bool") {
            out[s.k] = f.get(s.k) === "on";
            continue;
          }
          if (!raw) {
            if (s.required) bad[s.k] = c.failed;
            else if (initial) out[s.k] = null;
            continue;
          }
          out[s.k] =
            s.type === "number"
              ? Number(raw)
              : s.type === "pct"
                ? Math.round(Number(raw) * 100)
                : s.type === "datetime"
                  ? new Date(raw).toISOString()
                  : s.type === "lines"
                    ? raw
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean)
                    : raw;
        }
        setErr(bad);
        if (!Object.keys(bad).length) onSubmit(out);
      }}
    >
      {fields.map((s) => {
        const v = initial?.[s.k];
        const dv =
          v == null
            ? ""
            : s.type === "pct"
              ? String(Number(v) / 100)
              : s.type === "lines"
                ? (v as string[]).join("\n")
                : s.type === "datetime"
                  ? String(v).slice(0, 16)
                  : String(v);
        const wide = s.type === "area" || s.type === "lines";
        if (s.type === "bool")
          return (
            <div key={s.k} className="sm:col-span-2">
              <Checkbox name={s.k} defaultChecked={!!v} label={s.label} />
            </div>
          );
        return (
          <Field
            key={s.k}
            label={s.label}
            error={err[s.k]}
            className={wide ? "sm:col-span-2" : undefined}
          >
            {({ id, describedBy, invalid }) =>
              s.type === "select" ? (
                <Select
                  id={id}
                  name={s.k}
                  defaultValue={dv || s.options![0][0]}
                  aria-describedby={describedBy}
                >
                  {s.options!.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
              ) : wide ? (
                <Textarea
                  id={id}
                  name={s.k}
                  defaultValue={dv}
                  rows={s.k === "minutes" ? 8 : 3}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              ) : (
                <Input
                  id={id}
                  name={s.k}
                  defaultValue={dv}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  type={
                    s.type === "date"
                      ? "date"
                      : s.type === "datetime"
                        ? "datetime-local"
                        : s.type === "number" || s.type === "pct"
                          ? "number"
                          : "text"
                  }
                  step={s.type === "pct" ? "0.01" : undefined}
                />
              )
            }
          </Field>
        );
      })}
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {c.cancel}
        </Button>
        <Button type="submit" loading={pending}>
          {c.save}
        </Button>
      </div>
    </form>
  );
}

const opts = (m: Record<string, string>): [string, string][] =>
  Object.entries(m);
function specs(c: PartnersCopy): Record<string, FieldSpec[]> {
  const f = c.f;
  return {
    partner: [
      { k: "name", label: f.name, required: true },
      { k: "type", label: f.type, type: "select", options: opts(c.types) },
      { k: "tier", label: f.tier, type: "select", options: opts(c.tiers) },
      {
        k: "status",
        label: f.status,
        type: "select",
        options: opts(c.statuses).filter(([k]) => k !== "archived"),
      },
      { k: "sector", label: f.sector },
      { k: "country", label: f.country },
      { k: "website", label: f.website },
      { k: "logoUrl", label: f.logo },
      { k: "notes", label: f.notes, type: "area" },
      { k: "shownOnWebsite", label: f.shown, type: "bool" },
    ],
    contacts: [
      { k: "name", label: f.name, required: true },
      { k: "title", label: f.title },
      { k: "email", label: f.email },
      { k: "phone", label: f.phone },
      { k: "isPrimary", label: f.primary, type: "bool" },
    ],
    agreements: [
      { k: "kind", label: f.kind, type: "select", options: opts(c.kinds) },
      { k: "title", label: f.title, required: true },
      { k: "number", label: f.number },
      { k: "signedOn", label: f.signedOn, type: "date" },
      { k: "startOn", label: f.startOn, type: "date", required: true },
      { k: "endOn", label: f.endOn, type: "date" },
      { k: "valueAmount", label: f.value, type: "number" },
      { k: "commissionBps", label: f.commission, type: "pct" },
      {
        k: "status",
        label: f.status,
        type: "select",
        options: opts(c.agreementState).filter(([k]) => k !== "expiring"),
      },
      { k: "isConfidential", label: f.confidential, type: "bool" },
    ],
    actions: [
      { k: "title", label: f.title, required: true },
      { k: "deliverable", label: f.deliverable },
      { k: "ownerUserId", label: f.owner },
      { k: "dueOn", label: f.dueOn, type: "date" },
      {
        k: "status",
        label: f.status,
        type: "select",
        options: opts(c.actionStatus),
      },
      { k: "progress", label: f.progress, type: "number" },
    ],
    meetings: [
      { k: "title", label: f.title, required: true },
      { k: "startsAt", label: f.startsAt, type: "datetime", required: true },
      { k: "location", label: f.location },
      {
        k: "status",
        label: f.status,
        type: "select",
        options: opts(c.meetingStatus),
      },
      { k: "agenda", label: f.agenda, type: "area" },
      { k: "minutes", label: f.minutes, type: "area" },
      { k: "decisions", label: f.decisions, type: "lines" },
    ],
    correspondence: [
      {
        k: "direction",
        label: f.direction,
        type: "select",
        options: opts(c.dir),
      },
      { k: "kind", label: f.kind, type: "select", options: opts(c.corrKinds) },
      { k: "date", label: f.date, type: "date", required: true },
      { k: "subject", label: f.subject, required: true },
      { k: "summary", label: f.summary, type: "area" },
    ],
    referrals: [
      {
        k: "direction",
        label: f.direction,
        type: "select",
        options: opts(c.dir),
      },
      { k: "name", label: f.name, required: true },
      { k: "clientId", label: f.clientId },
      { k: "applicationId", label: f.applicationId },
      {
        k: "status",
        label: f.status,
        type: "select",
        options: opts(c.refStatus),
      },
    ],
  };
}

// ---------------------------------------------------------------- list
export function PartnerList() {
  const c = usePc();
  const { locale } = useI18n();
  const allowed = useAllowed();
  const write = useCanWrite();
  const p = useUrlParams();
  const status = p.get("status") ?? "";
  const qc = useQueryClient();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const q = useQuery({
    queryKey: ["partners", status],
    queryFn: () =>
      unwrap<{
        kpis: {
          active: number;
          expiring: number;
          overdue: number;
          meetingsThisWeek: number;
        };
        items: Partner[];
      }>(
        api.GET("/api/staff/partners", {
          params: { query: { status: (status || undefined) as never } },
        }),
      ),
    enabled: allowed,
  });
  const add = useMutation({
    mutationFn: (b: Record<string, unknown>) =>
      unwrap<Partner>(api.POST("/api/staff/partners", { body: b as never })), // cast: SpecForm output matches PartnerIn
    onSuccess: () => {
      setAdding(false);
      toast({ title: c.saved, tone: "success" });
      void qc.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  if (!allowed) return <EmptyState title={c.denied} />;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2">{c.title}</h1>
          <p className="text-body text-fg-muted">{c.lede}</p>
        </div>
        {write && (
          <Button dots onClick={() => setAdding(true)}>
            {c.add}
          </Button>
        )}
      </div>
      {q.isPending ? (
        <Skeleton className="h-48" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["active", q.data.kpis.active],
                ["expiring", q.data.kpis.expiring],
                ["overdue", q.data.kpis.overdue],
                ["meetings", q.data.kpis.meetingsThisWeek],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="border border-border bg-white p-4">
                <dt className="text-small text-fg-muted">{c.kpi[k]}</dt>
                <dd className="text-h3 tabular">{v}</dd>
              </div>
            ))}
          </dl>
          <div
            role="tablist"
            aria-label={c.cols.status}
            className="flex flex-wrap gap-1"
          >
            {["", "active", "prospect", "dormant", "archived"].map((s) => (
              <button
                key={s || "all"}
                type="button"
                role="tab"
                aria-selected={status === s}
                onClick={() => setUrlParams({ status: s || null })}
                className={
                  status === s
                    ? "h-9 bg-secondary px-3 text-small text-on-secondary"
                    : "h-9 border border-border bg-white px-3 text-small hover:bg-navy-50"
                }
              >
                {s ? c.statuses[s as keyof PartnersCopy["statuses"]] : c.all}
              </button>
            ))}
          </div>
          {!q.data.items.length ? (
            <EmptyState title={c.empty} body={c.emptyBody} />
          ) : (
            <div className="overflow-x-auto border border-border bg-white">
              <table className="w-full min-w-[40rem] text-small">
                <thead className="bg-navy-50 text-left">
                  <tr>
                    {(
                      [
                        "name",
                        "type",
                        "tier",
                        "status",
                        "health",
                        "referrals",
                      ] as const
                    ).map((k) => (
                      <th key={k} scope="col" className="px-4 py-2 font-medium">
                        {c.cols[k]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {q.data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <Link
                          className="font-medium underline underline-offset-2"
                          href={localHref(locale, `/partners/${r.id}`)}
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {c.types[r.type as keyof PartnersCopy["types"]] ??
                          r.type}
                      </td>
                      <td className="px-4 py-3">
                        {c.tiers[r.tier as keyof PartnersCopy["tiers"]] ??
                          r.tier}
                      </td>
                      <td className="px-4 py-3">
                        {c.statuses[
                          r.status as keyof PartnersCopy["statuses"]
                        ] ?? r.status}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={HTONE[r.health]}>
                          {c.health[r.health]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular">{r.referrals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {adding && (
        <Dialog open onClose={() => setAdding(false)} title={c.add}>
          <SpecForm
            fields={specs(c).partner}
            onSubmit={(b) => add.mutate(b)}
            pending={add.isPending}
            onCancel={() => setAdding(false)}
          />
        </Dialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- detail
const TABS = [
  "overview",
  "contacts",
  "agreements",
  "actions",
  "meetings",
  "correspondence",
  "referrals",
  "history",
] as const;
type Tab = (typeof TABS)[number];
type Kind = Exclude<Tab, "overview" | "history">;

export function PartnerDetail({ id }: { id: string }) {
  const c = usePc();
  const { locale } = useI18n();
  const allowed = useAllowed();
  const write = useCanWrite();
  const p = useUrlParams();
  const tab: Tab = (TABS as readonly string[]).includes(p.get("tab") ?? "")
    ? (p.get("tab") as Tab)
    : "overview";
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<null | {
    kind: Kind | "partner";
    row: Rec | null;
  }>(null);
  const key = ["partner", id];
  const q = useQuery({
    queryKey: key,
    queryFn: () =>
      unwrap<Detail>(
        api.GET("/api/staff/partners/{id}", { params: { path: { id } } }),
      ),
    enabled: allowed,
  });
  const ok = () => {
    toast({ title: c.saved, tone: "success" });
    setEdit(null);
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ["partners"] });
  };
  const no = () => toast({ title: c.failed, tone: "danger" });
  const save = useMutation({
    mutationFn: ({
      kind,
      row,
      body,
    }: {
      kind: Kind | "partner";
      row: Rec | null;
      body: Record<string, unknown>;
    }) =>
      kind === "partner"
        ? unwrap(
            api.PATCH("/api/staff/partners/{id}", {
              params: { path: { id } },
              body: body as never,
            }),
          )
        : row
          ? unwrap(
              api.PATCH("/api/staff/partners/{id}/{kind}/{cid}", {
                params: { path: { id, kind, cid: row.id } },
                body,
              }),
            )
          : unwrap(
              api.POST("/api/staff/partners/{id}/{kind}", {
                params: { path: { id, kind } },
                body,
              }),
            ),
    onSuccess: ok,
    onError: no,
  });
  const status = useMutation({
    mutationFn: (archive: boolean) =>
      archive
        ? unwrap(
            api.POST("/api/staff/partners/{id}/archive", {
              params: { path: { id } },
            }),
          )
        : unwrap(
            api.PATCH("/api/staff/partners/{id}", {
              params: { path: { id } },
              body: { status: "active" },
            }),
          ),
    onSuccess: ok,
    onError: no,
  });
  const toAction = useMutation({
    mutationFn: ({ mid, index }: { mid: string; index: number }) =>
      unwrap(
        api.POST(
          "/api/staff/partners/{id}/meetings/{mid}/decisions/to-action",
          { params: { path: { id, mid } }, body: { index } },
        ),
      ),
    onSuccess: ok,
    onError: no,
  });
  if (!allowed) return <EmptyState title={c.denied} />;
  if (q.isPending) return <Skeleton className="h-64" />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const sc = d.scorecard;
  const L = <T extends Record<string, string>>(m: T, k: unknown) =>
    m[k as keyof T] ?? S(k);
  const rowsFor: Record<
    Kind,
    {
      rows: Rec[];
      line: (r: Rec) => React.ReactNode;
      extra?: (r: Rec) => React.ReactNode;
    }
  > = {
    contacts: {
      rows: d.contacts,
      line: (r) => (
        <>
          {S(r.name)}
          {r.title ? ` · ${S(r.title)}` : ""} · {S(r.email ?? r.phone)}
          {r.isPrimary ? " ★" : ""}
          {r.active === false ? " · —" : ""}
        </>
      ),
    },
    agreements: {
      rows: d.agreements,
      line: (r) => (
        <>
          {L(c.kinds, r.kind)} · {S(r.title)} ·{" "}
          {formatDate(String(r.startOn), locale)} →{" "}
          {r.endOn ? formatDate(String(r.endOn), locale) : "…"}{" "}
          <Badge
            tone={
              r.state === "expiring"
                ? "warning"
                : r.state === "expired"
                  ? "danger"
                  : undefined
            }
          >
            {L(c.agreementState, r.state)}
          </Badge>
          {r.commissionBps != null
            ? ` · ${Number(r.commissionBps) / 100}%`
            : ""}
        </>
      ),
    },
    actions: {
      rows: d.actions,
      line: (r) => (
        <>
          {S(r.title)} · {r.dueOn ? formatDate(String(r.dueOn), locale) : "—"} ·{" "}
          {L(c.actionStatus, r.status)} · {S(r.progress)}%
        </>
      ),
      extra: (r) =>
        write && r.status !== "done" && r.status !== "cancelled" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              save.mutate({ kind: "actions", row: r, body: { status: "done" } })
            }
          >
            {c.markDone}
          </Button>
        ) : null,
    },
    meetings: {
      rows: d.meetings,
      line: (r) => (
        <>
          {S(r.title)} · {formatDateTime(String(r.startsAt), locale)} ·{" "}
          {L(c.meetingStatus, r.status)}
        </>
      ),
      extra: (r) => (
        <span className="flex flex-wrap gap-2">
          <a
            className="text-small text-link underline underline-offset-2"
            href={`/api/staff/partners/${id}/meetings/${r.id}/event.ics`}
          >
            {c.ics}
          </a>
          {write &&
            (r.decisions as string[]).map((t, i) => (
              <Button
                key={i}
                size="sm"
                variant="ghost"
                title={t}
                onClick={() => toAction.mutate({ mid: r.id, index: i })}
              >
                {c.toAction} {i + 1}
              </Button>
            ))}
        </span>
      ),
    },
    correspondence: {
      rows: d.correspondence,
      line: (r) => (
        <>
          {formatDate(String(r.date), locale)} · {L(c.dir, r.direction)} ·{" "}
          {L(c.corrKinds, r.kind)} · {S(r.subject)}
        </>
      ),
    },
    referrals: {
      rows: d.referrals,
      line: (r) => (
        <>
          {S(r.name)} · {L(c.dir, r.direction)} · {L(c.refStatus, r.status)}
        </>
      ),
    },
  };
  const panel = (k: Kind) => (
    <div className="mt-4 grid gap-3">
      {write && (
        <div className="flex justify-end">
          <Button
            size="sm"
            dots
            onClick={() => setEdit({ kind: k, row: null })}
          >
            {c.new}
          </Button>
        </div>
      )}
      {!rowsFor[k].rows.length ? (
        <p className="text-small text-fg-muted">{c.none}</p>
      ) : (
        <ul className="divide-y divide-border border border-border bg-white">
          {rowsFor[k].rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-small"
            >
              <span className="min-w-0 flex-1 basis-60">
                {rowsFor[k].line(r)}
              </span>
              {rowsFor[k].extra?.(r)}
              {write && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEdit({ kind: k, row: r })}
                >
                  {c.save}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {k === "referrals" && !!d.commissions.length && (
        <ul className="divide-y divide-border border border-border bg-white text-small">
          {d.commissions.map((m) => (
            <li key={m.id} className="px-4 py-3 tabular">
              {formatMoney(Number(m.amount), locale)} ·{" "}
              {Number(m.rateBps) / 100}% · {L(c.comStatus, m.status)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={localHref(locale, "/partners")}
            className="text-small text-fg-muted hover:text-fg"
          >
            {c.title}
          </Link>
          <h1 className="flex flex-wrap items-center gap-3 text-h2">
            {d.name}
            <Badge tone={HTONE[sc.health]}>{c.health[sc.health]}</Badge>
          </h1>
          <p className="text-body text-fg-muted">
            {L(c.types, d.type)} · {L(c.tiers, d.tier)} ·{" "}
            {L(c.statuses, d.status)}
          </p>
        </div>
        {write && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setEdit({ kind: "partner", row: d })}
            >
              {c.save}
            </Button>
            <Button
              variant="ghost"
              loading={status.isPending}
              onClick={() => status.mutate(d.status !== "archived")}
            >
              {d.status === "archived" ? c.reactivate : c.archive}
            </Button>
          </div>
        )}
      </div>
      <Tabs
        value={tab}
        onChange={(t) => setUrlParams({ tab: t === "overview" ? null : t })}
        tabs={TABS.map((t) => ({
          id: t,
          label: c.tabs[t],
          content:
            t !== tab ? null : t === "overview" ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    [
                      c.score.onTime,
                      sc.actionsOnTimePct == null
                        ? "—"
                        : `${sc.actionsOnTimePct}%`,
                    ],
                    [c.score.referrals, sc.referrals],
                    [c.score.revenue, formatMoney(sc.revenue, locale)],
                    [
                      c.score.lastContact,
                      d.lastContactAt
                        ? formatDate(d.lastContactAt, locale)
                        : c.score.never,
                    ],
                    [c.kpi.overdue, sc.overdue],
                    [c.kpi.expiring, sc.expiring],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="border border-border bg-white p-4">
                    <dt className="text-small text-fg-muted">{k}</dt>
                    <dd className="text-h4 tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : t === "history" ? (
              <History id={id} />
            ) : (
              panel(t)
            ),
        }))}
      />
      {edit && (
        <Dialog
          open
          onClose={() => setEdit(null)}
          title={edit.kind === "partner" ? d.name : c.tabs[edit.kind]}
        >
          <SpecForm
            fields={specs(c)[edit.kind]}
            initial={edit.row}
            pending={save.isPending}
            onCancel={() => setEdit(null)}
            onSubmit={(body) =>
              save.mutate({
                kind: edit.kind,
                row: edit.kind === "partner" ? null : edit.row,
                body,
              })
            }
          />
        </Dialog>
      )}
    </div>
  );
}

function History({ id }: { id: string }) {
  const c = usePc();
  const { locale } = useI18n();
  const q = useQuery({
    queryKey: ["partner", id, "history"],
    queryFn: () =>
      unwrap<{
        items: { kind: string; id: string; at: string; title: string }[];
      }>(
        api.GET("/api/staff/partners/{id}/history", {
          params: { path: { id } },
        }),
      ),
  });
  if (q.isPending) return <Skeleton className="mt-4 h-32" />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data.items.length)
    return <p className="mt-4 text-small text-fg-muted">{c.none}</p>;
  return (
    <ol className="mt-4 grid gap-2 border-l border-border pl-4 text-small">
      {q.data.items.map((h) => (
        <li key={`${h.kind}-${h.id}`}>
          <span className="tabular text-fg-muted">
            {formatDate(h.at, locale)}
          </span>{" "}
          · {h.title}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- commissions (finance decides)
export function PartnerCommissions() {
  const c = usePc();
  const { locale } = useI18n();
  const { user } = useSession();
  const finance = !!user?.roles.includes("staff:finance");
  const allowed = useAllowed();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["partners", "commissions"],
    queryFn: () =>
      unwrap<{
        items: (Rec & {
          partner: string;
          caseCode: string | null;
          baseAmount: number;
          rateBps: number;
          amount: number;
          status: keyof PartnersCopy["comStatus"];
        })[];
      }>(api.GET("/api/staff/partners/commissions")),
    enabled: allowed,
  });
  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approved" | "rejected" | "paid";
    }) =>
      unwrap(
        api.POST("/api/staff/partners/commissions/{id}/decision", {
          params: { path: { id } },
          body: { decision },
        }),
      ),
    onSuccess: () => {
      toast({ title: c.saved, tone: "success" });
      void qc.invalidateQueries({ queryKey: ["partners", "commissions"] });
    },
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  const k = c.commissions;
  if (!allowed) return <EmptyState title={c.denied} />;
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-h2">{k.title}</h1>
        <p className="text-body text-fg-muted">{k.lede}</p>
      </div>
      {q.isPending ? (
        <Skeleton className="h-40" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data.items.length ? (
        <EmptyState title={c.none} />
      ) : (
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full min-w-[40rem] text-small">
            <thead className="bg-navy-50 text-left">
              <tr>
                {[
                  k.partner,
                  k.case,
                  k.base,
                  k.rate,
                  k.amount,
                  c.cols.status,
                  "",
                ].map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {q.data.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.partner}</td>
                  <td className="px-4 py-3 font-mono">{r.caseCode ?? "—"}</td>
                  <td className="px-4 py-3 tabular">
                    {formatMoney(r.baseAmount, locale)}
                  </td>
                  <td className="px-4 py-3 tabular">{r.rateBps / 100}%</td>
                  <td className="px-4 py-3 tabular">
                    {formatMoney(r.amount, locale)}
                  </td>
                  <td className="px-4 py-3">{c.comStatus[r.status]}</td>
                  <td className="px-4 py-3">
                    {finance && r.status === "computed" && (
                      <span className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            decide.mutate({ id: r.id, decision: "approved" })
                          }
                        >
                          {k.approve}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            decide.mutate({ id: r.id, decision: "rejected" })
                          }
                        >
                          {k.reject}
                        </Button>
                      </span>
                    )}
                    {finance && r.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          decide.mutate({ id: r.id, decision: "paid" })
                        }
                      >
                        {k.paid}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

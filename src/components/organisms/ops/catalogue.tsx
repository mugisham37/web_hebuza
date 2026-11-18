"use client";
// U16 SB1 catalogue list (board 16 v2): services grouped by category, joined from /api/admin/services (pricing, tiers)
// and /services/catalogue/structures (version, draft state, active requests). Filters live in the URL.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDateTime } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import {
  useServices,
  useStructures,
  useCategories,
  useCreateService,
  type StructureRow,
  type ServiceRow,
  type Category,
  getDraft,
  putDraft,
} from "@/lib/ops/e";
import { ApiError } from "@/lib/api/client";
import { opsCatalogue } from "@/content/pages/ops-catalogue";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { EmptyState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { Kbd } from "@/components/atoms/ops";
import { usePhone } from "@/components/atoms/step-up";

export const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const TONE: Record<string, "success" | "warning" | "neutral" | "info"> = {
  published: "success",
  draft: "info",
  paused: "warning",
  archived: "neutral",
};
export const catName = (c: Category | undefined, l: "rw" | "en" | "fr") =>
  c ? c[`name_${l}`] || c.name_en : "";

type Row = StructureRow & { svc?: ServiceRow };

export function CatalogueView() {
  const { locale } = useI18n();
  const c = opsCatalogue(locale);
  const router = useRouter();
  const toast = useToast();
  const p = useUrlParams();
  const q = p.get("q") ?? "";
  const catF = p.get("cat") ?? "";
  const statusF = p.get("status") ?? "";
  const structures = useStructures();
  const services = useServices();
  const cats = useCategories();
  const [focused, setFocused] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const create = useCreateService();
  useShortcut("n", c.list.newService, () => setCreating(true), "list");

  const svcBySlug = new Map(
    (services.data?.services ?? []).map((s) => [s.slug, s]),
  );
  const catList = [...(cats.data?.categories ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const catById = new Map(catList.map((x) => [x.id, x]));
  const order = new Map(catList.map((x, i) => [x.id, i]));
  const all: Row[] = (structures.data?.structures ?? []).map((s) => ({
    ...s,
    svc: svcBySlug.get(s.slug),
  }));
  const needle = q.trim().toLowerCase();
  const rows = all
    .filter(
      (r) =>
        (!needle ||
          r.name.toLowerCase().includes(needle) ||
          r.slug.includes(needle)) &&
        (!catF || r.categoryId === catF) &&
        (!statusF || r.serviceStatus === statusF),
    )
    .sort(
      (a, b) =>
        (order.get(a.categoryId ?? "") ?? 99) -
          (order.get(b.categoryId ?? "") ?? 99) || a.name.localeCompare(b.name),
    );
  const href = (slug: string) =>
    localHref(locale, `/ops/catalogue/${encodeURIComponent(slug)}`);

  const duplicate = async (r: Row) => {
    const n = all.filter((x) => x.slug.startsWith(`${r.slug}-copy`)).length + 1;
    const name = `${r.name} ${c.list.copySuffix}`;
    try {
      const res = await create.mutateAsync({
        name,
        slug: `${r.slug}-copy${n > 1 ? `-${n}` : ""}`,
        category: r.categoryId ?? r.category,
        subcategory: r.subcategoryId,
        is_featured: false,
      });
      const src = await getDraft(r.slug);
      const meta = src.meta as { name?: Record<string, string> };
      await putDraft(res.slug, {
        steps: src.steps,
        meta: {
          ...src.meta,
          name: Object.fromEntries(
            Object.entries(meta.name ?? {}).map(([k, v]) => [
              k,
              v ? `${v} ${c.list.copySuffix}` : v,
            ]),
          ),
        },
      });
      toast({
        tone: "success",
        title: fill(c.list.duplicated, { name }),
        action: {
          label: c.list.open,
          onClick: () => router.push(href(res.slug)),
        },
      });
    } catch {
      toast({ tone: "danger", title: c.list.duplicateFailed });
    }
  };

  const columns: OpsColumn<Row>[] = [
    {
      key: "service",
      label: c.list.cols.service,
      className: "min-w-64",
      wrap: true,
      sort: (r) => r.name,
      cell: (r) => (
        <span className="grid">
          <Link
            href={href(r.slug)}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-fg hover:underline"
          >
            {r.svc?.[`name_${locale}`] || r.name}
          </Link>
          <span className="text-eyebrow text-fg-subtle">
            {r.subcategoryLabel ?? r.slug}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      label: c.list.cols.status,
      className: "min-w-28",
      sort: (r) => r.serviceStatus,
      cell: (r) => (
        <Badge tone={TONE[r.serviceStatus] ?? "neutral"}>
          {c.serviceStatus[r.serviceStatus] ?? r.serviceStatus}
        </Badge>
      ),
    },
    {
      key: "version",
      label: c.list.cols.version,
      className: "min-w-32",
      wrap: true,
      sort: (r) => r.version,
      cell: (r) => (
        <span className="grid tabular">
          <span>{r.publishedVersion ? `v${r.publishedVersion}` : "—"}</span>
          {r.hasUnpublishedChanges && (
            <span className="text-eyebrow text-link">
              {fill(c.list.draftOf, { v: r.version })}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "pricing",
      label: c.list.cols.pricing,
      className: "min-w-20",
      cell: (r) =>
        c.pricingMode[r.svc?.pricing_mode ?? ""] ?? r.svc?.pricing_mode ?? "—",
    },
    {
      key: "sla",
      label: c.list.cols.sla,
      align: "right",
      className: "min-w-16",
      sort: (r) => r.svc?.pricing_tiers[0]?.etaBusinessDays ?? 0,
      cell: (r) => {
        const d = r.svc?.pricing_tiers[0]?.etaBusinessDays;
        return (
          <span className="inline-flex items-center gap-1 tabular">
            <Icon name="calendar" size={14} aria-hidden />
            {d ? fill(c.list.days, { n: d }) : "—"}
          </span>
        );
      },
    },
    {
      key: "active",
      label: c.list.cols.active,
      align: "right",
      className: "min-w-24",
      sort: (r) => r.applicationCount,
      cell: (r) => <span className="tabular">{r.applicationCount}</span>,
    },
    {
      key: "edited",
      label: c.list.cols.edited,
      className: "min-w-36",
      sort: (r) => r.updatedAt,
      cell: (r) => (
        <span className="tabular">{formatDateTime(r.updatedAt, locale)}</span>
      ),
    },
    {
      key: "actions",
      label: c.list.cols.actions,
      card: false,
      className: "min-w-28",
      cell: (r) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={create.isPending}
          onClick={(e) => {
            e.stopPropagation();
            duplicate(r);
          }}
          aria-label={`${c.list.duplicate} ${r.name}`}
        >
          {c.list.duplicate}
        </Button>
      ),
    },
  ];

  const filtered = !!(q || catF || statusF);
  return (
    <div className="grid gap-5 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">{c.list.title}</h1>
          <p className="text-small text-fg-subtle">{c.list.lede}</p>
        </div>
        <Button onClick={() => setCreating(true)} dots>
          {c.list.newService} <Kbd>N</Kbd>
        </Button>
      </header>
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <label className="relative min-w-0 flex-1 basis-56 sm:max-w-96">
          <span className="sr-only">{c.list.search}</span>
          <Icon
            name="search"
            size={16}
            aria-hidden
            className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setUrlParams({ q: e.target.value || null })}
            placeholder={c.list.search}
            className="h-10 pl-9"
          />
        </label>
        <Select
          aria-label={c.list.allCategories}
          value={catF}
          onChange={(e) => setUrlParams({ cat: e.target.value || null })}
          className="h-10 sm:!w-56"
        >
          <option value="">{c.list.allCategories}</option>
          {catList.map((x) => (
            <option key={x.id} value={x.id}>
              {catName(x, locale)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={c.list.allStatuses}
          value={statusF}
          onChange={(e) => setUrlParams({ status: e.target.value || null })}
          className="h-10 sm:!w-44"
        >
          <option value="">{c.list.allStatuses}</option>
          {["published", "draft", "paused"].map((s) => (
            <option key={s} value={s}>
              {c.serviceStatus[s]}
            </option>
          ))}
        </Select>
      </div>
      <OpsTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.slug}
        rowLabel={(r) => r.name}
        label={c.list.region}
        loading={structures.isPending || services.isPending}
        error={structures.error ?? services.error}
        onRetry={() => {
          structures.refetch();
          services.refetch();
        }}
        focused={focused}
        onFocus={setFocused}
        onOpen={(r) => router.push(href(r.slug))}
        shortcuts
        groupBy={(r) =>
          catName(catById.get(r.categoryId ?? ""), locale) ||
          c.list.uncategorised
        }
        groupHeader={(g, rs) => (
          <span className="flex items-center gap-2">
            <Icon name="chevronDown" size={14} aria-hidden />
            {g} <span className="text-fg-subtle tabular">({rs.length})</span>
          </span>
        )}
        empty={
          <EmptyState
            title={c.list.emptyTitle}
            body={c.list.emptyBody}
            action={
              filtered ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setUrlParams({ q: null, cat: null, status: null })
                  }
                >
                  {c.list.clear}
                </Button>
              ) : undefined
            }
          />
        }
      />
      {!structures.isPending && (
        <p className="text-small text-fg-subtle" aria-live="polite">
          {fill(c.list.showing, { n: rows.length })}
        </p>
      )}
      <NewServiceDialog
        open={creating}
        onClose={() => setCreating(false)}
        cats={catList}
        onCreated={(slug) => router.push(`${href(slug)}?step=details`)}
      />
    </div>
  );
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function NewServiceDialog({
  open,
  onClose,
  cats,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cats: Category[];
  onCreated: (slug: string) => void;
}) {
  const { locale } = useI18n();
  const c = opsCatalogue(locale).create;
  const phone = usePhone();
  const create = useCreateService();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [cat, setCat] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const s = slug ?? slugify(name);
  const close = () => {
    setName("");
    setSlug(null);
    setCat("");
    setErr({});
    onClose();
  };
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = c.required;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) e.slug = c.badSlug;
    if (!cat) e.cat = c.required;
    setErr(e);
    if (Object.keys(e).length) return;
    try {
      const r = await create.mutateAsync({
        name: name.trim(),
        slug: s,
        category: cat,
        is_featured: false,
      });
      close();
      onCreated(r.slug);
    } catch (x) {
      setErr(
        x instanceof ApiError && x.status === 409
          ? { slug: c.taken }
          : { form: c.failed },
      );
    }
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={c.title}
      side={phone ? "bottom" : undefined}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {c.cancel}
          </Button>
          <Button onClick={submit} loading={create.isPending} dots>
            {c.submit}
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
        {err.form && (
          <p role="alert" className="text-small text-danger">
            {err.form}
          </p>
        )}
        <Field label={c.name} error={err.name}>
          {(a) => (
            <Input
              id={a.id}
              aria-describedby={a.describedBy}
              aria-invalid={a.invalid}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
          )}
        </Field>
        <Field label={c.slug} hint={c.slugHint} error={err.slug}>
          {(a) => (
            <Input
              id={a.id}
              aria-describedby={a.describedBy}
              aria-invalid={a.invalid}
              value={s}
              onChange={(e) => setSlug(e.target.value)}
              className={cx("h-10 font-mono")}
            />
          )}
        </Field>
        <Field label={c.category} error={err.cat}>
          {(a) => (
            <Select
              id={a.id}
              aria-describedby={a.describedBy}
              aria-invalid={a.invalid}
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="h-10"
            >
              <option value="">{c.pick}</option>
              {cats.map((x) => (
                <option key={x.id} value={x.id}>
                  {catName(x, locale)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

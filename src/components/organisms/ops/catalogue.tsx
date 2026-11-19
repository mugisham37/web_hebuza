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
  useSubcategories,
  useCatalogueWrite,
  createCategory,
  patchCategory,
  deleteCategory,
  createSubcategory,
  patchSubcategory,
  deleteSubcategory,
  setServiceStatus,
  deleteService,
  type StructureRow,
  type ServiceRow,
  type Category,
  type Subcategory,
  getDraft,
  putDraft,
} from "@/lib/ops/e";
import { ApiError } from "@/lib/api/client";
import { opsCatalogue } from "@/content/pages/ops-catalogue";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select, Switch } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { EmptyState, ErrorState, Spinner } from "@/components/atoms/feedback";
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
  const [taxonomy, setTaxonomy] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);
  const create = useCreateService();
  const status = useCatalogueWrite((v: { slug: string; status: string }) => setServiceStatus(v.slug, v.status));
  const remove = useCatalogueWrite(deleteService);
  const fail = (x: unknown) =>
    toast({ tone: "danger", title: x instanceof ApiError ? (x.isForbidden ? c.taxonomy.forbidden : x.message) : c.taxonomy.failed });
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
      className: "min-w-80",
      cell: (r) => (
        <span className="flex flex-wrap items-center gap-2">
        <Select
          aria-label={fill(c.taxonomy.status, { name: r.name })}
          value={r.serviceStatus}
          disabled={status.isPending}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            status.mutate(
              { slug: r.slug, status: e.target.value },
              { onSuccess: () => toast({ tone: "success", title: fill(c.taxonomy.statusSaved, { s: c.serviceStatus[e.target.value] ?? e.target.value }) }), onError: fail },
            )
          }
          className="h-8 !w-32"
        >
          {["draft", "published", "paused", "archived"].map((s) => (
            <option key={s} value={s}>
              {c.serviceStatus[s]}
            </option>
          ))}
        </Select>
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
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={(e) => {
            e.stopPropagation();
            setRemoving(r);
          }}
          aria-label={`${c.taxonomy.del} ${r.name}`}
        >
          {c.taxonomy.del}
        </Button>
        </span>
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
        <span className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTaxonomy(true)}>
            {c.taxonomy.manage}
          </Button>
          <Button onClick={() => setCreating(true)} dots>
            {c.list.newService} <Kbd>N</Kbd>
          </Button>
        </span>
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
      <TaxonomyDialog open={taxonomy} onClose={() => setTaxonomy(false)} />
      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={fill(c.taxonomy.delSvc, { name: removing?.name ?? "" })}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {c.taxonomy.cancel}
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.slug, {
                  onSuccess: () => {
                    setRemoving(null);
                    toast({ tone: "success", title: c.taxonomy.deleted });
                  },
                  onError: fail,
                })
              }
            >
              {c.taxonomy.confirm}
            </Button>
          </>
        }
      >
        <p className="text-body text-fg-muted">{c.taxonomy.delSvcBody}</p>
      </Dialog>
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

type Draft = { kind: "cat" | "sub"; id?: string; category_id: string; name_rw: string; name_en: string; name_fr: string };

/** U16 category/subcategory CRUD (F-CAT-02): names in rw/en/fr, active toggle, delete (server refuses when in use). */
function TaxonomyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const c = opsCatalogue(locale).taxonomy;
  const toast = useToast();
  const phone = usePhone();
  const cats = useCategories();
  const subs = useSubcategories();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const done = (title: string) => () => toast({ tone: "success", title });
  const fail = (x: unknown) =>
    toast({ tone: "danger", title: x instanceof ApiError ? (x.isForbidden ? c.forbidden : x.message) : c.failed });
  const save = useCatalogueWrite(({ kind, id, ...b }: Draft) =>
    kind === "cat"
      ? id ? patchCategory(id, b) : createCategory({ ...b, is_active: true })
      : id ? patchSubcategory(id, b) : createSubcategory({ ...b, is_active: true }),
  );
  const toggle = useCatalogueWrite((v: { kind: "cat" | "sub"; id: string; on: boolean }) =>
    v.kind === "cat" ? patchCategory(v.id, { is_active: v.on }) : patchSubcategory(v.id, { is_active: v.on }),
  );
  const del = useCatalogueWrite((v: { kind: "cat" | "sub"; id: string }) =>
    v.kind === "cat" ? deleteCategory(v.id) : deleteSubcategory(v.id),
  );
  const submit = () => {
    if (!draft) return;
    if (![draft.name_rw, draft.name_en, draft.name_fr].every((x) => x.trim())) return setErr(c.required);
    setErr("");
    save.mutate(draft, { onSuccess: () => { setDraft(null); done(c.saved)(); }, onError: fail });
  };
  const list = [...(cats.data?.categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const edit = (kind: "cat" | "sub", x?: Category | Subcategory, category_id = "") =>
    setDraft({ kind, id: x?.id, category_id: x && "category_id" in x ? x.category_id : category_id, name_rw: x?.name_rw ?? "", name_en: x?.name_en ?? "", name_fr: x?.name_fr ?? "" });
  const row = (kind: "cat" | "sub", x: Category | Subcategory) => (
    <span className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 flex-1 basis-40">
        {x[`name_${locale}`] || x.name_en}
        {x.service_count != null && <span className="ml-2 text-small text-fg-subtle tabular">{fill(c.count, { n: x.service_count })}</span>}
      </span>
      <Switch
        label={c.active}
        checked={x.is_active}
        disabled={toggle.isPending}
        onChange={(e) => toggle.mutate({ kind, id: x.id, on: e.target.checked }, { onError: fail })}
      />
      <Button size="sm" variant="outline" className="h-8" onClick={() => edit(kind, x)} aria-label={`${c.edit} ${x.name_en}`}>
        {c.edit}
      </Button>
      <Button size="sm" variant="outline" className="h-8" disabled={del.isPending} onClick={() => del.mutate({ kind, id: x.id }, { onSuccess: done(c.deleted), onError: fail })} aria-label={`${c.del} ${x.name_en}`}>
        {c.del}
      </Button>
    </span>
  );
  return (
    <Dialog
      open={open}
      onClose={() => { setDraft(null); onClose(); }}
      title={c.title}
      description={c.lede}
      side={phone ? "bottom" : undefined}
      footer={draft ? (
        <>
          <Button variant="outline" onClick={() => setDraft(null)}>{c.cancel}</Button>
          <Button onClick={submit} loading={save.isPending}>{c.save}</Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={onClose}>{c.close}</Button>
          <Button onClick={() => edit("cat")}>{c.addCat}</Button>
        </>
      )}
    >
      {draft ? (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {err && <p role="alert" className="text-small text-danger">{err}</p>}
          {draft.kind === "sub" && (
            <Field label={c.parent}>
              {(a) => (
                <Select id={a.id} value={draft.category_id} onChange={(e) => setDraft({ ...draft, category_id: e.target.value })} className="h-10">
                  {list.map((x) => <option key={x.id} value={x.id}>{catName(x, locale)}</option>)}
                </Select>
              )}
            </Field>
          )}
          {(["rw", "en", "fr"] as const).map((l) => (
            <Field key={l} label={fill(c.nameIn, { lang: l.toUpperCase() })}>
              {(a) => (
                <Input id={a.id} aria-describedby={a.describedBy} value={draft[`name_${l}`]} maxLength={128} onChange={(e) => setDraft({ ...draft, [`name_${l}`]: e.target.value })} className="h-10" />
              )}
            </Field>
          ))}
          <button type="submit" hidden />
        </form>
      ) : cats.isPending || subs.isPending ? (
        <Spinner label={c.title} />
      ) : cats.error || subs.error ? (
        <ErrorState error={cats.error ?? subs.error} onRetry={() => { cats.refetch(); subs.refetch(); }} />
      ) : !list.length ? (
        <EmptyState title={c.empty} />
      ) : (
        <ul className="grid gap-4">
          {list.map((cat) => {
            const children = (subs.data?.subcategories ?? []).filter((s) => s.category_id === cat.id);
            return (
              <li key={cat.id} className="grid gap-2 border-b border-border pb-3">
                <span className="font-medium">{row("cat", cat)}</span>
                <ul className="grid gap-2 pl-4" aria-label={catName(cat, locale)}>
                  {children.length ? children.map((s) => <li key={s.id}>{row("sub", s)}</li>) : <li className="text-small text-fg-subtle">{c.noSubs}</li>}
                </ul>
                <Button size="sm" variant="ghost" className="h-8 justify-self-start" onClick={() => edit("sub", undefined, cat.id)}>
                  {c.addSub}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}

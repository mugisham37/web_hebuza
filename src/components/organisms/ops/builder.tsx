"use client";
// U16–U17 service builder (boards 16 v2 SB2–SB4, 17 v2 SP1–SP3). One page, `?step=` picks the editor.
// The draft (details, form, documents, checklist, deliverables, SLA) autosaves to PUT /structure/draft;
// pricing saves on its own (PUT /pricing + PATCH /pricing/{tier}); publishing lives in the versions step.
// Reorder is ↑/↓ buttons + Alt+↑/↓ on the focused item (no drag library, keyboard-first).
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import {
  LANGS,
  FIELD_TYPES,
  l3,
  newId,
  move,
  editField,
  moveField,
  flatFields,
  langGaps,
  blockers,
  fromStructure,
  useDraft,
  useService,
  useCategories,
  useSubcategories,
  useSaveDraft,
  type Draft,
  type FormField,
  type FieldType,
  type Lang,
  type L3,
  type Structure,
  type ServiceDetail,
  PROFILE_PATHS,
} from "@/lib/ops/e";
import { ApiError } from "@/lib/api/client";
import {
  opsCatalogue,
  type CatalogueCopy,
} from "@/content/pages/ops-catalogue";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";
import { Dialog } from "@/components/atoms/dialog";
import {
  Field,
  Input,
  Select,
  Textarea,
  Switch,
  Checkbox,
} from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { ServiceFacts } from "@/components/organisms/ops/service-facts";
import { PriceChanges } from "@/components/organisms/ops/price-changes";
import { Skeleton, ErrorState, EmptyState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { Kbd } from "@/components/atoms/ops";
import { usePhone } from "@/components/atoms/step-up";
import { fill, catName } from "@/components/organisms/ops/catalogue";
import { PricingStep, SlaStep, VersionsStep } from "@/components/organisms/ops/builder-pricing";
import { Preview } from "@/components/organisms/ops/service-preview";

export const STEPS = [
  "details",
  "form",
  "documents",
  "checklist",
  "deliverables",
  "pricing",
  "sla",
  "versions",
] as const;
type Step = (typeof STEPS)[number];
export type Update = (fn: (d: Draft) => Draft) => void;
export const useC = () => {
  const { locale } = useI18n();
  return { c: opsCatalogue(locale), locale };
};

export function BuilderView({ slug }: { slug: string }) {
  const { c, locale } = useC();
  const draft = useDraft(slug);
  const service = useService(slug);
  const err = draft.error ?? service.error;
  if (draft.isPending || service.isPending)
    return (
      <div
        className="grid gap-4 px-4 pt-6 pb-24 lg:grid-cols-[14rem_1fr] lg:px-6"
        aria-busy="true"
      >
        <Skeleton className="h-80" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  if (err || !draft.data || !service.data)
    return (
      <div className="mx-auto grid max-w-xl gap-4 px-4 pt-10 pb-24">
        {err instanceof ApiError && err.status === 404 ? (
          <EmptyState
            title={c.builder.notFound}
            action={
              <ButtonLink
                href={localHref(locale, "/ops/catalogue")}
                variant="outline"
              >
                {c.builder.back}
              </ButtonLink>
            }
          />
        ) : (
          <ErrorState
            error={err}
            onRetry={() => {
              draft.refetch();
              service.refetch();
            }}
            className="border border-border bg-white"
          />
        )}
      </div>
    );
  return (
    <Editor
      key={`${slug}:${draft.data.version}:${draft.data.publishedVersion ?? 0}`}
      slug={slug}
      initial={draft.data}
      service={service.data}
    />
  );
}

function Editor({
  slug,
  initial,
  service,
}: {
  slug: string;
  initial: Structure;
  service: ServiceDetail;
}) {
  const { c, locale } = useC();
  const p = useUrlParams();
  const phone = usePhone();
  const step: Step = (STEPS as readonly string[]).includes(p.get("step") ?? "")
    ? (p.get("step") as Step)
    : "details";
  const lang: Lang = (LANGS as readonly string[]).includes(p.get("lang") ?? "")
    ? (p.get("lang") as Lang)
    : locale;
  const [draft, setDraft] = useState<Draft>(() => fromStructure(initial));
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const rev = useRef(0);
  const save = useSaveDraft(slug);
  const update: Update = (fn) => {
    rev.current += 1;
    setDraft(fn);
    setDirty(true);
  };
  const flush = (d: Draft) => {
    const r = rev.current;
    save.mutate(d, {
      onSuccess: () => {
        if (rev.current === r) setDirty(false);
        setSavedAt(
          new Date().toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      },
    });
  };
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => flush(draft), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on draft edits only
  }, [draft, dirty]);

  const go = (s: Step) => setUrlParams({ step: s, field: null });
  const idx = STEPS.indexOf(step);
  useShortcut(
    "]",
    c.builder.steps[STEPS[Math.min(STEPS.length - 1, idx + 1)]],
    () => go(STEPS[Math.min(STEPS.length - 1, idx + 1)]),
    "case",
  );
  useShortcut(
    "[",
    c.builder.steps[STEPS[Math.max(0, idx - 1)]],
    () => go(STEPS[Math.max(0, idx - 1)]),
    "case",
  );
  useShortcut("p", c.builder.preview, () => setPreview(true), "case");

  const issues = blockers(draft);
  const stepIssue: Partial<Record<Step, boolean>> = {
    details: issues.some(
      (b) => b.kind === "name" || b.kind === "category" || b.kind === "lang",
    ),
    form: issues.some((b) => b.kind === "fields" || b.kind === "group"),
  };
  const name = draft.name[lang] || draft.name.en || service.name;

  const chip = save.isError ? (
    <span
      className="inline-flex items-center gap-2 text-small text-danger"
      role="status"
    >
      <Icon name="x" size={14} aria-hidden /> {c.builder.saveFailed}
      <button
        type="button"
        onClick={() => flush(draft)}
        className="min-h-6 font-medium underline"
      >
        {c.builder.retry}
      </button>
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 text-small text-fg-subtle"
      role="status"
    >
      <Icon
        name={save.isPending ? "refresh" : dirty ? "clock" : "check"}
        size={14}
        aria-hidden
      />
      {save.isPending
        ? c.builder.saving
        : dirty
          ? c.builder.unsaved
          : savedAt
            ? fill(c.builder.autosaved, { t: savedAt })
            : fill(c.builder.autosaved, {
                t: new Date(initial.updatedAt).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
    </span>
  );

  const body: Record<Step, ReactNode> = {
    details: (
      <>
        <DetailsStep draft={draft} update={update} lang={lang} />
        <ServiceFacts slug={slug} service={service} lang={lang} c={c.facts} p={c.prices} />
      </>
    ),
    form: <FormStep draft={draft} update={update} lang={lang} />,
    documents: <DocumentsStep draft={draft} update={update} lang={lang} />,
    checklist: <ChecklistStep draft={draft} update={update} lang={lang} />,
    deliverables: (
      <DeliverablesStep draft={draft} update={update} lang={lang} />
    ),
    pricing: (
      <>
        <PricingStep slug={slug} service={service} />
        <PriceChanges slug={slug} c={c.prices} />
      </>
    ),
    sla: <SlaStep draft={draft} update={update} service={service} />,
    versions: (
      <VersionsStep
        slug={slug}
        draft={draft}
        version={initial.version}
        publishedVersion={initial.publishedVersion ?? null}
        dirty={dirty}
        flushNow={() => flush(draft)}
      />
    ),
  };

  return (
    <div className="grid gap-5 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border border-border bg-white px-4 py-3">
        <div className="grid min-w-0 gap-0.5">
          <Link
            href={localHref(locale, "/ops/catalogue")}
            className="inline-flex min-h-6 items-center gap-1 text-small text-fg-subtle hover:text-fg"
          >
            <Icon
              name="arrowRight"
              size={14}
              className="rotate-180"
              aria-hidden
            />
            {c.builder.back}
          </Link>
          <h1 className="text-card-title break-words">
            {name}{" "}
            <span className="text-body font-normal text-fg-subtle">
              · {fill(c.builder.draftV, { v: initial.version })} (
              {initial.publishedVersion
                ? fill(c.builder.publishedV, { v: initial.publishedVersion })
                : c.builder.neverPublished}
              )
            </span>
          </h1>
          {chip}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(true)}>
            {c.builder.preview} <Kbd>P</Kbd>
          </Button>
          <Button
            size="sm"
            dots
            onClick={() => setUrlParams({ step: "versions", publish: "1" })}
          >
            {c.builder.publish}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label={c.builder.rail} className="min-w-0">
          <ol className="theme-dark flex gap-1 overflow-x-auto bg-navy-900 p-2 lg:grid lg:overflow-visible">
            {STEPS.map((s, i) => {
              const cur = s === step;
              return (
                <li key={s} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => go(s)}
                    aria-current={cur ? "step" : undefined}
                    className={cx(
                      "flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-small whitespace-nowrap",
                      cur
                        ? "bg-secondary text-on-secondary"
                        : "text-fg hover:bg-white/10",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cx(
                        "flex size-5 shrink-0 items-center justify-center border text-[11px]",
                        cur ? "border-navy-700" : "border-border",
                        stepIssue[s] && "bg-warning-bg text-fg",
                      )}
                    >
                      {stepIssue[s] ? "!" : i + 1}
                    </span>
                    {c.builder.steps[s]}
                    {stepIssue[s] && (
                      <span className="sr-only">({c.versions.blocked})</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <main className="min-w-0 border border-border bg-white p-4 lg:p-6">
          {(
            [
              "details",
              "form",
              "documents",
              "checklist",
              "deliverables",
            ] as Step[]
          ).includes(step) && <LangTabs draft={draft} lang={lang} />}
          {body[step]}
        </main>
      </div>
      <Preview
        open={preview}
        onClose={() => setPreview(false)}
        draft={draft}
        service={service}
        version={initial.version}
        phone={phone}
      />
    </div>
  );
}

/** rw/en/fr switch with a completeness dot per language (colour + text). */
function LangTabs({ draft, lang }: { draft: Draft; lang: Lang }) {
  const { c } = useC();
  return (
    <div
      className="mb-5 flex flex-wrap gap-1 border-b border-border"
      role="group"
      aria-label={c.details.languages}
    >
      {LANGS.map((l) => {
        const gaps = langGaps(draft, l);
        return (
          <button
            key={l}
            type="button"
            aria-pressed={l === lang}
            onClick={() => setUrlParams({ lang: l })}
            className={cx(
              "-mb-px flex min-h-10 items-center gap-2 border-b-2 px-3 text-small",
              l === lang
                ? "border-navy-700 font-medium text-fg"
                : "border-transparent text-fg-subtle hover:text-fg",
            )}
          >
            <span
              aria-hidden
              className={cx(
                "size-2 rounded-full",
                gaps ? "bg-gold-400 ring-1 ring-warning" : "bg-success",
              )}
            />
            {c.lang[l]}
            <span className="text-eyebrow text-fg-subtle">
              {gaps ? fill(c.builder.missing, { n: gaps }) : c.builder.complete}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- shared bits
/** ↑ / ↓ / remove for a list item; Alt+↑/↓ on the item does the same (see reorderKeys). */
function ItemControls({
  label,
  i,
  n,
  onMove,
  onRemove,
}: {
  label: string;
  i: number;
  n: number;
  onMove: (d: -1 | 1) => void;
  onRemove?: () => void;
}) {
  const { c } = useC();
  const btn =
    "flex size-8 items-center justify-center text-fg-muted hover:bg-navy-50 hover:text-fg disabled:opacity-30";
  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        className={btn}
        disabled={i === 0}
        onClick={() => onMove(-1)}
        aria-label={fill(c.builder.up, { label })}
      >
        <Icon name="chevronDown" size={16} className="rotate-180" aria-hidden />
      </button>
      <button
        type="button"
        className={btn}
        disabled={i === n - 1}
        onClick={() => onMove(1)}
        aria-label={fill(c.builder.down, { label })}
      >
        <Icon name="chevronDown" size={16} aria-hidden />
      </button>
      {onRemove && (
        <button
          type="button"
          className={cx(btn, "hover:text-danger")}
          onClick={onRemove}
          aria-label={fill(c.builder.remove, { label })}
        >
          <Icon name="x" size={16} aria-hidden />
        </button>
      )}
    </span>
  );
}
const reorderKeys = (onMove: (d: -1 | 1) => void) => (e: KeyboardEvent) => {
  if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
  e.preventDefault();
  onMove(e.key === "ArrowUp" ? -1 : 1);
  const el = e.currentTarget as HTMLElement;
  requestAnimationFrame(() => el.focus());
};
/** Remove with an Undo toast (restores the snapshot taken before the removal). */
function useRemove(update: Update, draft: Draft) {
  const { c } = useC();
  const toast = useToast();
  return (label: string, fn: (d: Draft) => Draft) => {
    const snapshot = draft;
    update(fn);
    toast({
      title: fill(c.builder.removed, { label }),
      action: { label: c.builder.undo, onClick: () => update(() => snapshot) },
    });
  };
}
function Announce({ msg }: { msg: string }) {
  return (
    <p className="sr-only" aria-live="polite">
      {msg}
    </p>
  );
}
const setL = (v: L3, l: Lang, s: string): L3 => ({ ...v, [l]: s });
function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-card-title">{children}</h2>
      {hint && <p className="text-small text-fg-subtle">{hint}</p>}
    </div>
  );
}
const inp = "h-10";

// ---------------------------------------------------------------- SB2 details
function DetailsStep({
  draft,
  update,
  lang,
}: {
  draft: Draft;
  update: Update;
  lang: Lang;
}) {
  const { c, locale } = useC();
  const cats = useCategories();
  const subs = useSubcategories();
  const remove = useRemove(update, draft);
  const [msg, setMsg] = useState("");
  const subList = (subs.data?.subcategories ?? []).filter(
    (s) => s.category_id === draft.categoryId,
  );
  const moveQ = (i: number, d: -1 | 1, label: string) => {
    update((x) => ({ ...x, eligibility: move(x.eligibility, i, d) }));
    setMsg(
      fill(c.builder.moved, {
        label,
        n: i + d + 1,
      }),
    );
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="grid content-start gap-4">
        <SectionTitle>{c.details.title}</SectionTitle>
        <Field label={`${c.details.name} (${c.lang[lang]}) *`}>
          {(a) => (
            <Input
              id={a.id}
              value={draft.name[lang]}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  name: setL(d.name, lang, e.target.value),
                }))
              }
              className={inp}
            />
          )}
        </Field>
        <Field
          label={`${c.details.short} (${c.lang[lang]}) *`}
          hint={`${draft.short[lang].length}/500`}
        >
          {(a) => (
            <Textarea
              id={a.id}
              aria-describedby={a.describedBy}
              maxLength={500}
              value={draft.short[lang]}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  short: setL(d.short, lang, e.target.value),
                }))
              }
            />
          )}
        </Field>
        <fieldset className="grid gap-2">
          <legend className="text-label">{c.details.languages}</legend>
          <p className="text-small text-fg-subtle">{c.details.languagesHint}</p>
          <div className="flex flex-wrap gap-4">
            {LANGS.map((l) => (
              <Checkbox
                key={l}
                label={c.lang[l]}
                checked={draft.languages.includes(l)}
                disabled={
                  draft.languages.length === 1 && draft.languages.includes(l)
                }
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    languages: e.target.checked
                      ? LANGS.filter((x) => x === l || d.languages.includes(x))
                      : d.languages.filter((x) => x !== l),
                  }))
                }
              />
            ))}
          </div>
        </fieldset>
      </section>
      <aside className="grid content-start gap-4 bg-bg-subtle p-4">
        <Field label={c.details.category}>
          {(a) => (
            <Select
              id={a.id}
              value={draft.categoryId}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  categoryId: e.target.value,
                  subcategoryId: "",
                }))
              }
              className={inp}
            >
              <option value="">{c.create.pick}</option>
              {(cats.data?.categories ?? []).map((x) => (
                <option key={x.id} value={x.id}>
                  {catName(x, locale)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={c.details.sub}>
          {(a) => (
            <Select
              id={a.id}
              value={draft.subcategoryId}
              disabled={!subList.length}
              onChange={(e) =>
                update((d) => ({ ...d, subcategoryId: e.target.value }))
              }
              className={inp}
            >
              <option value="">{c.details.none}</option>
              {subList.map((x) => (
                <option key={x.id} value={x.id}>
                  {x[`name_${locale}`] || x.name_en}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <section className="grid gap-3">
          <SectionTitle hint={c.details.eligibilityHint}>
            {c.details.eligibility}
          </SectionTitle>
          {!draft.eligibility.length && (
            <p className="text-small text-fg-subtle">{c.details.noQuestions}</p>
          )}
          <ol className="grid gap-2">
            {draft.eligibility.map((q, i) => {
              const label = q.q[lang] || c.builder.untitled;
              return (
                <li
                  key={q.id}
                  tabIndex={-1}
                  onKeyDown={reorderKeys((d) => moveQ(i, d, label))}
                  className="grid gap-2 border border-border bg-white p-3"
                >
                  <div className="flex items-start gap-1">
                    <label className="grid min-w-0 flex-1 gap-1 text-small">
                      <span className="sr-only">{`${c.details.question} ${i + 1}`}</span>
                      <Input
                        value={q.q[lang]}
                        placeholder={c.details.question}
                        onKeyDown={reorderKeys((d) => moveQ(i, d, label))}
                        onChange={(e) =>
                          update((d) => ({
                            ...d,
                            eligibility: d.eligibility.map((x) =>
                              x.id === q.id
                                ? { ...x, q: setL(x.q, lang, e.target.value) }
                                : x,
                            ),
                          }))
                        }
                        className={inp}
                      />
                    </label>
                    <ItemControls
                      label={label}
                      i={i}
                      n={draft.eligibility.length}
                      onMove={(d) => moveQ(i, d, label)}
                      onRemove={() =>
                        remove(label, (d) => ({
                          ...d,
                          eligibility: d.eligibility.filter(
                            (x) => x.id !== q.id,
                          ),
                        }))
                      }
                    />
                  </div>
                  <Switch
                    label={c.details.blocking}
                    checked={q.blocking}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        eligibility: d.eligibility.map((x) =>
                          x.id === q.id
                            ? { ...x, blocking: e.target.checked }
                            : x,
                        ),
                      }))
                    }
                    className="text-small"
                  />
                </li>
              );
            })}
          </ol>
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() =>
              update((d) => ({
                ...d,
                eligibility: [
                  ...d.eligibility,
                  { id: newId("el"), q: l3(), blocking: false },
                ],
              }))
            }
          >
            <Icon name="plus" size={16} aria-hidden /> {c.details.addQuestion}
          </Button>
          <Announce msg={msg} />
        </section>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- SB3 form builder
const PALETTE_ICON: Record<FieldType, Parameters<typeof Icon>[0]["name"]> = {
  text: "menu",
  number: "chart",
  date: "calendar",
  select: "chevronDown",
  multi: "layers",
  phone: "phone",
  id: "card",
  address: "mapPin",
  file: "file",
  group: "users",
  isic: "search",
};
const blankField = (type: FieldType, c: CatalogueCopy): FormField => ({
  id: newId("f"),
  type,
  label: l3(c.form.types[type], "", ""),
  help: l3(),
  required: false,
  validation: type === "phone" ? "phone" : type === "id" ? "nid" : "none",
  options:
    type === "select" || type === "multi"
      ? ["Option 1", "Option 2"]
      : undefined,
  children: type === "group" ? [] : undefined,
});

function FormStep({
  draft,
  update,
  lang,
}: {
  draft: Draft;
  update: Update;
  lang: Lang;
}) {
  const { c } = useC();
  const p = useUrlParams();
  const phone = usePhone();
  const remove = useRemove(update, draft);
  const [msg, setMsg] = useState("");
  const selId = p.get("field");
  const all = flatFields(draft.fields);
  const sel = all.find((f) => f.id === selId) ?? null;
  const select = (id: string | null) => setUrlParams({ field: id });
  const add = (type: FieldType) => {
    const f = blankField(type, c);
    update((d) => ({ ...d, fields: [...d.fields, f] }));
    select(f.id);
  };
  const doMove = (fs: FormField[], i: number, d: -1 | 1) => {
    const f = fs[i];
    update((x) => ({ ...x, fields: moveField(x.fields, f.id, d) }));
    setMsg(
      fill(c.builder.moved, {
        label: f.label[lang] || c.builder.untitled,
        n: i + d + 1,
      }),
    );
  };
  const card = (
    f: FormField,
    i: number,
    fs: FormField[],
    nested = false,
  ): ReactNode => {
    const label = f.label[lang] || f.label.en || c.builder.untitled;
    const on = f.id === selId;
    const vis = f.visibleIf ?? null;
    const visSrc = vis ? all.find((x) => x.id === vis.field) : undefined;
    const visText = vis
      ? ` · ${fill(c.form.showIf, { field: visSrc ? visSrc.label[lang] : "?", value: vis.equals })}`
      : "";
    const totalChild = f.totalField
      ? (f.children ?? []).find((x) => x.id === f.totalField)
      : undefined;
    return (
      <li
        key={f.id}
        className={cx(
          "border bg-white",
          on
            ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700"
            : "border-border border-dashed",
        )}
      >
        <div className="flex items-center gap-1 p-2 pl-3">
          <button
            type="button"
            onClick={() => select(f.id)}
            onKeyDown={reorderKeys((d) => doMove(fs, i, d))}
            aria-pressed={on}
            className="grid min-h-10 min-w-0 flex-1 text-left"
          >
            <span className="truncate font-medium">
              {label}
              {f.required && <span className="text-danger"> *</span>}
            </span>
            <span className="truncate text-eyebrow text-fg-subtle">
              {c.form.types[f.type]}
              {visText}
            </span>
          </button>
          <ItemControls
            label={label}
            i={i}
            n={fs.length}
            onMove={(d) => doMove(fs, i, d)}
            onRemove={() => {
              if (on) select(null);
              remove(label, (d) => ({
                ...d,
                fields: editField(d.fields, f.id, () => null),
              }));
            }}
          />
        </div>
        {f.type === "group" && !nested && (
          <div className="border-t border-border p-2 pl-6">
            <ol className="grid gap-2">
              {(f.children ?? []).map((ch, j, arr) => card(ch, j, arr, true))}
            </ol>
            {f.totalField && (
              <p className="mt-2 text-eyebrow text-link">
                {fill(c.form.totalRule, {
                  field: totalChild ? totalChild.label[lang] : "?",
                })}
              </p>
            )}
          </div>
        )}
      </li>
    );
  };
  const settings = sel && (
    <FieldSettings field={sel} draft={draft} update={update} lang={lang} />
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)] 2xl:grid-cols-[12rem_minmax(0,1fr)_20rem]">
      <section aria-labelledby="palette-h" className="min-w-0">
        <h2 id="palette-h" className="text-label">
          {c.form.palette}
        </h2>
        <p className="mb-2 text-eyebrow text-fg-subtle">{c.form.paletteHint}</p>
        <ul className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
          {FIELD_TYPES.map((t) => (
            <li key={t} className="shrink-0">
              <button
                type="button"
                onClick={() => add(t)}
                aria-label={fill(c.form.add, { type: c.form.types[t] })}
                className="flex min-h-9 w-full items-center gap-2 border border-border px-2.5 text-small whitespace-nowrap hover:bg-navy-50 lg:border-transparent"
              >
                <Icon name={PALETTE_ICON[t]} size={16} aria-hidden />
                {c.form.types[t]}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="canvas-h" className="min-w-0">
        <h2 id="canvas-h" className="text-label">
          {c.form.canvas}
        </h2>
        <p className="mb-2 text-eyebrow text-fg-subtle">
          {c.builder.reorderHint}
        </p>
        {draft.fields.length ? (
          <ol className="grid gap-2">
            {draft.fields.map((f, i, arr) => card(f, i, arr))}
          </ol>
        ) : (
          <EmptyState
            title={c.form.empty}
            className="border border-dashed border-border"
          />
        )}
        <Announce msg={msg} />
      </section>
      {phone ? (
        <Dialog
          open={!!sel}
          onClose={() => select(null)}
          side="bottom"
          title={c.form.settings}
          footer={<Button onClick={() => select(null)}>{c.form.close}</Button>}
        >
          {settings}
        </Dialog>
      ) : (
        <aside
          className="min-w-0 border border-border p-4 lg:col-span-2 2xl:col-span-1"
          aria-label={c.form.settings}
        >
          <h2 className="mb-3 text-label">{c.form.settings}</h2>
          {settings ?? (
            <p className="text-small text-fg-subtle">{c.form.pickField}</p>
          )}
        </aside>
      )}
    </div>
  );
}

function FieldSettings({
  field,
  draft,
  update,
  lang,
}: {
  field: FormField;
  draft: Draft;
  update: Update;
  lang: Lang;
}) {
  const { c } = useC();
  const set = (patch: Partial<FormField>) =>
    update((d) => ({
      ...d,
      fields: editField(d.fields, field.id, (f) => ({ ...f, ...patch })),
    }));
  const sources = flatFields(draft.fields).filter(
    (f) =>
      f.id !== field.id &&
      (f.type === "select" || f.type === "multi") &&
      f.options?.length,
  );
  const rule = field.visibleIf ?? null;
  const ruleField = rule ? rule.field : "";
  const ruleSource = sources.find((f) => f.id === ruleField) ?? null;
  const validations =
    field.type === "number"
      ? ["none", "percent"]
      : field.type === "text"
        ? ["none", "tin", "email"]
        : field.type === "id"
          ? ["nid"]
          : field.type === "phone"
            ? ["phone"]
            : ["none"];
  const numbers = (field.children ?? []).filter((f) => f.type === "number");
  return (
    <div className="grid gap-3">
      {LANGS.map((l) => (
        <Field key={l} label={fill(c.form.label, { lang: c.lang[l] })}>
          {(a) => (
            <Input
              id={a.id}
              value={field.label[l]}
              onChange={(e) =>
                set({ label: setL(field.label, l, e.target.value) })
              }
              className={inp}
            />
          )}
        </Field>
      ))}
      <Switch
        label={c.form.required}
        checked={field.required}
        onChange={(e) => set({ required: e.target.checked })}
      />
      {field.type !== "group" && (
        <Field label={c.form.validation}>
          {(a) => (
            <Select
              id={a.id}
              value={field.validation}
              onChange={(e) =>
                set({ validation: e.target.value as FormField["validation"] })
              }
              className={inp}
            >
              {validations.map((v) => (
                <option key={v} value={v}>
                  {c.form.validations[v]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Field label={fill(c.form.help, { lang: c.lang[lang] })}>
        {(a) => (
          <Input
            id={a.id}
            value={field.help[lang]}
            onChange={(e) =>
              set({ help: setL(field.help, lang, e.target.value) })
            }
            className={inp}
          />
        )}
      </Field>
      <Field label={c.form.profile} hint={c.form.profileHint}>
        {(a) => (
          <Select id={a.id} aria-describedby={a.describedBy} value={field.profile ?? ""} onChange={(e) => set({ profile: e.target.value || null })} className={inp}>
            <option value="">{c.form.profileNone}</option>
            {PROFILE_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        )}
      </Field>
      {(field.type === "select" || field.type === "multi") && (
        <Field label={c.form.options} hint={c.form.optionsHint}>
          {(a) => (
            <Textarea
              id={a.id}
              aria-describedby={a.describedBy}
              className="min-h-24"
              value={(field.options ?? []).join("\n")}
              onChange={(e) => set({ options: e.target.value.split("\n") })}
            />
          )}
        </Field>
      )}
      <fieldset className="grid gap-2">
        <legend className="text-label">{c.form.visibility}</legend>
        <Select
          aria-label={c.form.whenField}
          value={ruleField}
          onChange={(e) => {
            const src = sources.find((f) => f.id === e.target.value);
            set({
              visibleIf: src
                ? { field: src.id, equals: (src.options ?? [])[0] ?? "" }
                : null,
            });
          }}
          className={inp}
        >
          <option value="">{c.form.always}</option>
          {sources.map((f) => (
            <option key={f.id} value={f.id}>
              {`${c.form.whenField} “${f.label[lang] || f.label.en}”`}
            </option>
          ))}
        </Select>
        {ruleSource && rule && (
          <Select
            aria-label={c.form.equals}
            value={rule.equals}
            onChange={(e) =>
              set({ visibleIf: { field: rule.field, equals: e.target.value } })
            }
            className={inp}
          >
            {(ruleSource.options ?? []).filter(Boolean).map((o) => (
              <option key={o} value={o}>
                {`${c.form.equals} ${o}`}
              </option>
            ))}
          </Select>
        )}
      </fieldset>
      {field.type === "group" && (
        <fieldset className="grid gap-2 bg-bg-subtle p-3">
          <legend className="sr-only">{c.form.groupFields}</legend>
          <Select
            aria-label={c.form.addChild}
            value=""
            onChange={(e) => {
              const t = e.target.value as FieldType;
              if (!t) return;
              const f = blankField(t, c);
              set({ children: [...(field.children ?? []), f] });
            }}
            className={inp}
          >
            <option value="">{`+ ${c.form.addChild}`}</option>
            {FIELD_TYPES.filter((t) => t !== "group").map((t) => (
              <option key={t} value={t}>
                {c.form.types[t]}
              </option>
            ))}
          </Select>
          <Field label={c.form.total}>
            {(a) => (
              <Select
                id={a.id}
                value={field.totalField ?? ""}
                onChange={(e) => set({ totalField: e.target.value || null })}
                className={inp}
              >
                <option value="">{c.form.noTotal}</option>
                {numbers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {fill(c.form.totalRule, {
                      field: f.label[lang] || f.label.en,
                    })}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </fieldset>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- SB4 documents / checklist / deliverables
const TYPES = ["PDF", "JPG", "PNG", "DOCX", "XLSX"];
function DocumentsStep({
  draft,
  update,
  lang,
}: {
  draft: Draft;
  update: Update;
  lang: Lang;
}) {
  const { c } = useC();
  const remove = useRemove(update, draft);
  const [msg, setMsg] = useState("");
  const set = (id: string, patch: Partial<Draft["documents"][number]>) =>
    update((d) => ({
      ...d,
      documents: d.documents.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const mv = (i: number, d: -1 | 1, label: string) => {
    update((x) => ({ ...x, documents: move(x.documents, i, d) }));
    setMsg(
      fill(c.builder.moved, {
        label,
        n: i + d + 1,
      }),
    );
  };
  return (
    <section>
      <SectionTitle>{c.docs.title}</SectionTitle>
      {!draft.documents.length && (
        <p className="mb-3 text-small text-fg-subtle">{c.docs.empty}</p>
      )}
      <ol className="grid gap-3">
        {draft.documents.map((doc, i) => {
          const label = doc.name[lang] || c.builder.untitled;
          return (
            <li
              key={doc.id}
              onKeyDown={reorderKeys((d) => mv(i, d, label))}
              className="grid gap-3 border border-border p-3 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <Field label={fill(c.docs.name, { lang: c.lang[lang] })}>
                  {(a) => (
                    <Input
                      id={a.id}
                      value={doc.name[lang]}
                      onChange={(e) =>
                        set(doc.id, {
                          name: setL(doc.name, lang, e.target.value),
                        })
                      }
                      className={inp}
                    />
                  )}
                </Field>
                <Field label={c.docs.maxMb}>
                  {(a) => (
                    <Input
                      id={a.id}
                      type="number"
                      min={1}
                      max={50}
                      inputMode="numeric"
                      value={doc.maxMb}
                      onChange={(e) =>
                        set(doc.id, {
                          maxMb: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className={cx(inp, "tabular")}
                    />
                  )}
                </Field>
                <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2">
                  <legend className="mb-1 text-label">{c.docs.types}</legend>
                  {TYPES.map((t) => (
                    <Checkbox
                      key={t}
                      label={t}
                      className="text-small"
                      checked={doc.types.includes(t)}
                      disabled={doc.types.length === 1 && doc.types.includes(t)}
                      onChange={(e) =>
                        set(doc.id, {
                          types: e.target.checked
                            ? [...doc.types, t]
                            : doc.types.filter((x) => x !== t),
                        })
                      }
                    />
                  ))}
                </fieldset>
                <div className="flex flex-wrap gap-x-5 gap-y-2 sm:col-span-2">
                  <Switch
                    className="text-small"
                    label={c.docs.required}
                    checked={doc.required}
                    onChange={(e) =>
                      set(doc.id, { required: e.target.checked })
                    }
                  />
                  <Switch
                    className="text-small"
                    label={c.docs.expiry}
                    checked={doc.expiry}
                    onChange={(e) => set(doc.id, { expiry: e.target.checked })}
                  />
                  <Switch
                    className="text-small"
                    label={c.docs.nameMatch}
                    checked={doc.nameMatch}
                    onChange={(e) =>
                      set(doc.id, { nameMatch: e.target.checked })
                    }
                  />
                  <Switch
                    className="text-small"
                    label={c.docs.perApplicant}
                    checked={doc.perApplicant}
                    onChange={(e) =>
                      set(doc.id, { perApplicant: e.target.checked })
                    }
                  />
                </div>
              </div>
              <ItemControls
                label={label}
                i={i}
                n={draft.documents.length}
                onMove={(d) => mv(i, d, label)}
                onRemove={() =>
                  remove(label, (d) => ({
                    ...d,
                    documents: d.documents.filter((x) => x.id !== doc.id),
                  }))
                }
              />
            </li>
          );
        })}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() =>
          update((d) => ({
            ...d,
            documents: [
              ...d.documents,
              {
                id: newId("doc"),
                name: l3(),
                types: ["PDF", "JPG"],
                maxMb: 5,
                expiry: false,
                nameMatch: true,
                perApplicant: false,
                required: true,
              },
            ],
          }))
        }
      >
        <Icon name="plus" size={16} aria-hidden /> {c.docs.add}
      </Button>
      <Announce msg={msg} />
    </section>
  );
}

function ChecklistStep({
  draft,
  update,
  lang,
}: {
  draft: Draft;
  update: Update;
  lang: Lang;
}) {
  const { c } = useC();
  const toast = useToast();
  const remove = useRemove(update, draft);
  const [msg, setMsg] = useState("");
  const sources = [
    ...draft.documents.map((d) => ({
      id: `doc:${d.id}`,
      label: fill(c.checklist.doc, { name: d.name[lang] || d.name.en }),
      name: d.name,
    })),
    ...draft.fields.map((f) => ({
      id: `field:${f.id}`,
      label: fill(c.checklist.field, { name: f.label[lang] || f.label.en }),
      name: f.label,
    })),
  ];
  const generate = () => {
    const mapped = new Set(draft.checklist.map((x) => x.source));
    const wanted = sources.filter(
      (s) =>
        !mapped.has(s.id) &&
        (s.id.startsWith("doc:")
          ? draft.documents.find((d) => `doc:${d.id}` === s.id)?.required
          : draft.fields.find((f) => `field:${f.id}` === s.id)?.required),
    );
    if (!wanted.length) return toast({ title: c.checklist.nothingToAdd });
    update((d) => ({
      ...d,
      checklist: [
        ...d.checklist,
        ...wanted.map((s) => ({
          id: newId("ck"),
          label: { ...s.name },
          source: s.id,
        })),
      ],
    }));
    toast({
      tone: "success",
      title: fill(c.checklist.generated, { n: wanted.length }),
    });
  };
  const mv = (i: number, d: -1 | 1, label: string) => {
    update((x) => ({ ...x, checklist: move(x.checklist, i, d) }));
    setMsg(
      fill(c.builder.moved, {
        label,
        n: i + d + 1,
      }),
    );
  };
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle hint={c.checklist.hint}>{c.checklist.title}</SectionTitle>
        <Button variant="secondary" size="sm" onClick={generate}>
          <Icon name="sparkle" size={16} aria-hidden /> {c.checklist.generate}
        </Button>
      </div>
      {!draft.checklist.length && (
        <p className="mb-3 text-small text-fg-subtle">{c.checklist.empty}</p>
      )}
      <ol className="grid gap-2">
        {draft.checklist.map((it, i) => {
          const label = it.label[lang] || c.builder.untitled;
          return (
            <li
              key={it.id}
              onKeyDown={reorderKeys((d) => mv(i, d, label))}
              className="grid items-end gap-2 border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_auto]"
            >
              <Field label={fill(c.checklist.label, { lang: c.lang[lang] })}>
                {(a) => (
                  <Input
                    id={a.id}
                    value={it.label[lang]}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        checklist: d.checklist.map((x) =>
                          x.id === it.id
                            ? {
                                ...x,
                                label: setL(x.label, lang, e.target.value),
                              }
                            : x,
                        ),
                      }))
                    }
                    className={inp}
                  />
                )}
              </Field>
              <Field label={c.checklist.source}>
                {(a) => (
                  <Select
                    id={a.id}
                    value={it.source}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        checklist: d.checklist.map((x) =>
                          x.id === it.id ? { ...x, source: e.target.value } : x,
                        ),
                      }))
                    }
                    className={inp}
                  >
                    <option value="manual">{c.checklist.manual}</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <ItemControls
                label={label}
                i={i}
                n={draft.checklist.length}
                onMove={(d) => mv(i, d, label)}
                onRemove={() =>
                  remove(label, (d) => ({
                    ...d,
                    checklist: d.checklist.filter((x) => x.id !== it.id),
                  }))
                }
              />
            </li>
          );
        })}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() =>
          update((d) => ({
            ...d,
            checklist: [
              ...d.checklist,
              { id: newId("ck"), label: l3(), source: "manual" },
            ],
          }))
        }
      >
        <Icon name="plus" size={16} aria-hidden /> {c.checklist.add}
      </Button>
      <Announce msg={msg} />
    </section>
  );
}

const FORMATS = ["PDF", "DOCX", "XLSX", "Image", "Link"];
function DeliverablesStep({
  draft,
  update,
  lang,
}: {
  draft: Draft;
  update: Update;
  lang: Lang;
}) {
  const { c } = useC();
  const remove = useRemove(update, draft);
  const [msg, setMsg] = useState("");
  const set = (id: string, patch: Partial<Draft["deliverables"][number]>) =>
    update((d) => ({
      ...d,
      deliverables: d.deliverables.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    }));
  const mv = (i: number, d: -1 | 1, label: string) => {
    update((x) => ({ ...x, deliverables: move(x.deliverables, i, d) }));
    setMsg(
      fill(c.builder.moved, {
        label,
        n: i + d + 1,
      }),
    );
  };
  return (
    <section>
      <SectionTitle>{c.deliverables.title}</SectionTitle>
      {!draft.deliverables.length && (
        <p className="mb-3 text-small text-fg-subtle">{c.deliverables.empty}</p>
      )}
      <ol className="grid gap-2">
        {draft.deliverables.map((it, i) => {
          const label = it.name[lang] || c.builder.untitled;
          return (
            <li
              key={it.id}
              onKeyDown={reorderKeys((d) => mv(i, d, label))}
              className="grid items-end gap-3 border border-border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto]"
            >
              <Field label={fill(c.deliverables.name, { lang: c.lang[lang] })}>
                {(a) => (
                  <Input
                    id={a.id}
                    value={it.name[lang]}
                    onChange={(e) =>
                      set(it.id, { name: setL(it.name, lang, e.target.value) })
                    }
                    className={inp}
                  />
                )}
              </Field>
              <Field label={c.deliverables.format}>
                {(a) => (
                  <Select
                    id={a.id}
                    value={it.format}
                    onChange={(e) => set(it.id, { format: e.target.value })}
                    className={inp}
                  >
                    {FORMATS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Switch
                className="min-h-10 text-small"
                label={c.deliverables.required}
                checked={it.required}
                onChange={(e) => set(it.id, { required: e.target.checked })}
              />
              <ItemControls
                label={label}
                i={i}
                n={draft.deliverables.length}
                onMove={(d) => mv(i, d, label)}
                onRemove={() =>
                  remove(label, (d) => ({
                    ...d,
                    deliverables: d.deliverables.filter((x) => x.id !== it.id),
                  }))
                }
              />
            </li>
          );
        })}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() =>
          update((d) => ({
            ...d,
            deliverables: [
              ...d.deliverables,
              { id: newId("dl"), name: l3(), format: "PDF", required: true },
            ],
          }))
        }
      >
        <Icon name="plus" size={16} aria-hidden /> {c.deliverables.add}
      </Button>
      {draft.deliverables.some((x) => x.required) && (
        <p className="mt-3">
          <Badge tone="info">{c.deliverables.required}</Badge>
        </p>
      )}
      <Announce msg={msg} />
    </section>
  );
}

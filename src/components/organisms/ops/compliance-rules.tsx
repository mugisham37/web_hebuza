"use client";
// F-CAL-01 /ops/compliance-rules: national + service deadline rules (spec 05-modules/deadlines-and-compliance-calendar).
// List with authority/search/disabled filters in the URL, enable/disable with Undo, create/edit sheet with a live
// preview of the next due dates. No board for this page; layout follows /ops/settings/statuses (board 17 v2).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { useShortcut } from "@/lib/ops/shortcuts";
import { LANGS, l3, useServices } from "@/lib/ops/e";
import {
  AUTHORITIES,
  createRule,
  nextDates,
  patchRule,
  useComplianceRules,
  useRuleMutation,
  validateRule,
  type Authority,
  type ComplianceRule,
  type Recurrence,
  type RuleInput,
} from "@/lib/ops/compliance";
import {
  opsCompliance,
  type ComplianceCopy,
} from "@/content/pages/ops-compliance";
import { opsCatalogue } from "@/content/pages/ops-catalogue";
import type { Locale } from "@/shared/i18n/config";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Kbd } from "@/components/atoms/ops";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select, Switch } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { EmptyState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { usePhone } from "@/components/atoms/step-up";
import { fill } from "@/components/organisms/ops/catalogue";

const today = () => new Date().toISOString().slice(0, 10);
const day = (
  iso: string,
  locale: Locale,
  o: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) => formatDate(`${iso}T12:00:00Z`, locale, { ...o, timeZone: "UTC" });
const mmdd = (s: string, locale: Locale) =>
  day(`2027-${s}`, locale, { day: "numeric", month: "short" });

function schedule(
  r: Pick<ComplianceRule, "recurrence" | "dueRule">,
  c: ComplianceCopy,
  locale: Locale,
) {
  const x = r.recurrence;
  const base =
    x.kind === "monthly" || x.kind === "quarterly"
      ? fill(c.rec[x.kind], { d: x.day })
      : x.kind === "annual"
        ? fill(c.rec.annual, {
            date: mmdd(
              `${String(x.month).padStart(2, "0")}-${String(x.day).padStart(2, "0")}`,
              locale,
            ),
          })
        : fill(c.rec.dates, {
            dates: x.dates.map((d) => mmdd(d, locale)).join(", "),
          });
  return r.dueRule === "next_business_day" ? `${base}, ${c.businessDay}` : base;
}

export function ComplianceRulesView() {
  const { locale } = useI18n();
  const c = opsCompliance(locale);
  const toast = useToast();
  const p = useUrlParams();
  const q = useComplianceRules();
  const [focused, setFocused] = useState<string | null>(null);
  const [editing, setEditing] = useState<ComplianceRule | "new" | null>(null);
  const [msg, setMsg] = useState("");
  useShortcut("n", c.new, () => setEditing("new"), "list");
  const toggle = useRuleMutation((v: { id: string; active: boolean }) =>
    patchRule(v.id, { active: v.active }),
  );

  const search = p.get("q") ?? "";
  const auth = AUTHORITIES.includes(p.get("authority") as Authority)
    ? (p.get("authority") as Authority)
    : null;
  const inactive = p.get("inactive") === "1";
  const name = (r: ComplianceRule) => r.label[locale] || r.label.en;
  const all = q.data?.items ?? [];
  const rows = all.filter(
    (r) =>
      (inactive || r.active) &&
      (!auth || r.authority === auth) &&
      (!search ||
        `${r.code} ${name(r)}`.toLowerCase().includes(search.toLowerCase())),
  );
  const filtered = !!search || !!auth || inactive;

  const setActive = (r: ComplianceRule, on: boolean) =>
    toggle.mutate(
      { id: r.id, active: on },
      {
        onSuccess: () => {
          const t = fill(on ? c.enabled : c.disabled, { name: name(r) });
          setMsg(t);
          toast({
            tone: "success",
            title: t,
            action: {
              label: c.undo,
              onClick: () => toggle.mutate({ id: r.id, active: !on }),
            },
          });
        },
        onError: (e) => toast({ tone: "danger", title: errorCopy(e, locale) }),
      },
    );

  const columns: OpsColumn<ComplianceRule>[] = [
    {
      key: "rule",
      label: c.cols.rule,
      className: "min-w-64",
      wrap: true,
      sort: (r) => r.code,
      cell: (r) => (
        <span className="grid">
          <span className={cx("font-medium", !r.active && "text-fg-muted")}>
            {name(r)}
          </span>
          <span className="font-mono text-eyebrow text-fg-subtle">
            {r.code}
          </span>
          {!r.verified && (
            <span
              title={c.unverifiedHint}
              className="mt-1 inline-flex w-fit items-center gap-1 bg-warning-bg px-2 py-0.5 text-eyebrow text-warning"
            >
              <Icon name="shield" size={11} aria-hidden />
              {c.unverified}
              <span className="sr-only">: {c.unverifiedHint}</span>
            </span>
          )}
        </span>
      ),
    },
    {
      key: "authority",
      label: c.cols.authority,
      sort: (r) => r.authority,
      cell: (r) => c.authority[r.authority],
    },
    {
      key: "schedule",
      label: c.cols.schedule,
      className: "min-w-56",
      wrap: true,
      cell: (r) => <span className="text-small">{schedule(r, c, locale)}</span>,
    },
    {
      key: "next",
      label: c.cols.next,
      sort: (r) => (r.active ? (r.nextDates[0] ?? "9") : "9"),
      cell: (r) =>
        r.active && r.nextDates[0] ? (
          <span className="tabular">{day(r.nextDates[0], locale)}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "reminders",
      label: c.cols.reminders,
      className: "min-w-40",
      wrap: true,
      cell: (r) => (
        <span className="grid text-small">
          <span className="tabular">
            {fill(c.offsets, { list: r.remindOffsets.join(", ") })}
          </span>
          <span className="text-eyebrow text-fg-subtle">
            {fill(c.lead, { n: r.leadDays })}
          </span>
        </span>
      ),
    },
    {
      key: "active",
      label: c.cols.active,
      card: false,
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch
            label={
              <span className="sr-only">
                {fill(c.enabledLabel, { name: name(r) })}
              </span>
            }
            checked={r.active}
            disabled={toggle.isPending}
            onChange={(e) => setActive(r, e.target.checked)}
          />
        </span>
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
        <div className="max-w-2xl">
          <h1 className="text-h2">{c.title}</h1>
          <p className="text-small text-fg-subtle">{c.lede}</p>
        </div>
        <Button dots onClick={() => setEditing("new")}>
          {c.new} <Kbd>N</Kbd>
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{c.search}</span>
          <Icon
            name="search"
            size={14}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
          />
          <Input
            type="search"
            value={search}
            placeholder={c.search}
            className="h-10 pl-8"
            onChange={(e) => setUrlParams({ q: e.target.value || null })}
          />
        </label>
        <label className="basis-44 max-sm:flex-1">
          <span className="sr-only">{c.cols.authority}</span>
          <Select
            className="h-10"
            value={auth ?? ""}
            onChange={(e) =>
              setUrlParams({ authority: e.target.value || null })
            }
          >
            <option value="">{c.allAuthorities}</option>
            {AUTHORITIES.map((a) => (
              <option key={a} value={a}>
                {c.authority[a]}
              </option>
            ))}
          </Select>
        </label>
        <Switch
          label={<span className="text-small">{c.showInactive}</span>}
          checked={inactive}
          onChange={(e) =>
            setUrlParams({ inactive: e.target.checked ? "1" : null })
          }
        />
      </div>
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
        rowTone={(r) => (r.active ? null : "muted")}
        renderCard={(r) => (
          <span className="grid gap-1 text-left">
            <span className="font-medium">{name(r)}</span>
            <span className="text-small text-fg-subtle">
              {c.authority[r.authority]} · {schedule(r, c, locale)}
            </span>
            <span className="text-small text-fg-subtle">
              {c.cols.next}:{" "}
              {r.active && r.nextDates[0] ? day(r.nextDates[0], locale) : "—"}
              {!r.verified && ` · ${c.unverified}`}
            </span>
          </span>
        )}
        empty={
          filtered && all.length ? (
            <EmptyState
              title={c.noMatch}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setUrlParams({ q: null, authority: null, inactive: null })
                  }
                >
                  {c.clear}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={c.emptyTitle}
              body={c.emptyBody}
              action={
                <Button size="sm" onClick={() => setEditing("new")}>
                  {c.new}
                </Button>
              }
            />
          )
        }
      />
      <p className="sr-only" aria-live="polite">
        {msg}
      </p>
      {editing && (
        <RuleSheet
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

const blank = (): RuleInput => ({
  code: "",
  authority: "RRA",
  label: l3(),
  recurrence: { kind: "monthly", day: 15 },
  dueRule: "next_business_day",
  leadDays: 14, // server DeadlineRuleIn default
  remindOffsets: [-10, -3, -1, 0], // spec §12 default offsets
  serviceSlug: null,
  active: true,
});
const recFor = (kind: Recurrence["kind"], prev: Recurrence): Recurrence => {
  const d = "day" in prev ? prev.day : 15;
  return kind === "annual"
    ? { kind, month: 3, day: d }
    : kind === "dates"
      ? { kind, dates: [] }
      : { kind, day: d };
};
const ints = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number);

function RuleSheet({
  item,
  onClose,
}: {
  item: ComplianceRule | null;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const c = opsCompliance(locale);
  const t = c.sheet;
  const lang = opsCatalogue(locale).lang;
  const phone = usePhone();
  const toast = useToast();
  const services = useServices().data?.services ?? [];
  const [v, setV] = useState<RuleInput>(() => {
    if (!item) return blank();
    const { id, nextDates: _n, updatedAt, verified, ...rest } = item;
    void [id, _n, updatedAt, verified];
    return rest;
  });
  // Raw text for list inputs so typing "-" or "," doesn't get eaten.
  const [datesText, setDatesText] = useState(
    v.recurrence.kind === "dates" ? v.recurrence.dates.join(", ") : "",
  );
  const [offText, setOffText] = useState(v.remindOffsets.join(", "));
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const errs = validateRule(v);
  const show = touched ? errs : {};
  const preview = errs.recurrence ? [] : nextDates(v, today(), 6);
  const save = useRuleMutation((b: RuleInput) =>
    item ? patchRule(item.id, b) : createRule(b),
  );
  const submit = () => {
    setTouched(true);
    if (Object.keys(errs).length) return;
    setErr(null);
    save.mutate(v, {
      onSuccess: () => {
        toast({ tone: "success", title: item ? t.saved : t.created });
        onClose();
      },
      onError: (e) => setErr(errorCopy(e, locale)),
    });
  };
  const rec = v.recurrence;
  return (
    <Dialog
      open
      onClose={onClose}
      side={phone ? "bottom" : "right"}
      title={item ? t.titleEdit : t.titleNew}
      footer={
        <>
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
        noValidate
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
        {item && !item.verified && (
          <p className="bg-warning-bg p-3 text-small text-warning">
            {c.unverifiedHint}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.code}
            hint={t.codeHint}
            error={show.code ? t.codeErr : undefined}
          >
            {(a) => (
              <Input
                id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                value={v.code}
                onChange={(e) =>
                  setV({ ...v, code: e.target.value.toUpperCase() })
                }
                className="h-10 font-mono"
                autoCapitalize="characters"
              />
            )}
          </Field>
          <Field label={t.authority}>
            {(a) => (
              <Select
                id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                value={v.authority}
                onChange={(e) =>
                  setV({ ...v, authority: e.target.value as Authority })
                }
                className="h-10"
              >
                {AUTHORITIES.map((x) => (
                  <option key={x} value={x}>
                    {c.authority[x]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {LANGS.map((l) => (
          <Field
            key={l}
            label={fill(t.label, { lang: lang[l] })}
            error={show.label && !v.label[l].trim() ? t.labelErr : undefined}
          >
            {(a) => (
              <Input
                id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                value={v.label[l]}
                onChange={(e) =>
                  setV({ ...v, label: { ...v.label, [l]: e.target.value } })
                }
                className="h-10"
              />
            )}
          </Field>
        ))}
        <fieldset className="grid gap-4 border border-border p-4">
          <legend className="px-1 text-label">{t.kind}</legend>
          <Field label={t.kind}>
            {(a) => (
              <Select
                id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                value={rec.kind}
                onChange={(e) =>
                  setV({
                    ...v,
                    recurrence: recFor(
                      e.target.value as Recurrence["kind"],
                      rec,
                    ),
                  })
                }
                className="h-10"
              >
                {(Object.keys(t.kinds) as Recurrence["kind"][]).map((k) => (
                  <option key={k} value={k}>
                    {t.kinds[k]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {rec.kind === "dates" ? (
            <Field
              label={t.dates}
              error={show.recurrence ? t.recErr : undefined}
            >
              {(a) => (
                <Input
                  id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                  value={datesText}
                  placeholder="06-30, 09-30, 12-31"
                  inputMode="numeric"
                  onChange={(e) => {
                    setDatesText(e.target.value);
                    setV({
                      ...v,
                      recurrence: {
                        kind: "dates",
                        dates: e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      },
                    });
                  }}
                  className="h-10"
                />
              )}
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rec.kind === "annual" && (
                <Field
                  label={t.month}
                  error={show.recurrence ? t.recErr : undefined}
                >
                  {(a) => (
                    <Select
                      id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                      value={rec.month}
                      onChange={(e) =>
                        setV({
                          ...v,
                          recurrence: { ...rec, month: Number(e.target.value) },
                        })
                      }
                      className="h-10"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {formatDate(Date.UTC(2027, i, 15), locale, {
                            month: "long",
                            timeZone: "UTC",
                          })}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
              <Field
                label={t.day}
                error={
                  show.recurrence && rec.kind !== "annual"
                    ? t.recErr
                    : undefined
                }
              >
                {(a) => (
                  <Input
                    id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                    type="number"
                    min={1}
                    max={31}
                    value={Number.isNaN(rec.day) ? "" : rec.day}
                    onChange={(e) =>
                      setV({
                        ...v,
                        recurrence: { ...rec, day: e.target.valueAsNumber },
                      })
                    }
                    className="h-10"
                  />
                )}
              </Field>
            </div>
          )}
          <Field label={t.dueRule}>
            {(a) => (
              <Select
                id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                value={v.dueRule}
                onChange={(e) =>
                  setV({
                    ...v,
                    dueRule: e.target.value as RuleInput["dueRule"],
                  })
                }
                className="h-10"
              >
                {(Object.keys(t.dueRules) as RuleInput["dueRule"][]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {t.dueRules[k]}
                    </option>
                  ),
                )}
              </Select>
            )}
          </Field>
          <div className="grid gap-2" aria-live="polite">
            <p className="text-label">{t.preview}</p>
            {preview.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {preview.map((d) => (
                  <li
                    key={d}
                    className="bg-ink-100 px-2.5 py-1 text-eyebrow tabular"
                  >
                    <Icon
                      name="calendar"
                      size={11}
                      aria-hidden
                      className="mr-1 inline"
                    />
                    {day(d, locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-fg-subtle">{t.previewEmpty}</p>
            )}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.leadDays}
            error={show.leadDays ? t.leadErr : undefined}
          >
            {(a) => (
              <Input
                id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                type="number"
                min={0}
                max={365}
                value={Number.isNaN(v.leadDays) ? "" : v.leadDays}
                onChange={(e) =>
                  setV({ ...v, leadDays: e.target.valueAsNumber })
                }
                className="h-10"
              />
            )}
          </Field>
          <Field
            label={t.offsets}
            hint={t.offsetsHint}
            error={show.remindOffsets ? t.offsetsErr : undefined}
          >
            {(a) => (
              <Input
                id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
                value={offText}
                onChange={(e) => {
                  setOffText(e.target.value);
                  setV({ ...v, remindOffsets: ints(e.target.value) });
                }}
                className="h-10"
              />
            )}
          </Field>
        </div>
        <Field label={t.service}>
          {(a) => (
            <Select
              id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || undefined}
              value={v.serviceSlug ?? ""}
              onChange={(e) =>
                setV({ ...v, serviceSlug: e.target.value || null })
              }
              className="h-10"
            >
              <option value="">{t.noService}</option>
              {services.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {(locale === "rw"
                    ? s.name_rw
                    : locale === "fr"
                      ? s.name_fr
                      : s.name_en) || s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Switch
          label={t.active}
          checked={v.active}
          onChange={(e) => setV({ ...v, active: e.target.checked })}
        />
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

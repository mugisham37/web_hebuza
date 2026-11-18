"use client";
// SB2 Preview: the draft as a client would fill it in (eligibility, live visibility rules, repeating group with the
// 100 % rule, documents, price incl. the public BandCalculator). Nothing is saved.
import { useState } from "react";
import {
  LANGS,
  isVisible,
  groupTotal,
  type Draft,
  type FormField,
  type Lang,
  type ServiceDetail,
} from "@/lib/ops/e";
import { fromApiBand } from "@/shared/pricing";
import { cx, formatMoney } from "@/shared/format";
import { BandCalculator } from "@/components/organisms/site/service-tools";
import { Dialog } from "@/components/atoms/dialog";
import {
  Checkbox,
  DateInput,
  Input,
  Radio,
  Select,
} from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { fill } from "@/components/organisms/ops/catalogue";
import { useC } from "@/components/organisms/ops/builder";

type Rows = Record<string, string>[];

export function Preview({
  open,
  onClose,
  draft,
  service,
  version,
  phone,
}: {
  open: boolean;
  onClose: () => void;
  draft: Draft;
  service: ServiceDetail;
  version: number;
  phone: boolean;
}) {
  const { c, locale } = useC();
  const t = c.preview;
  const [lang, setLang] = useState<Lang>(locale);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [rows, setRows] = useState<Record<string, Rows>>({});
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const blocked = draft.eligibility.some(
    (q) => q.blocking && answers[q.id] === false,
  );
  const set = (id: string, v: string | string[]) =>
    setValues((x) => ({ ...x, [id]: v }));
  const L = (s: Record<Lang, string>) => s[lang] || s.en;

  const control = (
    f: FormField,
    value: string,
    onChange: (v: string) => void,
    id: string,
  ) => {
    const common = {
      id,
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      className: "h-10",
    };
    switch (f.type) {
      case "number":
        return <Input type="number" inputMode="decimal" {...common} />;
      case "date":
        return <DateInput {...common} />;
      case "phone":
        return <Input type="tel" placeholder="+250 788 123 456" {...common} />;
      case "select":
        return (
          <Select {...common}>
            <option value="">{t.choose}</option>
            {(f.options ?? []).filter(Boolean).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        );
      case "file":
        return (
          <input
            id={id}
            type="file"
            className="text-small file:mr-3 file:border-0 file:bg-bg-subtle file:px-4 file:py-2"
          />
        );
      default:
        return <Input {...common} />;
    }
  };
  const labelOf = (f: FormField) => (
    <>
      {L(f.label)}
      {f.required && (
        <span aria-hidden className="text-danger">
          {" "}
          *
        </span>
      )}
    </>
  );

  const field = (f: FormField) => {
    if (!isVisible(f, values)) return null;
    const id = `pv-${f.id}`;
    if (f.type === "multi") {
      const cur = (values[f.id] as string[] | undefined) ?? [];
      return (
        <fieldset key={f.id} className="grid gap-2">
          <legend className="text-label">{labelOf(f)}</legend>
          {(f.options ?? []).filter(Boolean).map((o) => (
            <Checkbox
              key={o}
              label={o}
              checked={cur.includes(o)}
              onChange={(e) =>
                set(
                  f.id,
                  e.target.checked ? [...cur, o] : cur.filter((x) => x !== o),
                )
              }
            />
          ))}
        </fieldset>
      );
    }
    if (f.type === "group") {
      const rs = rows[f.id] ?? [{}];
      const total = f.totalField ? groupTotal(rs, f.totalField) : null;
      const setRow = (i: number, k: string, v: string) =>
        setRows((x) => ({
          ...x,
          [f.id]: rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)),
        }));
      return (
        <fieldset
          key={f.id}
          className="grid gap-3 border border-border p-3"
        >
          <legend className="px-1 text-label">{labelOf(f)}</legend>
          {rs.map((r, i) => (
            <div
              key={i}
              className="grid gap-2 border-b border-border pb-3 last:border-0"
            >
              {(f.children ?? []).map((ch) => (
                <label
                  key={ch.id}
                  className="grid gap-1 text-small"
                  htmlFor={`${id}-${i}-${ch.id}`}
                >
                  {labelOf(ch)}
                  {control(
                    ch,
                    r[ch.id] ?? "",
                    (v) => setRow(i, ch.id, v),
                    `${id}-${i}-${ch.id}`,
                  )}
                </label>
              ))}
              {rs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-self-start"
                  onClick={() =>
                    setRows((x) => ({
                      ...x,
                      [f.id]: rs.filter((_, j) => j !== i),
                    }))
                  }
                >
                  {fill(t.removeRow, { n: i + 1 })}
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => setRows((x) => ({ ...x, [f.id]: [...rs, {}] }))}
          >
            <Icon name="plus" size={16} aria-hidden /> {t.addRow}
          </Button>
          {total !== null && (
            <p
              aria-live="polite"
              className={cx(
                "text-small font-medium",
                total === 100 ? "text-success" : "text-warning",
              )}
            >
              {total === 100 ? t.totalOk : fill(t.total, { n: total })}
            </p>
          )}
        </fieldset>
      );
    }
    return (
      <div key={f.id} className="grid gap-1">
        <label htmlFor={id} className="text-label">
          {labelOf(f)}
        </label>
        {L(f.help) && <p className="text-small text-fg-subtle">{L(f.help)}</p>}
        {control(
          f,
          (values[f.id] as string | undefined) ?? "",
          (v) => set(f.id, v),
          id,
        )}
      </div>
    );
  };

  const tiers = service.pricing_tiers.filter((x) => x.isAvailable);
  const from = tiers.length ? Math.min(...tiers.map((x) => x.fee)) : null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      side={phone ? "bottom" : "right"}
      className="sm:max-w-xl"
      title={t.title}
      description={fill(t.lede, { v: version })}
    >
      <div className="grid gap-6">
        <div
          role="group"
          aria-label={c.details.languages}
          className="flex gap-1"
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === lang}
              onClick={() => setLang(l)}
              className={cx(
                "min-h-8 px-3 text-small",
                l === lang ? "bg-secondary text-on-secondary" : "bg-bg-subtle",
              )}
            >
              {c.lang[l]}
            </button>
          ))}
        </div>
        <header>
          <h3 className="text-h4">{L(draft.name) || service.name}</h3>
          <p className="text-body text-fg-subtle">{L(draft.short)}</p>
          <p className="mt-2 text-small">
            <strong>{t.price}: </strong>
            {service.pricing_mode === "quote" || from == null
              ? t.quote
              : fill(t.fixed, { fee: formatMoney(from, "RWF", locale) })}
          </p>
        </header>
        {service.pricing_mode === "range" && service.price_bands.length > 0 && (
          <BandCalculator
            bands={service.price_bands.map((b) => fromApiBand(b))}
          />
        )}
        {draft.eligibility.length > 0 && (
          <section className="grid gap-3">
            <h4 className="text-label-lg">{t.eligibility}</h4>
            {draft.eligibility.map((q) => (
              <fieldset key={q.id} className="grid gap-1">
                <legend className="text-body">{L(q.q)}</legend>
                <div className="flex gap-5">
                  <Radio
                    name={`pv-${q.id}`}
                    label={t.yes}
                    checked={answers[q.id] === true}
                    onChange={() => setAnswers((x) => ({ ...x, [q.id]: true }))}
                  />
                  <Radio
                    name={`pv-${q.id}`}
                    label={t.no}
                    checked={answers[q.id] === false}
                    onChange={() =>
                      setAnswers((x) => ({ ...x, [q.id]: false }))
                    }
                  />
                </div>
              </fieldset>
            ))}
            {blocked && (
              <p
                role="alert"
                className="bg-danger-bg p-3 text-small text-danger"
              >
                {t.notEligible}
              </p>
            )}
          </section>
        )}
        {!blocked && (
          <section className="grid gap-4">
            <h4 className="text-label-lg">{t.form}</h4>
            {draft.fields.length ? (
              draft.fields.map(field)
            ) : (
              <p className="text-small text-fg-subtle">{t.empty}</p>
            )}
          </section>
        )}
        {draft.documents.length > 0 && (
          <section>
            <h4 className="mb-2 text-label-lg">{t.documents}</h4>
            <ul className="grid gap-2">
              {draft.documents.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 border border-border p-3 text-small"
                >
                  <Icon name="file" size={18} aria-hidden />
                  <span className="grid">
                    <span className="font-medium">
                      {L(d.name)}
                      {d.required && (
                        <span aria-hidden className="text-danger">
                          {" "}
                          *
                        </span>
                      )}
                    </span>
                    <span className="text-fg-subtle">
                      {fill(c.docs.summary, {
                        types: d.types.join(", "),
                        mb: d.maxMb,
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {draft.deliverables.length > 0 && (
          <section>
            <h4 className="mb-2 text-label-lg">{t.deliverables}</h4>
            <ul className="list-disc pl-5 text-small">
              {draft.deliverables.map((d) => (
                <li key={d.id}>
                  {L(d.name)} · {d.format}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Dialog>
  );
}

"use client";
// U17 builder part 2 (board 17 v2): SP1 pricing tiers + bands with a live calculator (shared lib/pricing),
// SP2 SLA step (part of the autosaved draft), SP3 version history + diff + publish dialog (step-up, in-flight pinned).
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { CASE_STATUSES, type CaseStatus } from "@/shared/domain/case-status";
import {
  bandFor,
  bandFee,
  bandProblems,
  fromApiBand,
  type ApiBand,
} from "@/shared/pricing";
import {
  blockers,
  diffDrafts,
  fromStructure,
  useInFlight,
  usePublish,
  useSavePricing,
  useVersion,
  useVersions,
  type Draft,
  type ServiceDetail,
  type TierBody,
  type Change,
} from "@/lib/ops/e";
import { ApiError } from "@/lib/api/client";
import { opsCommon } from "@/content/pages/ops-common";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";
import { Dialog } from "@/components/atoms/dialog";
import {
  Field,
  Input,
  Radio,
  Select,
  Switch,
  Textarea,
} from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { PanelError } from "@/components/molecules/ops/ops";
import { useStepUp, usePhone } from "@/components/atoms/step-up";
import { fill } from "@/components/organisms/ops/catalogue";
import { useC, type Update } from "@/components/organisms/ops/builder";

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const inp = "h-10 tabular";

// ---------------------------------------------------------------- SP1 pricing
type TierRow = {
  tier: string;
  label: string;
  fee: number;
  gov: number;
  days: number;
  available: boolean;
};
const tiersOf = (s: ServiceDetail): TierRow[] =>
  s.pricing_tiers.map((t) => ({
    tier: t.tier,
    label: t.label,
    fee: t.fee,
    gov: t.governmentFee,
    days: t.etaBusinessDays,
    available: t.isAvailable,
  }));
const bandsOf = (s: ServiceDetail): ApiBand[] =>
  [...s.price_bands]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => ({
      min_amount_rwf: b.min_amount_rwf,
      max_amount_rwf: b.max_amount_rwf ?? null,
      fee_type: b.fee_type,
      fee_rwf: b.fee_rwf ?? null,
      fee_percent: b.fee_percent ?? null,
      min_fee_rwf: b.min_fee_rwf ?? null,
      max_fee_rwf: b.max_fee_rwf ?? null,
    }));
type Mode = "fixed" | "range" | "quote";

export function PricingStep({
  slug,
  service,
}: {
  slug: string;
  service: ServiceDetail;
}) {
  const { c, locale } = useC();
  const t = c.pricing;
  const toast = useToast();
  const save = useSavePricing(slug);
  const [base, setBase] = useState(() => ({
    mode: (service.pricing_mode as Mode) ?? "fixed",
    tiers: tiersOf(service),
    bands: bandsOf(service),
    planCovered: service.plan_covered,
    urgentType: (service.urgent_surcharge_type ?? "percent") as
      "flat" | "percent",
    urgentValue: service.urgent_surcharge_value ?? null,
  }));
  const [s, setS] = useState(base);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("2000000");
  const set = (patch: Partial<typeof s>) => setS((x) => ({ ...x, ...patch }));
  const setTier = (i: number, patch: Partial<TierRow>) =>
    set({ tiers: s.tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const setBand = (i: number, patch: Partial<ApiBand>) =>
    set({ bands: s.bands.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const pBands = s.bands.map(fromApiBand);
  const problems = s.mode === "range" ? bandProblems(pBands) : [];
  const dirty = JSON.stringify(s) !== JSON.stringify(base);
  const pricesChanged =
    JSON.stringify(s.tiers.map((x) => [x.fee, x.gov])) !==
      JSON.stringify(base.tiers.map((x) => [x.fee, x.gov])) ||
    JSON.stringify(s.bands) !== JSON.stringify(base.bands) ||
    s.mode !== base.mode;
  const amt = Number(amount.replace(/[^\d]/g, ""));
  const band = amount ? bandFor(pBands, amt) : null;
  const reason = !dirty ? t.nothing : problems.length ? t.fixProblems : null;

  const submit = async () => {
    const tiers: Record<string, TierBody> = {};
    s.tiers.forEach((x, i) => {
      const o = base.tiers[i];
      if (JSON.stringify(x) !== JSON.stringify(o))
        tiers[x.tier] = {
          platform_fee: x.fee,
          government_fee: x.gov,
          eta_business_days: x.days,
          is_available: x.available,
        };
    });
    try {
      await save.mutateAsync({
        pricing: {
          pricing_mode: s.mode,
          plan_covered: s.planCovered,
          urgent_surcharge_type: s.urgentValue == null ? null : s.urgentType,
          urgent_surcharge_value: s.urgentValue,
          bands:
            s.mode === "range"
              ? s.bands.map((b) => ({
                  ...b,
                  fee_type: b.fee_type as "flat" | "percent",
                }))
              : [],
        },
        tiers,
      });
      if (pricesChanged) setPending(true);
      setBase(s);
      toast({ tone: "success", title: t.saved });
    } catch {
      toast({ tone: "danger", title: t.saveFailed });
    }
  };

  const finance = pricesChanged ? (
    <Badge tone="warning">
      <Icon name="zap" size={14} aria-hidden /> {t.needsFinance}
    </Badge>
  ) : pending ? (
    <Badge tone="warning">
      <Icon name="clock" size={14} aria-hidden /> {t.pendingFinance}
    </Badge>
  ) : (
    <Badge tone="success">
      <Icon name="check" size={14} aria-hidden /> {t.approved}
    </Badge>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
          <legend className="mb-2 text-card-title">{t.mode}</legend>
          {(["fixed", "range", "quote"] as Mode[]).map((m) => (
            <Radio
              key={m}
              name="pricing-mode"
              label={t.modes[m]}
              checked={s.mode === m}
              onChange={() => set({ mode: m })}
            />
          ))}
        </fieldset>
        <span aria-live="polite">{finance}</span>
      </div>

      {s.mode !== "quote" && (
        <section>
          <h2 className="mb-2 text-card-title">{t.tiers}</h2>
          <div
            role="region"
            aria-label={t.tiers}
            tabIndex={0}
            className="overflow-x-auto border border-border"
          >
            <table className="w-full min-w-[40rem] text-small">
              <thead className="bg-ink-100 text-left text-eyebrow text-fg-muted">
                <tr>
                  <th scope="col" className="h-10 px-3">
                    {t.tier}
                  </th>
                  <th scope="col" className="px-3 text-right">
                    {t.turnaround}
                  </th>
                  <th scope="col" className="px-3 text-right">
                    {t.price}
                  </th>
                  <th scope="col" className="px-3 text-right">
                    {t.govt}
                  </th>
                  <th scope="col" className="px-3">
                    {t.available}
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.tiers.map((x, i) => (
                  <tr key={x.tier} className="border-t border-border">
                    <th scope="row" className="px-3 text-left font-medium">
                      {x.label}
                    </th>
                    <td className="px-3 py-1.5">
                      <Input
                        aria-label={`${x.label} ${t.turnaround}`}
                        type="number"
                        min={1}
                        value={x.days}
                        onChange={(e) =>
                          setTier(i, {
                            days: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className={cx(inp, "ml-auto w-24 text-right")}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        aria-label={`${x.label} ${t.price}`}
                        type="number"
                        min={0}
                        step={500}
                        value={x.fee}
                        onChange={(e) =>
                          setTier(i, {
                            fee: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className={cx(inp, "ml-auto w-32 text-right")}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        aria-label={`${x.label} ${t.govt}`}
                        type="number"
                        min={0}
                        step={500}
                        value={x.gov}
                        onChange={(e) =>
                          setTier(i, {
                            gov: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className={cx(inp, "ml-auto w-32 text-right")}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Switch
                        label={
                          <span className="sr-only">
                            {fill(t.availableLabel, { tier: x.label })}
                          </span>
                        }
                        checked={x.available}
                        onChange={(e) =>
                          setTier(i, { available: e.target.checked })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {s.mode === "range" && (
        <section className="grid gap-3">
          <div>
            <h2 className="text-card-title">{t.bands}</h2>
            <p className="text-small text-fg-subtle">{t.bandsHint}</p>
          </div>
          <ol className="grid gap-2">
            {s.bands.map((b, i) => {
              const errs = problems.filter((x) => x.i === i);
              const pct = b.fee_type === "percent";
              return (
                <li
                  key={i}
                  className={cx(
                    "border p-3",
                    errs.length ? "border-danger" : "border-border",
                  )}
                >
                  <p className="mb-2 text-eyebrow text-fg-subtle">
                    {fill(t.band, { n: i + 1 })}
                  </p>
                  <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
                    <Field label={t.min}>
                      {(a) => (
                        <Input
                          id={a.id}
                          type="number"
                          min={0}
                          value={b.min_amount_rwf}
                          onChange={(e) =>
                            setBand(i, {
                              min_amount_rwf: Number(e.target.value) || 0,
                            })
                          }
                          className={inp}
                        />
                      )}
                    </Field>
                    <Field label={t.max}>
                      {(a) => (
                        <Input
                          id={a.id}
                          type="number"
                          min={0}
                          placeholder={t.maxOpen}
                          value={b.max_amount_rwf ?? ""}
                          onChange={(e) =>
                            setBand(i, { max_amount_rwf: num(e.target.value) })
                          }
                          className={inp}
                        />
                      )}
                    </Field>
                    <Field label={t.feeType}>
                      {(a) => (
                        <Select
                          id={a.id}
                          value={b.fee_type}
                          onChange={(e) =>
                            setBand(i, { fee_type: e.target.value })
                          }
                          className="h-10"
                        >
                          <option value="flat">{t.flat}</option>
                          <option value="percent">{t.percent}</option>
                        </Select>
                      )}
                    </Field>
                    <Field label={`${t.fee}${pct ? " (%)" : " (RWF)"}`}>
                      {(a) => (
                        <Input
                          id={a.id}
                          type="number"
                          min={0}
                          step={pct ? 0.05 : 500}
                          value={(pct ? b.fee_percent : b.fee_rwf) ?? ""}
                          onChange={(e) =>
                            setBand(
                              i,
                              pct
                                ? { fee_percent: num(e.target.value) }
                                : { fee_rwf: num(e.target.value) },
                            )
                          }
                          className={inp}
                        />
                      )}
                    </Field>
                    <Field label={t.minFee}>
                      {(a) => (
                        <Input
                          id={a.id}
                          type="number"
                          min={0}
                          value={b.min_fee_rwf ?? ""}
                          onChange={(e) =>
                            setBand(i, { min_fee_rwf: num(e.target.value) })
                          }
                          className={inp}
                        />
                      )}
                    </Field>
                    <Field label={t.maxFee}>
                      {(a) => (
                        <Input
                          id={a.id}
                          type="number"
                          min={0}
                          value={b.max_fee_rwf ?? ""}
                          onChange={(e) =>
                            setBand(i, { max_fee_rwf: num(e.target.value) })
                          }
                          className={inp}
                        />
                      )}
                    </Field>
                    <button
                      type="button"
                      onClick={() =>
                        set({ bands: s.bands.filter((_, j) => j !== i) })
                      }
                      aria-label={fill(t.removeBand, { n: i + 1 })}
                      className="flex size-10 items-center justify-center text-fg-muted hover:bg-navy-50 hover:text-danger"
                    >
                      <Icon name="x" size={16} aria-hidden />
                    </button>
                  </div>
                  {errs.map((e) => (
                    <p key={e.kind} className="mt-2 text-small text-danger">
                      {t.problems[e.kind]}
                    </p>
                  ))}
                </li>
              );
            })}
          </ol>
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => {
              const last = s.bands.at(-1);
              const min = last
                ? (last.max_amount_rwf ?? last.min_amount_rwf) + 1
                : 0;
              set({
                bands: [
                  ...s.bands,
                  {
                    min_amount_rwf: min,
                    max_amount_rwf: null,
                    fee_type: "flat",
                    fee_rwf: 0,
                  },
                ],
              });
            }}
          >
            <Icon name="plus" size={16} aria-hidden /> {t.addBand}
          </Button>
          <div className="grid gap-2 bg-bg-tint p-4 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end">
            <Field label={t.amount}>
              {(a) => (
                <Input
                  id={a.id}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inp}
                />
              )}
            </Field>
            <p aria-live="polite" className="text-body text-link">
              <Icon
                name="chart"
                size={16}
                className="mr-1 inline"
                aria-hidden
              />
              <span className="sr-only">{t.calc}: </span>
              {band
                ? fill(t.result, {
                    amount: formatMoney(amt, "RWF", locale),
                    fee: formatMoney(bandFee(band, amt), "RWF", locale),
                  })
                : t.noBand}
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Switch
          label={t.planCovered}
          checked={s.planCovered}
          onChange={(e) => set({ planCovered: e.target.checked })}
        />
        <fieldset className="grid grid-cols-[8rem_1fr] items-end gap-2">
          <legend className="mb-1 text-label">{t.urgent}</legend>
          <Select
            aria-label={t.urgentType}
            value={s.urgentType}
            onChange={(e) =>
              set({ urgentType: e.target.value as "flat" | "percent" })
            }
            className="h-10"
          >
            <option value="percent">%</option>
            <option value="flat">RWF</option>
          </Select>
          <Input
            aria-label={t.urgentValue}
            type="number"
            min={0}
            value={s.urgentValue ?? ""}
            onChange={(e) => set({ urgentValue: num(e.target.value) })}
            className={inp}
          />
        </fieldset>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {reason && (
          <p className="text-small text-fg-subtle" id="pricing-reason">
            {reason}
          </p>
        )}
        <Button
          onClick={submit}
          loading={save.isPending}
          disabled={!!reason}
          aria-describedby={reason ? "pricing-reason" : undefined}
          dots
        >
          {t.save}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- SP2 SLA
export function SlaStep({
  draft,
  update,
  service,
}: {
  draft: Draft;
  update: Update;
  service: ServiceDetail;
}) {
  const { c, locale } = useC();
  const t = c.sla;
  const status = opsCommon(locale).status as Record<CaseStatus, string>;
  const [offset, setOffset] = useState("");
  const sla = draft.sla;
  const set = (patch: Partial<Draft["sla"]>) =>
    update((d) => ({ ...d, sla: { ...d.sla, ...patch } }));
  const tiers = service.pricing_tiers.length
    ? service.pricing_tiers.map((x) => [x.tier, x.label] as const)
    : Object.keys(sla.days).map((k) => [k, k] as const);
  const fmtOff = (h: number) =>
    h === 0 ? "T0" : h < 0 ? `T−${-h}h` : `T+${h}h`;
  const addOffset = () => {
    const h = Number(offset.replace("−", "-"));
    if (!offset.trim() || !Number.isFinite(h) || sla.offsets.includes(h))
      return;
    set({ offsets: [...sla.offsets, h].sort((a, b) => a - b) });
    setOffset("");
  };
  const chip =
    "inline-flex h-8 items-center gap-1 bg-navy-50 pl-3 pr-1 text-small text-navy-700";
  const x =
    "flex size-6 items-center justify-center hover:bg-white";
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid content-start gap-6">
        <h2 className="text-card-title">{t.title}</h2>
        <fieldset className="grid max-w-sm grid-cols-[1fr_10rem] items-end gap-2">
          <legend className="mb-1 text-label">{t.first}</legend>
          <Input
            aria-label={t.first}
            type="number"
            min={1}
            value={sla.firstResponse}
            onChange={(e) =>
              set({ firstResponse: Math.max(1, Number(e.target.value) || 1) })
            }
            className={inp}
          />
          <Select
            aria-label={t.unit}
            value={sla.firstResponseUnit}
            onChange={(e) =>
              set({ firstResponseUnit: e.target.value as "hours" | "days" })
            }
            className="h-10"
          >
            <option value="hours">{t.hours}</option>
            <option value="days">{t.daysUnit}</option>
          </Select>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-label">{t.completion}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiers.map(([k, label]) => (
              <Field key={k} label={label}>
                {(a) => (
                  <Input
                    id={a.id}
                    type="number"
                    min={1}
                    value={sla.days[k] ?? ""}
                    onChange={(e) =>
                      set({
                        days: {
                          ...sla.days,
                          [k]: Math.max(1, Number(e.target.value) || 1),
                        },
                      })
                    }
                    className={inp}
                  />
                )}
              </Field>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-label">{t.pauses}</legend>
          <ul className="flex flex-wrap gap-2">
            {sla.pauses.map((p) => (
              <li key={p} className={chip}>
                {status[p]}
                <button
                  type="button"
                  className={x}
                  onClick={() =>
                    set({ pauses: sla.pauses.filter((y) => y !== p) })
                  }
                  aria-label={fill(t.removePause, { s: status[p] })}
                >
                  <Icon name="x" size={14} aria-hidden />
                </button>
              </li>
            ))}
            <li>
              <Select
                aria-label={t.addPause}
                value=""
                onChange={(e) =>
                  e.target.value &&
                  set({ pauses: [...sla.pauses, e.target.value as CaseStatus] })
                }
                className="h-8 w-auto pr-9 text-small"
              >
                <option value="">{`+ ${t.addPause}`}</option>
                {CASE_STATUSES.filter((y) => !sla.pauses.includes(y)).map(
                  (y) => (
                    <option key={y} value={y}>
                      {status[y]}
                    </option>
                  ),
                )}
              </Select>
            </li>
          </ul>
        </fieldset>
        <fieldset>
          <legend className="text-label">{t.offsets}</legend>
          <p className="mb-2 text-small text-fg-subtle">{t.offsetsHint}</p>
          <ul className="flex flex-wrap items-center gap-2">
            {sla.offsets.map((o) => (
              <li key={o} className={cx(chip, "tabular")}>
                {fmtOff(o)}
                <button
                  type="button"
                  className={x}
                  onClick={() =>
                    set({ offsets: sla.offsets.filter((y) => y !== o) })
                  }
                  aria-label={fill(t.removeOffset, { o: fmtOff(o) })}
                >
                  <Icon name="x" size={14} aria-hidden />
                </button>
              </li>
            ))}
            <li className="flex gap-1">
              <Input
                aria-label={t.addOffset}
                placeholder="-24 / 0 / 48"
                inputMode="numeric"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addOffset())
                }
                className="h-8 w-28 text-small"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={addOffset}
              >
                {t.add}
              </Button>
            </li>
          </ul>
        </fieldset>
      </div>
      <aside className="grid content-start gap-3">
        <p className="flex gap-2 bg-navy-50 p-4 text-small text-navy-700">
          <Icon name="sparkle" size={18} aria-hidden className="shrink-0" />
          {t.info}
        </p>
        <div className="border border-border p-4">
          <h3 className="text-label">{t.policy}</h3>
          <p className="mt-1 flex items-center gap-2 text-small">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            {fill(t.policyLine, {
              first: `${sla.firstResponse} ${sla.firstResponseUnit === "hours" ? t.hours : t.daysUnit}`,
              std: sla.days.standard ?? Object.values(sla.days)[0] ?? "—",
            })}
          </p>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- SP3 versions + publish
function ChangeList({ changes }: { changes: Change[] }) {
  const { c } = useC();
  const t = c.versions;
  if (!changes.length)
    return <p className="text-small text-fg-subtle">{t.noChanges}</p>;
  return (
    <ul className="grid gap-1.5">
      {changes.map((x, i) => (
        <li
          key={i}
          className={cx(
            "flex items-start gap-2 px-3 py-2 text-small",
            x.kind === "added"
              ? "bg-success-bg text-success"
              : x.kind === "removed"
                ? "bg-danger-bg text-danger"
                : "bg-warning-bg text-warning",
          )}
        >
          <span aria-hidden className="font-medium">
            {x.kind === "added" ? "+" : x.kind === "removed" ? "−" : "~"}
          </span>
          <span className="min-w-0 break-words">
            <strong className="font-medium">{t.kinds[x.kind]}</strong>{" "}
            {t.areas[x.area]}: {x.label || "—"}
            {x.detail && <span className="text-fg-muted"> ({x.detail})</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function VersionsStep({
  slug,
  draft,
  version,
  publishedVersion,
  dirty,
  flushNow,
}: {
  slug: string;
  draft: Draft;
  version: number;
  publishedVersion: number | null;
  dirty: boolean;
  flushNow: () => void;
}) {
  const { c, locale } = useC();
  const t = c.versions;
  const p = useUrlParams();
  const versions = useVersions(slug);
  const sel = Number(p.get("v")) || version;
  const prevV = sel > 1 ? sel - 1 : null;
  const selQ = useVersion(slug, sel === version ? null : sel);
  const prevQ = useVersion(slug, prevV);
  const selDraft =
    sel === version ? draft : selQ.data ? fromStructure(selQ.data) : null;
  const prevDraft = prevQ.data ? fromStructure(prevQ.data) : null;
  const changes =
    selDraft && prevDraft
      ? diffDrafts(prevDraft, selDraft)
      : selDraft && !prevV
        ? null
        : undefined;
  const open = p.get("publish") === "1";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="min-w-0">
        <h2 className="mb-3 text-card-title">{t.title}</h2>
        {versions.isPending ? (
          <Skeleton className="h-48" />
        ) : versions.error ? (
          <PanelError what={t.title} onRetry={() => versions.refetch()} />
        ) : !versions.data?.versions.length ? (
          <p className="text-small text-fg-subtle">{t.empty}</p>
        ) : (
          <div
            role="region"
            aria-label={t.title}
            tabIndex={0}
            className="overflow-x-auto border border-border"
          >
            <table className="w-full min-w-[26rem] text-small">
              <thead className="bg-ink-100 text-left text-eyebrow text-fg-muted">
                <tr>
                  <th scope="col" className="h-10 px-3">
                    {t.version}
                  </th>
                  <th scope="col" className="px-3">
                    {t.date}
                  </th>
                  <th scope="col" className="px-3">
                    {t.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {versions.data.versions.map((v) => {
                  const on = v.version === sel;
                  return (
                    <tr
                      key={v.version}
                      className={cx(
                        "border-t border-border",
                        on && "bg-bg-tint",
                      )}
                    >
                      <th scope="row" className="px-3 text-left">
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setUrlParams({ v: String(v.version) })}
                          className="min-h-10 font-medium tabular underline-offset-4 hover:underline"
                        >
                          v{v.version}
                        </button>
                      </th>
                      <td className="px-3 tabular">
                        {formatDate(v.publishedAt ?? v.updatedAt, locale)}
                      </td>
                      <td className="px-3">
                        <Badge
                          tone={
                            v.status === "draft"
                              ? "info"
                              : v.status === "published"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {t.statuses[v.status] ?? v.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="grid content-start gap-4">
        <div>
          <h2 className="text-card-title">{fill(t.changesIn, { v: sel })}</h2>
          {prevV && (
            <p className="text-small text-fg-subtle">
              {fill(t.against, { v: prevV })}
            </p>
          )}
        </div>
        <div aria-live="polite">
          {changes === undefined ? (
            selQ.error || prevQ.error ? (
              <PanelError
                what={t.changesIn.replace("{v}", String(sel))}
                onRetry={() => (selQ.refetch(), prevQ.refetch())}
              />
            ) : (
              <p className="text-small text-fg-subtle">{t.loadingDiff}</p>
            )
          ) : changes === null ? (
            <p className="text-small text-fg-subtle">
              {fill(t.first, { v: sel })}
            </p>
          ) : (
            <ChangeList changes={changes} />
          )}
        </div>
        <Button
          dots
          className="justify-self-start"
          onClick={() => setUrlParams({ publish: "1" })}
        >
          {fill(t.publishV, { v: version })}
        </Button>
      </section>
      <PublishDialog
        open={open}
        slug={slug}
        draft={draft}
        version={version}
        publishedVersion={publishedVersion}
        dirty={dirty}
        flushNow={flushNow}
      />
    </div>
  );
}

function PublishDialog({
  open,
  slug,
  draft,
  version,
  publishedVersion,
  dirty,
  flushNow,
}: {
  open: boolean;
  slug: string;
  draft: Draft;
  version: number;
  publishedVersion: number | null;
  dirty: boolean;
  flushNow: () => void;
}) {
  const { c, locale } = useC();
  const t = c.versions;
  const toast = useToast();
  const phone = usePhone();
  const { request, dialog, reset } = useStepUp();
  const publish = usePublish(slug);
  const inFlight = useInFlight(slug, open ? publishedVersion : null);
  const pubQ = useVersion(slug, open ? publishedVersion : null);
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState("");
  const issues = blockers(draft);
  const changes = pubQ.data
    ? diffDrafts(fromStructure(pubQ.data), draft)
    : null;
  const unchanged =
    !!publishedVersion && changes !== null && changes.length === 0;
  const close = () => setUrlParams({ publish: null });
  const blockerText = (b: (typeof issues)[number]) =>
    b.kind === "lang"
      ? fill(t.blockers.lang, { lang: c.lang[b.lang], n: b.n })
      : t.blockers[b.kind];
  const n = inFlight.data ?? 0;

  const go = async () => {
    let token: string;
    try {
      token = await request(t.stepUp);
    } catch {
      return;
    }
    try {
      await publish.mutateAsync({
        token,
        note: `${note.trim() || "publish"}${notify ? " · notify team" : ""}`,
      });
      close();
      toast({ tone: "success", title: fill(t.published, { v: version }) });
    } catch (e) {
      if (e instanceof ApiError && e.errorType === "step_up_required") reset();
      toast({
        tone: "danger",
        title: t.failed,
        body: errorCopy(e, locale),
      });
    }
  };

  const blocked = issues.length > 0 || dirty || unchanged;
  return (
    <>
      <Dialog
        open={open}
        onClose={close}
        side={phone ? "bottom" : undefined}
        title={fill(t.publishTitle, { v: version })}
        description={
          !publishedVersion
            ? fill(t.first, { v: version })
            : inFlight.isPending
              ? undefined
              : n
                ? fill(t.pinned, { n, old: publishedVersion, v: version })
                : fill(t.pinnedNone, { v: version })
        }
        footer={
          <>
            <Button variant="outline" onClick={close}>
              {t.cancel}
            </Button>
            <Button
              onClick={go}
              loading={publish.isPending}
              disabled={blocked}
              aria-describedby={blocked ? "publish-blocked" : undefined}
              dots
            >
              {fill(t.publishV, { v: version })}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {blocked && (
            <div
              id="publish-blocked"
              role="alert"
              className="border border-warning bg-warning-bg p-3 text-small text-warning"
            >
              <p className="font-medium">{t.blocked}</p>
              <ul className="mt-1 list-disc pl-5">
                {dirty && (
                  <li>
                    {c.builder.unsaved}{" "}
                    <button
                      type="button"
                      onClick={flushNow}
                      className="min-h-6 font-medium underline"
                    >
                      {c.builder.retry}
                    </button>
                  </li>
                )}
                {unchanged && (
                  <li>{fill(t.nothingNew, { v: publishedVersion ?? 0 })}</li>
                )}
                {issues.map((b, i) => (
                  <li key={i}>{blockerText(b)}</li>
                ))}
              </ul>
            </div>
          )}
          {publishedVersion && (
            <section>
              <h3 className="mb-2 text-label">{t.summary}</h3>
              {changes ? (
                <ChangeList changes={changes} />
              ) : (
                <Skeleton className="h-16" />
              )}
            </section>
          )}
          <Field label={t.note}>
            {(a) => (
              <Textarea
                id={a.id}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-20"
              />
            )}
          </Field>
          <Switch
            label={t.notify}
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
        </div>
      </Dialog>
      {dialog}
    </>
  );
}

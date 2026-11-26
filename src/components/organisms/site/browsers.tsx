"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { Chips, setUrlParams, useUrlParams } from "@/components/molecules/site/library";


/** /updates institution + "affects" filters and "load older" over server-rendered entries. */
export function UpdatesBrowser({
  items,
  cards,
  insts,
  affects,
  copy,
  step = 3,
}: {
  items: { inst: string; affects: string[] }[];
  cards: ReactNode[];
  insts: string[];
  affects: { v: string; label: string }[];
  copy: {
    inst: string;
    affects: string;
    all: string;
    more: string;
    noneT: string;
    noneB: string;
    clear: string;
  };
  step?: number;
}) {
  const p = useUrlParams();
  const inst = p.get("inst") ?? "all";
  const aff = p.get("affects") ?? "all";
  const [limit, setLimit] = useState(step);
  const hits = items
    .map((it, i) => ({ it, i }))
    .filter(
      ({ it }) =>
        (inst === "all" || it.inst === inst) &&
        (aff === "all" || it.affects.includes(aff)),
    );
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-label" aria-hidden>
            {copy.inst}:
          </span>
          <Chips
            size="sm"
            label={copy.inst}
            value={inst}
            onChange={(v) => setUrlParams({ inst: v === "all" ? null : v })}
            options={[
              { v: "all", label: copy.all },
              ...insts.map((v) => ({ v, label: v })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-label" aria-hidden>
            {copy.affects}:
          </span>
          <Chips
            size="sm"
            label={copy.affects}
            value={aff}
            onChange={(v) => setUrlParams({ affects: v === "all" ? null : v })}
            options={[{ v: "all", label: copy.all }, ...affects]}
          />
        </div>
      </div>
      {hits.length ? (
        <ul className="grid gap-4">
          {hits.slice(0, limit).map(({ i }) => (
            <li key={i}>{cards[i]}</li>
          ))}
        </ul>
      ) : (
        <div
          role="status"
          className="grid justify-items-start gap-3 border border-dashed border-border-strong p-8"
        >
          <p className="text-h3">{copy.noneT}</p>
          <p className="text-body text-fg-muted">{copy.noneB}</p>
          <Button
            variant="secondary"
            onClick={() => setUrlParams({ inst: null, affects: null })}
          >
            {copy.clear}
          </Button>
        </div>
      )}
      {hits.length > limit && (
        <Button
          variant="outline"
          className="justify-self-center"
          onClick={() => setLimit((l) => l + step)}
        >
          {copy.more}
        </Button>
      )}
    </div>
  );
}

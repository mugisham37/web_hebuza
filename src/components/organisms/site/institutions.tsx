"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/atoms/icon";
import { LogoTile } from "@/components/atoms/logo-tile";
import { LogoMarquee } from "@/components/molecules/site/logo-marquee";
import { norm } from "@/lib/site/service-search";
import type { Institution } from "@/content/marketing";

type Copy = { tag: string; caption: string; find: string; findNone: string; findCount: string };
const MOTION = [{ seconds: 60 }, { seconds: 70, reverse: true }, { seconds: 65 }]; // alternate directions, unequal speeds so rows never line up

/** "Who we file with": title · caption (centre) · a small finder (right), then 3 moving logo rows. Typing in the finder
 *  (short form "RRA" or long name "revenue") swaps the rows for the matching tiles, standing still. */
export function InstitutionsBrowser({ rows, copy }: { rows: Institution[][]; copy: Copy }) {
  const [q, setQ] = useState("");
  const term = norm(q);
  const hits = useMemo(() => (term ? rows.flat().filter((i) => norm(`${i.short} ${i.name}`).includes(term)) : []), [rows, term]);
  return (
    <div className="grid gap-5">
      <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-8">
        <h2 className="text-h2 text-fg-heading">{copy.tag}</h2>
        <p className="max-w-sm text-eyebrow text-fg-muted md:text-center">{copy.caption}</p>
        <label className="relative w-full md:max-w-56 md:justify-self-end">
          <span className="sr-only">{copy.find}</span>
          <Icon name="search" size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-navy-700" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.find} autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }}
            className="h-9 w-full border border-navy-700/30 bg-white pr-3 pl-9 text-small text-fg placeholder:text-fg-subtle focus:border-navy-700 focus:outline-none" />
        </label>
      </div>
      {term ? (
        <div aria-live="polite" className="grid gap-2">
          <p className="text-eyebrow text-fg-muted">{hits.length ? copy.findCount.replace("{n}", String(hits.length)) : copy.findNone.replace("{q}", q.trim())}</p>
          {hits.length > 0 && <ul className="flex flex-wrap gap-3">{hits.map((i) => <li key={i.short}><LogoTile {...i} /></li>)}</ul>}
        </div>
      ) : (
        <div className="-mx-gutter grid gap-3 md:mx-0">
          {rows.map((r, i) => <LogoMarquee key={i} items={r} label={copy.tag} {...MOTION[i % MOTION.length]} />)}
        </div>
      )}
    </div>
  );
}

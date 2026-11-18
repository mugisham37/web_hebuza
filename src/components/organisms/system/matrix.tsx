"use client";
// U5 Permission matrix `/system/roles/matrix?roles=&q=&diff=1` (plan 06 §7 U5, board 05 RL2 with §3 fix: the sysadmin
// column comes from MATRIX, so content/money permissions render Locked "denied by policy", never Allowed).
// Generated from `MATRIX` (single source with the guards). Sticky header + first column, group collapse, arrow-key grid.
import { useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemRoles } from "@/content/pages/system-roles";
import { fill } from "@/content/pages/system-common";
import { cx } from "@/shared/format";
import { ROLES, type Role } from "@/shared/auth/roles";
import { CONTENT_PERMS, MATRIX, STEP_UP, scopeFor, type Permission, type Scope } from "@/shared/auth/permissions";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { Icon } from "@/components/atoms/icon";
import { Input, Switch } from "@/components/atoms/field";
import { EmptyPanel } from "@/components/molecules/ops/ops";
import { PermCell, useRoleLabel, useS, type PermValue } from "@/components/atoms/system";
import { SysPageHead } from "@/components/molecules/system/system";

const PERMS = Object.keys(MATRIX) as Permission[];
const GROUPS = [...new Set(PERMS.map((p) => p.split(".")[0]))];
const CONTENT = new Set<string>(CONTENT_PERMS);

/** Cell value for one built-in role (pure; also used by the role detail page). */
export function cellFor(role: Role, perm: Permission): { value: PermValue; scope: Scope | null } {
  const scope = scopeFor([role], perm);
  if (scope) return { value: "allow", scope };
  return { value: role === "staff:sysadmin" && CONTENT.has(perm) ? "locked" : "deny", scope: null };
}

export function MatrixView() {
  const { locale } = useI18n();
  const c = systemRoles(locale);
  const s = useS();
  const label = useRoleLabel();
  const p = useUrlParams();
  const q = (p.get("q") ?? "").trim().toLowerCase();
  const diff = p.get("diff") === "1";
  const rolesParam = p.get("roles") ?? "";
  const cols = useMemo<Role[]>(() => {
    const picked = rolesParam.split(",").filter((r): r is Role => (ROLES as readonly string[]).includes(r));
    return picked.length ? ROLES.filter((r) => picked.includes(r)) : [...ROLES];
  }, [rolesParam]);
  const [shut, setShut] = useState<Set<string>>(new Set());

  const groups = useMemo(() => GROUPS.map((g) => ({
    g,
    rows: PERMS.filter((perm) => perm.startsWith(`${g}.`))
      .filter((perm) => !q || perm.toLowerCase().includes(q) || (c.groups[g] ?? "").toLowerCase().includes(q))
      .filter((perm) => !diff || new Set(cols.map((r) => cellFor(r, perm).scope ?? cellFor(r, perm).value)).size > 1),
  })).filter((x) => x.rows.length), [q, diff, cols, c.groups]);

  const toggleRole = (r: Role) => {
    const next = cols.includes(r) ? cols.filter((x) => x !== r) : [...cols, r];
    setUrlParams({ roles: next.length === ROLES.length || !next.length ? null : next.join(",") });
  };

  /** Roving focus across gridcells: arrows, Home/End. */
  function onKey(e: KeyboardEvent<HTMLTableElement>) {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[role="gridcell"]');
    if (!cell?.parentElement) return;
    const grid = [...e.currentTarget.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll<HTMLElement>('[role="gridcell"]')]).filter((x) => x.length);
    const r = grid.findIndex((x) => x.includes(cell)), col = grid[r].indexOf(cell);
    const d = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] }[e.key];
    const target = d ? [r + d[0], col + d[1]] : e.key === "Home" ? [r, 0] : e.key === "End" ? [r, cols.length - 1] : null;
    if (!target) return;
    const el = grid[target[0]]?.[target[1]];
    if (!el) return;
    e.preventDefault();
    cell.tabIndex = -1; el.tabIndex = 0; el.focus();
  }

  let rowIx = 0;
  return (
    <div className="m-rise">
      <nav className="mb-3 text-small"><Link href={localHref(locale, "/system/roles")} className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.backToRoles}</Link></nav>
      <SysPageHead title={c.matrix} sub={c.matrixSub} />

      <div className="mb-4 grid gap-3 border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">{c.searchPerms}</span>
            <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
            <Input type="search" defaultValue={p.get("q") ?? ""} placeholder={c.searchPerms} className="pl-9" onChange={(e) => setUrlParams({ q: e.target.value || null })} />
          </label>
          <Switch label={c.diffOnly} checked={diff} onChange={(e) => setUrlParams({ diff: e.target.checked ? "1" : null })} />
        </div>
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">{c.columns}</legend>
          <span className="mr-1 text-eyebrow font-medium tracking-wide text-fg-subtle uppercase">{c.columns}</span>
          {ROLES.map((r) => (
            <button key={r} type="button" aria-pressed={cols.includes(r)} onClick={() => toggleRole(r)}
              className={cx("h-8 border px-3 text-small m-press", cols.includes(r) ? "border-secondary bg-secondary text-on-secondary" : "border-border text-fg-muted hover:bg-navy-50")}>
              {label(r)}
            </button>
          ))}
          {rolesParam !== "" && <button type="button" onClick={() => setUrlParams({ roles: null })} className="ml-1 text-small font-medium underline underline-offset-4">{c.allRoles}</button>}
        </fieldset>
        <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-small text-fg-muted" aria-label={c.legend}>
          <Legend icon="check" cls="text-success" text={s.perm.allow} />
          <Legend icon="minus" cls="text-fg-subtle" text={s.perm.deny} />
          <Legend icon="lock" cls="text-fg-subtle" text={c.lockedNote} />
          <Legend icon="shield" cls="text-navy-700" text={c.stepUpNote} />
        </dl>
      </div>

      {!groups.length ? (
        <EmptyPanel title={c.noPerms} body={c.noPermsBody} action={<button type="button" className="text-small font-medium underline underline-offset-4" onClick={() => setUrlParams({ q: null, diff: null })}>{c.clear}</button>} />
      ) : (
        <div className="max-h-[75dvh] overflow-auto border border-border bg-surface">
          <p id="mx-help" className="sr-only">{c.gridHelp}</p>
          <table role="grid" aria-label={c.matrix} aria-describedby="mx-help" onKeyDown={onKey} className="w-full border-separate border-spacing-0 text-left text-small">
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 left-0 z-20 min-w-56 border-b border-border bg-bg-subtle px-3 py-2 text-eyebrow font-medium tracking-wide text-fg-subtle uppercase">{c.permission}</th>
                {cols.map((r) => (
                  <th key={r} scope="col" className={cx("sticky top-0 z-10 border-b border-border px-3 py-2 text-small font-medium whitespace-nowrap", r === "staff:sysadmin" ? "bg-navy-800 text-white" : "bg-bg-subtle")}>{label(r)}</th>
                ))}
              </tr>
            </thead>
            {groups.map(({ g, rows }) => {
              const closed = shut.has(g) && !q;
              const name = c.groups[g] ?? g;
              return (
                <tbody key={g}>
                  <tr>
                    <th colSpan={cols.length + 1} scope="rowgroup" className="sticky left-0 border-b border-border bg-surface px-0 text-left">
                      <button type="button" aria-expanded={!closed} onClick={() => setShut((x) => { const n = new Set(x); if (n.has(g)) n.delete(g); else n.add(g); return n; })}
                        aria-label={fill(closed ? c.expand : c.collapse, { g: name })}
                        className="flex h-10 w-full items-center gap-2 px-3 text-label hover:bg-navy-50/60">
                        <Icon name="chevronDown" size={15} aria-hidden className={cx("transition-transform duration-200", closed && "-rotate-90")} />
                        {name}<span className="text-small font-normal text-fg-subtle">{fill(c.groupCount, { n: rows.length })}</span>
                      </button>
                    </th>
                  </tr>
                  {!closed && rows.map((perm) => {
                    const ri = rowIx++;
                    return (
                      <tr key={perm} className="hover:bg-navy-50">
                        <th scope="row" className="sticky left-0 z-[5] border-b border-border bg-surface px-3 py-2 font-mono text-[0.8125rem] font-normal whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">{perm}{STEP_UP.has(perm) && <Icon name="shield" size={13} className="text-navy-700" aria-label={c.stepUpNote} />}</span>
                        </th>
                        {cols.map((r, ci) => {
                          const v = cellFor(r, perm);
                          return <PermCell key={r} value={v.value} scope={v.scope} note={v.value === "locked" ? c.lockedNote : undefined} tabIndex={ri === 0 && ci === 0 ? 0 : -1} />;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </div>
  );
}

function Legend({ icon, cls, text }: { icon: "check" | "minus" | "lock" | "shield"; cls: string; text: string }) {
  return <div className="flex max-w-md items-start gap-1.5"><dt><Icon name={icon} size={14} aria-hidden className={cx("mt-0.5", cls)} /></dt><dd>{text}</dd></div>;
}

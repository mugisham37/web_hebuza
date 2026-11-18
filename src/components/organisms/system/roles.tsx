"use client";
// U5 Roles list `/system/roles?q=&type=builtin|custom` (plan 06 §7 U5, board 05 RL1 with §3 fixes: only the 11 canonical
// roles + custom roles, no "Branch" scope). Built-in roles are read-only (F-IAM-02); custom roles sit behind `custom_roles`.
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemRoles } from "@/content/pages/system-roles";
import { fill } from "@/content/pages/system-common";
import { cx, formatDateTime } from "@/shared/format";
import { useRoles, type RoleRowVM } from "@/lib/system/c";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { Input } from "@/components/atoms/field";
import { EmptyPanel } from "@/components/molecules/ops/ops";
import { RoleChip, useRoleLabel } from "@/components/atoms/system";
import { SysPageHead } from "@/components/molecules/system/system";
import { QueryFail, Skeleton, TABLE, TD, TH } from "@/components/molecules/system/system";

type T = "all" | "builtin" | "custom";

export function RolesView() {
  const c = systemRoles(useI18n().locale);
  const { locale } = useI18n();
  const label = useRoleLabel();
  const p = useUrlParams();
  const q = p.get("q") ?? "";
  const type = (["builtin", "custom"].includes(p.get("type") ?? "") ? p.get("type") : "all") as T;
  const r = useRoles();

  const head = (
    <SysPageHead title={c.title} sub={c.sub} actions={<>
      <ButtonLink href={localHref(locale, "/system/roles/matrix")} variant="outline" size="sm"><Icon name="layers" size={15} aria-hidden />{c.openMatrix}</ButtonLink>
      {r.data?.customEnabled && <ButtonLink href={localHref(locale, "/system/roles/new")} size="sm"><Icon name="plus" size={15} aria-hidden />{c.newRole}</ButtonLink>}
    </>} />
  );
  if (r.isError && !r.data) return <div className="m-rise">{head}<QueryFail error={r.error} what={c.title} onRetry={() => r.refetch()} /></div>;

  const all = r.data?.items ?? [];
  const needle = q.trim().toLowerCase();
  const rows = all.filter((x) => (type === "all" || (type === "builtin") === x.builtin) && (!needle || `${label(x.role)} ${x.name} ${x.role}`.toLowerCase().includes(needle)));
  const counts = { all: all.length, builtin: all.filter((x) => x.builtin).length, custom: all.filter((x) => !x.builtin).length };

  return (
    <div className="m-rise">
      {head}
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="grid content-start gap-3">
          <label className="relative block">
            <span className="sr-only">{c.search}</span>
            <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
            <Input type="search" value={q} placeholder={c.search} className="pl-9" onChange={(e) => setUrlParams({ q: e.target.value || null })} />
          </label>
          <nav aria-label={c.title} className="flex gap-1 overflow-x-auto lg:grid">
            {(["all", "builtin", "custom"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={type === k} onClick={() => setUrlParams({ type: k === "all" ? null : k })}
                className={cx("flex h-10 shrink-0 items-center justify-between gap-3 px-3 text-small m-press", type === k ? "bg-navy-50 font-medium text-navy-700" : "hover:bg-navy-50")}>
                <span className="flex items-center gap-2"><Icon name={k === "custom" ? "users" : k === "builtin" ? "lock" : "layers"} size={15} aria-hidden />{c.type[k]}</span>
                <span className="tabular text-fg-subtle">{counts[k]}</span>
              </button>
            ))}
          </nav>
          {r.data && !r.data.customEnabled && (
            <div className="grid gap-2 border border-border bg-bg-subtle p-4 text-small">
              <p className="flex items-center gap-2 font-medium"><Icon name="lock" size={15} aria-hidden />{c.customOff}</p>
              <p className="text-fg-muted">{c.customOffBody}</p>
              <Link href={localHref(locale, "/system/settings?group=flags")} className="font-medium text-link underline underline-offset-4">{c.openFlags}</Link>
            </div>
          )}
          {r.data?.customEnabled && <p className="inline-flex w-fit items-center gap-1.5 bg-gold-100 text-gold-800 px-2.5 py-1 text-eyebrow font-medium">{c.preview}</p>}
        </aside>

        <section aria-busy={r.isPending} className="min-w-0">
          {r.isPending ? <Skeleton rows={8} /> : !rows.length ? (
            type === "custom" && !needle
              ? <EmptyPanel title={c.emptyCustom} body={c.emptyCustomBody} action={r.data?.customEnabled ? <ButtonLink href={localHref(locale, "/system/roles/new")} size="sm">{c.newRole}</ButtonLink> : undefined} />
              : <EmptyPanel title={c.empty} body={c.emptyBody} action={<button type="button" className="text-small font-medium underline underline-offset-4" onClick={() => setUrlParams({ q: null, type: null })}>{c.clear}</button>} />
          ) : (
            <>
              <p className="mb-2 text-small text-fg-subtle" aria-live="polite">{fill(c.count, { n: rows.length })}</p>
              {/* desktop table */}
              <div className="hidden overflow-x-auto border border-border bg-surface md:block">
                <table className={TABLE}>
                  <thead><tr>
                    <th className={TH}>{c.col.role}</th><th className={cx(TH, "text-right")}>{c.col.members}</th><th className={TH}>{c.col.privileged}</th>
                    <th className={TH}>{c.col.lastChanged}</th><th className={TH}>{c.col.status}</th><th className={TH}><span className="sr-only">{c.view}</span></th>
                  </tr></thead>
                  <tbody className="m-stagger">
                    {rows.map((x, i) => (
                      <tr key={x.slug} style={{ ["--i" as string]: Math.min(i, 6) }} className="hover:bg-navy-50/50">
                        <td className={TD}><RoleName x={x} /></td>
                        <td className={cx(TD, "text-right tabular")}>{x.members}</td>
                        <td className={TD}><Priv on={x.privileged} /></td>
                        <td className={cx(TD, "tabular text-fg-muted")}>{x.lastChangedAt ? formatDateTime(x.lastChangedAt, locale) : c.never}</td>
                        <td className={TD}><Status x={x} /></td>
                        <td className={cx(TD, "text-right")}><Link href={localHref(locale, `/system/roles/${x.slug}`)} className="font-medium text-link underline-offset-4 hover:underline">{c.view}<span className="sr-only"> {label(x.role)}</span></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* phone: stacked rows */}
              <ul className="grid gap-2 md:hidden">
                {rows.map((x) => (
                  <li key={x.slug}>
                    <Link href={localHref(locale, `/system/roles/${x.slug}`)} className="grid gap-2 border border-border bg-surface p-4 m-lift">
                      <span className="flex items-center justify-between gap-2"><RoleName x={x} /><Icon name="arrowRight" size={16} aria-hidden className="text-fg-subtle" /></span>
                      <span className="flex flex-wrap items-center gap-3 text-small text-fg-muted">
                        <span className="tabular">{x.members} {c.col.members.toLowerCase()}</span><Priv on={x.privileged} /><Status x={x} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function RoleName({ x }: { x: RoleRowVM }) {
  const c = systemRoles(useI18n().locale);
  return (
    <span className="flex min-w-0 items-center gap-2">
      {x.builtin ? <Icon name="lock" size={14} aria-label={c.builtinLock} className="shrink-0 text-fg-subtle" /> : <Icon name="users" size={14} aria-hidden className="shrink-0 text-navy-700" />}
      <RoleChip role={x.builtin ? x.role : x.name} privileged={x.privileged} />
    </span>
  );
}
function Priv({ on }: { on: boolean }) {
  const c = systemRoles(useI18n().locale);
  return <span className={cx("inline-flex h-6 items-center px-2 text-eyebrow font-medium", on ? "bg-navy-50 text-navy-700" : "bg-ink-100 text-ink-700")}>{on ? c.yes : c.no}</span>;
}
function Status({ x }: { x: RoleRowVM }) {
  const c = systemRoles(useI18n().locale);
  const k = x.pending ? "pending" : x.status;
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-small", k === "pending" ? "text-link" : k === "retired" ? "text-fg-subtle" : "text-success")}>
      <Icon name={k === "pending" ? "clock" : k === "retired" ? "minus" : "check"} size={13} aria-hidden />{c.status[k]}
    </span>
  );
}

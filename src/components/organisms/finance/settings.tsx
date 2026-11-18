"use client";
// U17 Finance settings shell (lane F, board 13): section nav, approval banner, pending-change panel, section switch.
// Finance proposes; executives approve/reject here (step-up) and see values read-only (X-6, D12).
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatDate } from "@/shared/format";
import { useSession } from "@/lib/auth/session";
import { newIdempotencyKey } from "@/lib/api/client";
import { useDecideSetting, useFinSettings } from "@/lib/finance/api";
import { showValue, useDecideLocal, type LocalChange } from "@/lib/finance/f";
import type { SettingChange } from "@/shared/finance/types";
import { fill } from "@/content/pages/finance-common";
import { useNow, PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { FinStatus } from "@/components/atoms/finance";
import { useStepUpAction } from "@/components/molecules/finance/finance";
import { Avatar } from "@/components/atoms/misc";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { RejectDialog, useS } from "@/components/organisms/finance/settings-dialogs";
import { AccountsSection, HistorySection, NumberingSection, PoliciesSection, TaxSection } from "@/components/organisms/finance/settings-panels";

import { SECTIONS, type Section } from "@/components/molecules/finance/settings-sections";

/** Who can do what on this page; `today` is null until the client clock ticks (React Compiler: no Date in render). */
export function useCtx() {
  const { user } = useSession();
  const online = useOnline();
  const now = useNow();
  const finance = !!user?.roles.includes("staff:finance");
  const exec = !!user?.roles.includes("staff:executive");
  // shortcut: "today" uses the browser's UTC date, not Africa/Kigali, upgrade with a tz-aware date helper in lib/format.
  const today = now ? new Date(now).toISOString().slice(0, 10) : null;
  return { now: now ?? 0, me: user?.id ?? "", finance, exec, online, canEdit: finance && online && !!today, today: today ?? "", year: now ? new Date(now).getUTCFullYear() : 2026 };
}

const ICONS: Record<Section, "wallet" | "layers" | "building" | "shield" | "clock"> = { tax: "wallet", numbering: "layers", accounts: "building", policies: "shield", history: "clock" };

export function SettingsView({ section }: { section: Section }) {
  const s = useS();
  const { locale } = useI18n();
  const c = useCtx();
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <PageHead title={s.title} sub={s.sub} />
      <nav aria-label={s.nav} className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1 border-b border-border">
          {SECTIONS.map((x) => (
            <li key={x}>
              <Link href={localHref(locale, `/finance/settings/${x}`)} aria-current={x === section ? "page" : undefined}
                className={cx("relative flex h-11 items-center gap-2 px-3 text-small font-medium transition-colors",
                  x === section ? "text-fg-heading after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-primary" : "text-fg-muted hover:text-fg")}>
                <Icon name={ICONS[x]} size={14} aria-hidden />{s.sections[x]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {section !== "history" && (
        <p className="flex items-start gap-3 bg-info-bg px-4 py-3 text-small m-rise">
          <Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0 text-navy-600" />
          <span>{c.exec && !c.finance ? s.execBanner : s.approvalBanner}</span>
        </p>
      )}
      {!c.online && (
        <p role="status" className="flex items-center gap-2 bg-secondary px-4 py-3 text-small text-on-navy">
          <Icon name="globe" size={16} aria-hidden />{s.states.offline}
        </p>
      )}
      <div key={section} className="grid gap-5 m-stagger">
        {section === "tax" && <TaxSection />}
        {section === "numbering" && <NumberingSection />}
        {section === "accounts" && <AccountsSection />}
        {section === "policies" && <PoliciesSection />}
        {section === "history" && <HistorySection />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pending changes (core keys + local tables)
export type Pending = { id: string; label: string; old: string; next: string; effectiveAt: string; status: string; by: { id: string; name: string }; reason: string; core: boolean };

/** Display a core or local change for the pending panel. */
export function usePendingCore(keys: readonly string[]): Pending[] {
  const s = useS();
  const { locale } = useI18n();
  const q = useFinSettings();
  return (q.data?.changes ?? [])
    .filter((ch: SettingChange) => keys.includes(ch.key) && (ch.status === "proposed" || ch.status === "approved"))
    .map((ch) => ({ id: ch.id, label: s.keys[ch.key], old: showValue(ch.key, ch.old, locale, s.unit), next: showValue(ch.key, ch.next, locale, s.unit),
      effectiveAt: ch.effectiveAt, status: ch.status === "approved" ? "scheduled" : ch.status, by: ch.proposedBy, reason: ch.reason, core: true }));
}
export function localPending(changes: LocalChange[], show: (key: string, v: unknown) => string, label: (key: string) => string): Pending[] {
  return changes.filter((ch) => ch.status === "proposed" || ch.status === "approved").map((ch) => ({
    id: ch.id, label: label(ch.key), old: show(ch.key, ch.old), next: show(ch.key, ch.next), effectiveAt: ch.effectiveAt,
    status: ch.status === "approved" ? "scheduled" : ch.status, by: ch.proposedBy, reason: ch.reason, core: false,
  }));
}

/** Proposed + scheduled changes. Executives approve/reject (step-up); the maker sees "another person decides". */
export function PendingPanel({ items }: { items: Pending[] }) {
  const s = useS();
  const { locale } = useI18n();
  const c = useCtx();
  const toast = useToast();
  const core = useDecideSetting();
  const local = useDecideLocal();
  const { run, dialog } = useStepUpAction();
  const [rejecting, setRejecting] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (!items.length) return null;

  async function decide(p: Pending, decision: "approve" | "reject", reason?: string) {
    setBusy(p.id);
    const idempotencyKey = newIdempotencyKey();
    try {
      const r = await run(s.pending.approveWhat, (stepUp): Promise<unknown> => { const v = { id: p.id, decision, reason, stepUp, idempotencyKey }; return p.core ? core.mutateAsync(v) : local.mutateAsync(v); });
      if (r) toast({ title: decision === "approve" ? s.pending.approved : s.pending.rejected, tone: "success" });
    } catch { /* mapped toast shown by useStepUpAction */ } finally { setBusy(null); }
  }
  return (
    <section aria-labelledby="pending-h" className="border border-warning/30 bg-warning-bg/40 p-4 sm:p-5 m-rise">
      <h2 id="pending-h" className="mb-3 flex items-center gap-2 text-label-lg"><Icon name="clock" size={16} aria-hidden className="text-warning" />{s.pending.title}</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((p) => {
          const mine = p.by.id === c.me;
          return (
            <li key={p.id} className="grid gap-3 border border-border bg-white p-4 m-lift">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-label">{p.label}</p>
                <FinStatus status={p.status} />
              </div>
              <p className="flex flex-wrap items-center gap-2 text-body tabular">
                <span className="sr-only">{s.pending.title}: </span>
                <del className="text-fg-muted">{p.old}</del><Icon name="arrowRight" size={14} aria-hidden /><ins className="font-medium text-fg no-underline">{p.next}</ins>
              </p>
              <p className="text-small text-fg-muted">{fill(s.pending.effective, { d: formatDate(p.effectiveAt, locale) })} · “{p.reason}”</p>
              <div className="flex items-center gap-2 text-small"><Avatar name={p.by.name} size="sm" />{fill(s.pending.by, { who: p.by.name })}</div>
              {p.status === "proposed" && (c.exec && !mine ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="m-press" loading={busy === p.id} disabled={!c.online} onClick={() => decide(p, "approve")}>{s.pending.approve}</Button>
                  <Button size="sm" variant="outline" className="m-press" disabled={!c.online || busy === p.id} onClick={() => setRejecting(p)}>{s.pending.reject}</Button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-eyebrow text-fg-subtle"><Icon name="shield" size={12} aria-hidden />{mine ? s.pending.youProposed : s.pending.waitingExec}</p>
              ))}
            </li>
          );
        })}
      </ul>
      <RejectDialog key={rejecting?.id ?? "none"} open={!!rejecting} onClose={() => setRejecting(null)} onConfirm={async (reason) => {
        if (rejecting) await decide(rejecting, "reject", reason);
        setRejecting(null);
      }} />
      {dialog}
    </section>
  );
}

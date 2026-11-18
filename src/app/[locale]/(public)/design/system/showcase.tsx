"use client";
// /design/system — every Stage 6 atom and molecule in every state (board 01 SK1–SK7, PSK). Static fixtures only.
import { useState, type ReactNode } from "react";
import {
  ChainBadge, CategoryChip, CountdownPill, DiffLine, EnforcedByHint, EnvPill, HealthPill, IdentityBlock, LockedContent, MfaBadge,
  PermCell, RoleChip, SecretField, SevPill, StatusDot, SysArt, type ArtName,
} from "@/components/atoms/system";
import {
  ApproverPath, AuditRow, BreakGlassBanner, BudgetBar, ConflictBanner, DiffView, EmailPreview, EventRuleRow, ImpersonationBanner,
  IntegrationCard, MaintenanceBanner, OfflineBanner, PendingChangeBanner, PostureCheck, SessionRow, SettingField, SetupChecklist,
  SmsBubble, UptimeBars, WhatsAppBubble, maskEmail,
} from "@/components/molecules/system/system";
import { SkeletonRows } from "@/components/atoms/agent";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { propose } from "@/shared/system/approvals";
import { settingDef } from "@/shared/system/settings-registry";
import { health } from "@/shared/system/integrations";
import { AUDIT_CATEGORIES } from "@/shared/system/audit-catalogue";
import type { AuditEntryVM, EventRuleVM, Health, IntegrationVM, UserStatus } from "@/shared/system/types";

const H = 3600_000;
// Fixture clock read once at module load (never in render).
const T0 = Date.now();
const iso = (h: number) => new Date(T0 + h * H).toISOString();
const INNOCENT = { id: "mock-sysadmin", name: "Innocent Kayitare" };
const CR = propose({ id: "CR-2026-0044", kind: "invite_privileged", title: "Invite Olivier Nshimiyimana as Finance officer", by: INNOCENT, now: T0 - 2 * H, reason: "Second finance officer for maker-checker.", before: { roles: [] }, after: { roles: ["staff:finance"] }, payload: { role: "staff:finance" } });
const BG = propose({ id: "CR-2026-0045", kind: "break_glass", title: "Break-glass for 1 h", by: INNOCENT, now: T0 - 0.2 * H, reason: "Both sysadmins locked out.", before: null, after: null });
const BG_HALF = { ...BG, decisions: [{ by: { id: "mock-sysadmin2", name: "Yvonne Uwamahoro", role: "staff:sysadmin" as const }, decision: "approve" as const, at: iso(-0.1) }] };
const integ = (o: Partial<IntegrationVM> & Pick<IntegrationVM, "key" | "name">): IntegrationVM => {
  const base: IntegrationVM = { group: "messaging", env: "production", configured: true, credentials: [{ name: "API key", last4: "3f9a", rotatedAt: iso(-41 * 24) }], lastTest: { at: iso(-1), ok: true, message: "ok", env: "production" }, envChangedAt: null, errorRate1h: 0.01, health: "untested", version: 1, ...o };
  return { ...base, health: health(base) };
};
const AUDIT: AuditEntryVM = { id: "AUD-000231", at: iso(-0.5), actorId: "mock-sysadmin", actorLabel: "Innocent Kayitare", actorRole: "staff:sysadmin", impersonatorId: null, category: "config", action: "config.template.changed", resourceType: "template", resourceId: "security.new_device_login", details: {}, ip: "41.186.23.10", userAgent: "Chrome", requestId: "req_1", sessionId: "ses_1", prevHash: "0".repeat(64), hash: "9f3c" + "0".repeat(56) + "a17e" };
const RULE: EventRuleVM = { event: "auth.unusual_login", critical: true, security: true, priority: "high", channels: { inapp: true, email: true, whatsapp: false, sms: false }, chain: ["email"], quietHours: "send" };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 border border-border bg-white p-5 sm:p-6">
      <h2 id={id} className="mb-5 text-eyebrow tracking-wide text-fg-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-2 border-b border-border py-3 last:border-0 sm:grid-cols-[10rem_1fr] sm:items-center"><p className="text-small text-fg-muted">{label}</p><div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div></div>
);

export function SystemKitShowcase() {
  const [rule, setRule] = useState(RULE);
  const [idle, setIdle] = useState<unknown>(20);
  const def = settingDef("security.idle_minutes.staff")!;
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-gutter pt-[var(--spacing-hero-top)] pb-16">
      <header>
        <p className="text-eyebrow text-fg-subtle uppercase">Stage 6 · System Administrator</p>
        <h1 className="text-h2">System component kit</h1>
        <p className="mt-1 text-body text-fg-muted">Secure. Audited. In control. Every atom and molecule in every state; motion follows the m-* language and collapses under reduced motion.</p>
      </header>

      <Section id="sk1" title="SK1 · Identity">
        <IdentityBlock name="Innocent Kayitare" email={maskEmail("innocent.kayitare@hebuza.example")} roles={["staff:sysadmin"]} status="active" mfa={{ state: "enrolled", methods: ["webauthn", "totp"] }} lastActiveAt={iso(-2)} you />
        <div className="mt-4">
          <Row label="Roles"><RoleChip role="staff:sysadmin" /><RoleChip role="staff:agent" /><RoleChip role="staff:finance" /><RoleChip role="Auditor (custom)" /><RoleChip role="staff:procurement" conflict /><RoleChip role="staff:marketing" removable onRemove={() => {}} /><RoleChip role="staff:admin" /></Row>
          <Row label="Status">{(["active", "invited", "invite_expired", "invite_revoked", "suspended", "locked", "deactivated"] as UserStatus[]).map((s) => <StatusDot key={s} status={s} />)}</Row>
          <Row label="MFA"><MfaBadge state="enrolled" methods={["totp"]} /><MfaBadge state="enrolled" methods={["webauthn", "totp"]} /><MfaBadge state="pending" /><MfaBadge state="reset" /></Row>
          <Row label="Long name"><IdentityBlock name="Uwimana Mukamurenzi Jeanne d'Arc Nyirahabimana" email={maskEmail("jeanne.darc.nyirahabimana@hebuza.example")} roles={["staff:agent", "staff:service_manager", "staff:marketing"]} status="locked" mfa={{ state: "reset", methods: [] }} lastActiveAt={null} /></Row>
        </div>
      </Section>

      <Section id="sk2" title="SK2 · Permission matrix cells">
        <div className="overflow-x-auto pt-8">
          <table role="grid" aria-label="Permission matrix sample" className="w-full min-w-[34rem] border-collapse text-left">
            <thead><tr className="border-b border-border text-small text-fg-muted"><th className="px-3 py-2 font-medium">Permission</th><th className="px-3 py-2 font-medium">client</th><th className="px-3 py-2 font-medium">staff:agent</th><th className="px-3 py-2 font-medium">staff:finance</th><th className="px-3 py-2 font-medium">staff:sysadmin</th></tr></thead>
            <tbody>
              <tr className="border-b border-border"><th scope="row" className="px-3 font-mono text-[0.8rem] font-normal">fin.invoice.manage</th><PermCell value="deny" /><PermCell value="deny" /><PermCell value="allow" scope="all" tabIndex={0} /><PermCell value="deny" note="Sysadmin never moves money (spec/02 §4.1)" /></tr>
              <tr className="border-b border-border"><th scope="row" className="px-3 font-mono text-[0.8rem] font-normal">req.case.read</th><PermCell value="allow" scope="org" /><PermCell value="allow" scope="own" /><PermCell value="inherit" note="From base role" /><PermCell value="locked" note="Case content is never available to sysadmin" /></tr>
              <tr><th scope="row" className="px-3 font-mono text-[0.8rem] font-normal">set.configure</th><PermCell value="deny" /><PermCell value="deny" /><PermCell value="deny" /><PermCell value="changed" note="Pending approval CR-2026-0041" /></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="sk3" title="SK3 · Two-person approval">
        <div className="grid gap-4 lg:grid-cols-2">
          <ApproverPath cr={CR} names={{ "staff:executive": "Alice Mutoni (Executive)" }} />
          <ApproverPath cr={CR} me={INNOCENT.id} />
          <ApproverPath cr={BG_HALF} />
          <ApproverPath cr={{ ...CR, state: "applied", decisions: [{ by: { id: "mock-exec", name: "Alice Mutoni", role: "staff:executive" }, decision: "approve", at: iso(-1) }] }} />
        </div>
      </Section>

      <Section id="sk4" title="SK4 · Secrets & environment">
        <div className="grid gap-6 lg:grid-cols-2">
          <SecretField name="API key" last4="3f9a" rotatedAt={iso(-41 * 24)} lastTest={{ ok: true, message: "ok", at: iso(-0.2) }} onSave={async () => {}} onTest={async () => ({ ok: true, message: "200 OK" })} />
          <SecretField name="Webhook secret" last4="a17e" rotatedAt={iso(-200 * 24)} lastTest={{ ok: false, message: "401 invalid signature", at: iso(-3) }} onSave={async () => {}} onTest={async () => ({ ok: false, message: "401 invalid signature" })} />
        </div>
        <Row label="Environment"><EnvPill env="production" /><EnvPill env="sandbox" /><EnvPill env="staging" /><EnvPill env="development" /></Row>
      </Section>

      <Section id="sk5" title="SK5 · Health & status">
        <Row label="Health">{(["operational", "degraded", "down", "untested", "maintenance"] as Health[]).map((h) => <HealthPill key={h} health={h} />)}</Row>
        <div className="grid gap-4 py-3 sm:grid-cols-3">
          <IntegrationCard integration={integ({ key: "whatsapp", name: "WhatsApp Business Cloud API", usage: { used: 6120, limit: 10000, unit: "messages" } })} />
          <IntegrationCard integration={integ({ key: "sms", name: "SMS gateway", errorRate1h: 0.06 })} />
          <IntegrationCard integration={integ({ key: "id", name: "ID verification", env: "sandbox", lastTest: null })} />
        </div>
        <div className="grid gap-4 py-3 sm:grid-cols-2">
          <UptimeBars days={Array.from({ length: 90 }, (_, i) => ({ date: `d${i}`, up: i === 61 ? 0.982 : i === 30 ? 0.995 : 1 }))} />
          <div className="grid gap-3">
            <BudgetBar label="AI assistant" spent={182000} budget={250000} />
            <BudgetBar label="SMS" spent={124650} budget={150000} />
            <BudgetBar label="WhatsApp (marketing)" spent={410000} budget={400000} />
          </div>
        </div>
      </Section>

      <Section id="sk6" title="SK6 · Change & audit">
        <div className="grid gap-4 lg:grid-cols-2">
          <DiffView title="settings.feature_flags" before={{ enable_beta: false, max_items: 50, api_token: "sk_live_abc" }} after={{ enable_beta: true, max_items: 100, api_token: "sk_live_xyz" }} />
          <div className="grid content-start gap-2">
            <DiffLine kind="-" text='roles: []' /><DiffLine kind="+" text='roles: ["staff:finance"]' /><DiffLine kind="=" text='email: o.nsh…@hebuza.example' />
          </div>
        </div>
        <Row label="Chain"><ChainBadge state="verified" entries={48213} hash={AUDIT.hash} /><ChainBadge state="checking" /><ChainBadge state="broken" brokenAt="AUD-S00121" /></Row>
        <Row label="Categories">{AUDIT_CATEGORIES.map((c) => <CategoryChip key={c} category={c} />)}</Row>
        <Row label="Severity"><SevPill sev={1} /><SevPill sev={2} /><SevPill sev={3} /></Row>
        <div className="overflow-x-auto"><table className="w-full min-w-[40rem]"><tbody><AuditRow entry={AUDIT} onOpen={() => {}} /><AuditRow entry={{ ...AUDIT, id: "AUD-2", action: "access.denied", category: "access_control", resourceType: "case", resourceId: "HBZ-4K2M9Q", breakGlass: true }} onOpen={() => {}} /></tbody></table></div>
      </Section>

      <Section id="sk7" title="SK7 · Guard rails & banners">
        <div className="grid gap-3">
          <BreakGlassBanner until={iso(0.75)} actor="Innocent Kayitare" onEnd={() => {}} />
          <ImpersonationBanner target="Eric Habimana" reason="TKT-2026-00142" until={iso(0.24)} onEnd={() => {}} />
          <MaintenanceBanner message={{ rw: "HEBUZA iri kuvugururwa", en: "HEBUZA is being updated", fr: "HEBUZA est en mise à jour" }} until={iso(3)} />
          <OfflineBanner since={iso(-0.3)} />
          <ConflictBanner by="Alice Mutoni" at={iso(-0.02)} onReview={() => {}} onReload={() => {}} />
          <PendingChangeBanner changes={[CR]} />
          <div className="grid gap-3 lg:grid-cols-2"><LockedContent reason="role" /><div className="grid content-start gap-3"><LockedContent reason="impersonation" compact /><LockedContent reason="break_glass_required" compact /></div></div>
        </div>
        <Row label="Countdown"><CountdownPill until={iso(2)} /><CountdownPill until={iso(0.2)} /><CountdownPill until={iso(0.5)} danger /><CountdownPill until={iso(-1)} /></Row>
      </Section>

      <Section id="settings" title="Settings field">
        <SettingField def={def} label="Staff idle timeout" description="Signed-in staff are signed out after this many idle minutes." value={idle} onChange={setIdle} changedBy="Innocent Kayitare" changedAt={iso(-30 * 24)} error={def.validate(idle) ? "Between 5 and 480 minutes." : null} />
        <SettingField def={settingDef("security.password_policy")!} label="Password policy" value={settingDef("security.password_policy")!.default} onChange={() => {}} />
        <SettingField def={settingDef("general.numbering")!} label="Numbering" value={settingDef("general.numbering")!.default} onChange={() => {}} />
        <EnforcedByHint component="API session middleware (idle)" />
      </Section>

      <Section id="ntf" title="Notifications">
        <div className="overflow-x-auto"><table className="w-full min-w-[36rem]"><tbody><EventRuleRow rule={rule} onChange={setRule} /><EventRuleRow rule={{ ...RULE, event: "case.reminder", critical: false, security: false, channels: { inapp: true, email: true, whatsapp: true, sms: true }, chain: ["whatsapp", "sms", "email"] }} onChange={() => {}} /></tbody></table></div>
        <div className="grid gap-4 pt-4 lg:grid-cols-3">
          <WhatsAppBubble body={{ header: "New sign-in", body: "We saw a new sign-in on Chrome · Windows at 14:32. If this wasn't you, reply HELP.", footer: "HEBUZA security", button: "It wasn't me" }} />
          <SmsBubble text="HEBUZA: kode yawe ni 482913. Ntuyihe undi muntu." />
          <SmsBubble text="HEBUZA : votre code est 482913. Ne le partagez jamais — même avec notre équipe. Ce code expire dans 10 minutes." />
          <EmailPreview body={{ subject: "New sign-in to your HEBUZA account", body: "We saw a new sign-in on Chrome · Windows at 14:32.\n\nIf this was you, there's nothing to do." }} />
        </div>
      </Section>

      <Section id="ops" title="Operations & setup">
        <div className="grid gap-4 lg:grid-cols-2">
          <ul>
            <PostureCheck check={{ id: "hsts", label: "HSTS", status: "pass", detail: "max-age=63072000; includeSubDomains; preload", source: "next.config.ts" }} />
            <PostureCheck check={{ id: "csp", label: "Content-Security-Policy", status: "warn", detail: "Report-only", source: "next.config.ts" }} />
            <PostureCheck check={{ id: "coop", label: "COOP / CORP", status: "fail", detail: "Not sent yet", source: "next.config.ts" }} />
          </ul>
          <SetupChecklist items={[
            { key: "two_sysadmins", done: true, href: "/system/users" }, { key: "bootstrap_disabled", done: false, href: "/system/users?tab=service" },
            { key: "legacy_split", done: false, href: "/system/users?tab=service" }, { key: "mfa_enforced", done: true, href: "/system/settings/security" },
            { key: "email_tested", done: true, href: "/system/integrations/resend" }, { key: "backups_drill", done: false, href: "/system/ops?tab=backups" },
          ]} />
        </div>
        <ul className="pt-4">
          <SessionRow session={{ id: "s1", userId: "u", device: "Chrome · Windows", ip: "41.186.23.10", city: "Kigali", createdAt: iso(-5), lastSeenAt: iso(-0.1), current: true }} />
          <SessionRow session={{ id: "s2", userId: "u", device: "Safari · iPhone", ip: "41.186.23.44", city: null, createdAt: iso(-30), lastSeenAt: iso(-3), current: false }} onRevoke={() => {}} />
        </ul>
      </Section>

      <Section id="states" title="States (loading / empty / error)">
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonRows n={4} />
          <EmptyPanel title="No approvals waiting" body="Requests that need a second person show up here." />
          <PanelError what="monitoring" onRetry={() => {}} />
        </div>
        <Row label="Illustrations">{(["lock", "shield", "broken", "sprout", "inbox"] as ArtName[]).map((n) => <SysArt key={n} name={n} />)}</Row>
      </Section>
    </div>
  );
}

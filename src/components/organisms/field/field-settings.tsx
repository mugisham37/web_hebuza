"use client";
// U13 field settings (plan §7.14, §2.6 SY5): lite, battery, text addresses, storage, app/SW status, wipe and guarded sign-out.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/button";
import { Sheet } from "@/components/atoms/dialog";
import { Switch, Checkbox } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { formatDateTime } from "@/shared/format";
import { localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyD } from "@/lib/field/copy-d";
import { usePrefs, setPrefs } from "@/lib/field/prefs";
import { useEngine, wipeAll, syncNow, start } from "@/lib/field/sync";
import { useOnline } from "@/lib/field/net";
import { pendingCount } from "@/lib/field/queue";
import { FieldHeader, NeedsConnection, useFieldBase } from "@/components/atoms/field-agent";
import { StorageCard } from "@/components/molecules/field/field";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"; // shortcut: env-provided label, wire the build SHA when CI sets one

export function FieldSettingsView() {
  const d = useCopyD();
  const { locale } = useFieldCopy();
  const prefs = usePrefs();
  const eng = useEngine();
  const base = useFieldBase();
  const [sw, setSw] = useState<boolean | null>(null);
  const [sheet, setSheet] = useState<"wipe" | "signout" | null>(null);
  useEffect(() => { void navigator.serviceWorker?.getRegistration("/").then((r) => setSw(!!r?.active && !!navigator.serviceWorker.controller && r.active.scriptURL.endsWith("/sw.js"))); }, []);

  return (
    <div className="grid gap-4">
      <FieldHeader back={base()} title={d.settingsTitle} />
      <section className="grid divide-y divide-border bg-surface">
        <Row title={d.lite} body={<>{d.liteBody}{prefs.liteAuto && <span className="mt-1 block text-info">{d.liteAuto}</span>}</>}>
          <Switch label={<span className="sr-only">{d.lite}</span>} checked={prefs.liteOn} onChange={(e) => setPrefs({ lite: e.target.checked })} />
        </Row>
        <Row title={d.battery} body={d.batteryBody}>
          <Switch label={<span className="sr-only">{d.battery}</span>} checked={prefs.battery} onChange={(e) => setPrefs({ battery: e.target.checked })} />
        </Row>
        <Row title={d.textAddr} body={d.textAddrBody}>
          <Switch label={<span className="sr-only">{d.textAddr}</span>} checked disabled readOnly />
        </Row>
      </section>

      <section className="grid gap-1 border border-border bg-surface p-4 sm:p-5 text-small">
        <p><span className="text-fg-subtle">{d.lastPrepared}: </span>{eng.meta?.preparedAt ? formatDateTime(eng.meta.preparedAt, locale) : d.never}</p>
        <p><span className="text-fg-subtle">{d.app}: </span>{fill(d.version, { v: APP_VERSION })} · {sw ? d.sw.active : d.sw.none}</p>
      </section>
      <StorageCard />

      <section className="grid gap-2 border border-danger/25 bg-surface p-4 sm:p-5">
        <Button variant="outline" className="justify-center text-danger" onClick={() => setSheet("wipe")}><Icon name="x" size={16} aria-hidden />{d.wipe}</Button>
        <p className="text-small text-fg-subtle">{d.wipeBody}</p>
        <Button variant="secondary" className="justify-center" onClick={() => setSheet("signout")}>{d.signOut}</Button>
      </section>

      <WipeSheet mode={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function Row({ title, body, children }: { title: string; body: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 p-4 sm:p-5">
      <div className="min-w-0 flex-1"><p className="text-label">{title}</p><p className="text-small text-fg-muted">{body}</p></div>
      {children}
    </div>
  );
}

/** SY5: delete / sign out. Pending items need an explicit checkbox before they're destroyed (D-12). */
export function WipeSheet({ mode, onClose }: { mode: "wipe" | "signout" | null; onClose: () => void }) {
  const d = useCopyD();
  const { c, locale } = useFieldCopy();
  const eng = useEngine();
  const online = useOnline();
  const toast = useToast();
  const router = useRouter();
  const { user, signOut } = useSession();
  const n = pendingCount(eng.ops);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = () => { setOk(false); onClose(); };

  const go = async () => {
    setBusy(true);
    await wipeAll(mode === "signout" ? "signout" : "user");
    if (mode === "signout") {
      await signOut();
      router.push(localHref(locale, "/team/sign-in"));
    } else {
      toast({ title: d.wiped, tone: "success" });
      if (user) void start(user.id); // fresh empty store so the agent can keep working online
      setBusy(false); close();
    }
  };
  const label = mode === "signout" ? (n ? fill(d.signOutDelete, { n }) : d.signOut) : n ? fill(d.deleteN, { n }) : d.wipe;
  return (
    <Sheet open={!!mode} onClose={close} side="bottom" title={mode === "signout" ? d.signOut : d.wipe}
      footer={<>
        <Button variant="ghost" onClick={close}>{c.cancel}</Button>
        <Button variant="danger" disabled={(n > 0 && !ok) || busy} loading={busy} onClick={go}>{label}</Button>
      </>}>
      {n > 0 ? (
        <div className="grid gap-4">
          <p role="alert" className="flex items-start gap-3 bg-warning-bg px-4 py-3 text-small font-medium"><Icon name="zap" size={18} aria-hidden className="shrink-0" />{fill(d.pendingWarn, { n })}</p>
          <NeedsConnection online={online}>
            <Button className="w-full justify-center" disabled={!online || !!eng.syncing} loading={!!eng.syncing} onClick={() => void syncNow()}>{d.syncNow}</Button>
          </NeedsConnection>
          <Checkbox label={fill(d.understand, { n })} checked={ok} onChange={(e) => setOk(e.target.checked)} />
        </div>
      ) : (
        <p className="text-body text-fg-muted">{mode === "signout" ? d.signOutClean : d.wipeBody}</p>
      )}
    </Sheet>
  );
}

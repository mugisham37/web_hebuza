"use client";
// U6 prepare offline (plan §7.11, board 03): promises, storage + persist, download with per-section status, ready state,
// SW precache of field routes, install card (Chromium prompt / iOS help), permission states (never auto-prompts).
// shortcut: one /prepare request; sections are validated from its payload, retry re-downloads all; split endpoints if bundles grow past ~5 MB.
import { useEffect, useState } from "react";
import { cx } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { errorCopy } from "@/lib/api/error-copy";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyD } from "@/lib/field/copy-d";
import { fx, kigaliDate } from "@/lib/field/api";
import { savePrepare, useEngine } from "@/lib/field/sync";
import { useOnline } from "@/lib/field/net";
import { requestPersist, expiryState } from "@/lib/field/store";
import type { PrepareBundle } from "@/shared/field/types";
import { FieldHeader, NeedsConnection, duration, kb, useFieldBase } from "@/components/atoms/field-agent";
import { StorageCard } from "@/components/molecules/field/field";

type Sec = "visits" | "cases" | "checklists" | "settings";
type SecState = "idle" | "loading" | "done" | "failed";
const SECS: Sec[] = ["visits", "cases", "checklists", "settings"];
const okSec = (b: PrepareBundle, s: Sec) =>
  s === "visits" ? Array.isArray(b.visits) : s === "cases" ? Array.isArray(b.caseSummaries) : s === "checklists" ? b.visits?.every((v) => Array.isArray(v.checklist)) : !!b.settings;

export function PreparePanel() {
  const d = useCopyD();
  const { c, locale } = useFieldCopy();
  const toast = useToast();
  const online = useOnline();
  const eng = useEngine();
  const base = useFieldBase();
  const [sec, setSec] = useState<Record<Sec, SecState>>({ visits: "idle", cases: "idle", checklists: "idle", settings: "idle" });
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const busy = Object.values(sec).includes("loading");
  const ex = expiryState(eng.meta, eng.now);
  const ready = ex !== "none" && ex !== "expired" && !!eng.bundle;

  const download = async () => {
    setErr(null);
    setSec({ visits: "loading", cases: "loading", checklists: "loading", settings: "loading" });
    void requestPersist();
    try {
      const b = await fx<PrepareBundle>("GET", `/api/x_field/prepare?date=${kigaliDate()}`);
      const states = Object.fromEntries(SECS.map((s) => [s, okSec(b, s) ? "done" : "failed"])) as Record<Sec, SecState>;
      setSize(b.bytesEstimate || JSON.stringify(b).length);
      if (SECS.some((s) => states[s] === "failed")) { setSec(states); return; } // partial: keep the old cache, offer retry
      await savePrepare(b);
      setSec(states);
      precache(locale, base);
      toast({ title: d.readyToast, tone: "success" });
    } catch (e) {
      setErr(e instanceof Error && e.name === "QuotaExceededError" ? c.quotaFull : errorCopy(e, locale));
      setSec({ visits: "failed", cases: "failed", checklists: "failed", settings: "failed" });
    }
  };

  return (
    <div className="grid gap-4">
      <FieldHeader back={base()} title={d.prepTitle} sub={d.prepSub} />

      <section className="m-rise grid gap-4 theme-dark bg-bg-tint p-5 text-fg sm:p-6">
        <span aria-hidden className="flex size-12 items-center justify-center bg-primary text-on-gold"><Icon name="upload" size={24} /></span>
        <ul className="grid gap-2">
          {d.promises.map((p) => <li key={p} className="flex items-center gap-2 text-small"><Icon name="check" size={16} aria-hidden className="text-gold-400" />{p}</li>)}
        </ul>
        {(size ?? eng.bundle?.bytesEstimate) ? <p className="text-small text-fg-muted tabular">{fill(d.estimate, { size: kb(size ?? eng.bundle!.bytesEstimate) })}</p> : null}
        <NeedsConnection online={online}>
          <Button variant="primary" size="lg" className="w-full justify-center" disabled={!online || busy} loading={busy} onClick={download}>
            {busy ? d.downloading : ready ? d.redownload : d.download}
          </Button>
        </NeedsConnection>
        {!online && !ready && <p className="text-small text-fg-muted">{d.offlineNoDownload}</p>}
      </section>

      {sec.visits !== "idle" && (
        <ol className="grid gap-2 border border-border bg-surface p-4" aria-live="polite">
          {SECS.map((s) => (
            <li key={s} className="flex min-h-10 items-center gap-3 text-small">
              <span aria-hidden className={cx("flex size-7 items-center justify-center", sec[s] === "done" ? "bg-success-bg text-success" : sec[s] === "failed" ? "bg-danger-bg text-danger" : "bg-ink-100 text-fg-muted")}>
                {sec[s] === "loading" ? <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" /> : <Icon name={sec[s] === "done" ? "check" : "x"} size={14} />}
              </span>
              <span className="flex-1">{d.sections[s]}</span>
              {sec[s] === "failed" && <><span className="text-danger">{d.sectionFailed}</span><Button size="sm" variant="secondary" disabled={!online} onClick={download}>{d.sectionRetry}</Button></>}
            </li>
          ))}
        </ol>
      )}
      {err && <p role="alert" className="bg-danger-bg px-4 py-3 text-small text-danger">{err}</p>}

      {ready && (
        <p role="status" className="m-pop flex items-start gap-3 bg-success-bg p-4 text-success">
          <Icon name="check" size={22} aria-hidden className="shrink-0" />
          <span><b className="block text-label">{d.ready}</b><span className="text-small">{fill(d.readyBody, { n: eng.bundle!.visits.length, time: duration(eng.meta!.expiresAt! - eng.now) })}</span></span>
        </p>
      )}

      <StorageCard />
      <InstallCard />
      <Permissions />
    </div>
  );
}

/** Ask the app SW to cache the field shell for this locale (no-op under MSW / without a controller). */
function precache(locale: string, base: (p?: string) => string) {
  try {
    const urls = ["", "/outbox", "/expenses", "/expenses/new", "/prepare", "/settings", "/visits/fv-115"].map((p) => base(p));
    const chunks = performance.getEntriesByType("resource").map((e) => new URL(e.name).pathname).filter((p) => p.startsWith("/_next/static/"));
    navigator.serviceWorker?.controller?.postMessage({ type: "precache", urls: [...urls, ...chunks] });
    void locale;
  } catch {}
}

function InstallCard() {
  const d = useCopyD();
  const [state, setState] = useState<{ bip: boolean; ios: boolean; standalone: boolean } | null>(null);
  useEffect(() => {
    const check = () => setState({
      bip: !!(window as Window & { __bip?: Event }).__bip,
      ios: /iPhone|iPad|iPod/.test(navigator.userAgent),
      standalone: matchMedia("(display-mode: standalone)").matches,
    });
    check();
    window.addEventListener("beforeinstallprompt", check);
    return () => window.removeEventListener("beforeinstallprompt", check);
  }, []);
  if (!state || (!state.bip && !state.ios && !state.standalone)) return null;
  const prompt = async () => {
    const e = (window as Window & { __bip?: Event & { prompt: () => Promise<void> } }).__bip;
    await e?.prompt();
    (window as Window & { __bip?: Event }).__bip = undefined;
    setState((s) => s && { ...s, bip: false });
  };
  return (
    <section className="grid gap-2 border border-border bg-surface p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-label-lg"><Icon name="laptop" size={18} aria-hidden />{state.standalone ? d.installed : d.install}</h2>
      {!state.standalone && <p className="text-small text-fg-muted">{d.installBody}</p>}
      {state.bip && <Button className="w-fit" onClick={prompt}>{d.installCta}</Button>}
      {state.ios && !state.standalone && <p className="text-small">{d.ios}</p>}
    </section>
  );
}

function Permissions() {
  const d = useCopyD();
  const [perm, setPerm] = useState<Record<string, string>>({});
  useEffect(() => {
    // Reads current state only; never triggers a browser prompt.
    for (const name of ["geolocation", "camera"]) {
      navigator.permissions?.query({ name: name as PermissionName })
        .then((s) => { setPerm((p) => ({ ...p, [name]: s.state })); s.onchange = () => setPerm((p) => ({ ...p, [name]: s.state })); })
        .catch(() => setPerm((p) => ({ ...p, [name]: "unknown" })));
    }
  }, []);
  return (
    <section className="grid gap-2 border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-label-lg">{d.perms}</h2>
      <ul className="grid gap-2">
        {["geolocation", "camera"].map((n) => {
          const s = perm[n] ?? "unknown";
          return (
            <li key={n} className="flex items-center gap-3 text-small">
              <Icon name={n === "camera" ? "camera" : "mapPin"} size={16} aria-hidden />
              <span className="flex-1">{d.permNames[n]}</span>
              <span className={s === "granted" ? "text-success" : s === "denied" ? "text-danger" : "text-fg-subtle"}>{d.permState[s] ?? d.permState.unknown}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

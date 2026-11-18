"use client";
// F-IAM-11 SessionExpiryModal (plan 06): warns sessionWarnMs before the idle timeout or the server's absolute
// expiry, whichever is first; "Stay signed in" refreshes the session, timeout or "Sign out" ends it.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { useSession, type SessionUser } from "@/lib/auth/session";
import { qk } from "@/lib/query/client";
import { POLICY } from "@/shared/policy";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { useToast } from "@/components/atoms/toast";

const ACTIVITY = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

export function SessionExpiryModal() {
  const { t, locale } = useI18n();
  const { user, signOut } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const idleMs = user?.roles.every((r) => r === "client")
    ? POLICY.idleMsClient
    : POLICY.idleMsStaff;
  const lastActive = useRef(0);
  const [now, setNow] = useState(0);
  const [warning, setWarning] = useState(false);
  const [busy, setBusy] = useState(false);

  const deadline = () =>
    Math.min(
      lastActive.current + idleMs,
      user?.expiresAt ? Date.parse(user.expiresAt) : Infinity,
    );

  // Activity resets the idle clock, but not while the warning is up (the user must choose).
  useEffect(() => {
    if (!user || warning) return;
    if (!lastActive.current) lastActive.current = Date.now();
    const bump = () => { lastActive.current = Date.now(); };
    ACTIVITY.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => ACTIVITY.forEach((e) => window.removeEventListener(e, bump));
  }, [user, warning]);

  // Coarse tick while idle, 1s tick during the countdown. shortcut: per-tab clock, other tabs aren't told; add a BroadcastChannel when users report double prompts.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(
      () => {
        const n = Date.now();
        setNow(n);
        const left = deadline() - n;
        if (left <= 0) void end(true);
        else if (left <= POLICY.sessionWarnMs) setWarning(true);
      },
      warning ? 1000 : 15_000,
    );
    return () => window.clearInterval(id);
  });

  async function end(expired: boolean) {
    setWarning(false);
    await signOut();
    const next = encodeURIComponent(stripLocale(path));
    router.push(
      `${localHref(locale, "/login")}?next=${next}${expired ? "&reason=expired" : ""}`,
    );
  }

  async function stay() {
    setBusy(true);
    try {
      await qc.refetchQueries({ queryKey: qk.session });
      const fresh = qc.getQueryData<SessionUser | null>(qk.session);
      if (!fresh) throw new Error("expired");
      lastActive.current = Date.now();
      setWarning(false);
      toast({ title: t("sessionExpiry.kept"), tone: "success" });
    } catch {
      toast({ title: t("sessionExpiry.refreshFailed"), tone: "danger" });
      await end(true);
    } finally {
      setBusy(false);
    }
  }

  if (!user || !warning) return null;
  const left = Math.max(0, deadline() - now);
  const mm = Math.floor(left / 60_000),
    ss = Math.floor((left % 60_000) / 1000);
  const time = `${mm}:${String(ss).padStart(2, "0")}`;
  return (
    <Dialog
      open
      onClose={() => void stay()} // Esc / backdrop count as "still here"
      title={t("sessionExpiry.title")}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => void end(false)}
            disabled={busy}
          >
            {t("sessionExpiry.signOut")}
          </Button>
          <Button autoFocus onClick={() => void stay()} loading={busy}>
            {t("sessionExpiry.stay")}
          </Button>
        </div>
      }
    >
      <p className="text-body text-fg-muted">{t("sessionExpiry.body", { time })}</p>
      <p role="timer" aria-hidden className="mt-4 text-center text-h2 tabular">{time}</p>
      {/* Announce once per minute, not every second. */}
      <p aria-live="assertive" className="sr-only">
        {t("sessionExpiry.announce", {
          n: Math.max(1, Math.ceil(left / 60_000)),
        })}
      </p>
    </Dialog>
  );
}

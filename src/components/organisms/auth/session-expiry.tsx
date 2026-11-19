"use client";
// IAM-11: warn 2 minutes before the server-side session end (idle or absolute lifetime), then send to sign-in.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { qk } from "@/lib/query/client";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { authCopy } from "@/content/pages/client-auth";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";

const WARN_MS = 2 * 60_000;
const PING_MS = 60_000; // at most one activity ping a minute

export function SessionExpiry() {
  const { user, signOut } = useSession();
  const { locale } = useI18n();
  const c = authCopy(locale).expiry;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const qc = useQueryClient();
  const last = useRef(0);
  const [pinged, setPinged] = useState<string | null>(null);
  const end = pinged ?? user?.expiresAt ?? null;
  const ping = () => {
    last.current = Date.now();
    void unwrap<{ expiresAt: string }>(api.POST("/api/auth/activity")).then((r) => setPinged(r.expiresAt)).catch(() => {});
  };
  // Real input (not polling) keeps the session alive.
  useEffect(() => {
    if (!user) return;
    const on = () => { if (Date.now() - last.current > PING_MS) ping(); };
    const ev = ["pointerdown", "keydown", "scroll"] as const;
    ev.forEach((e) => window.addEventListener(e, on, { passive: true }));
    return () => ev.forEach((e) => window.removeEventListener(e, on));
  });
  useEffect(() => {
    if (!end || dismissed === end) return;
    const left = Date.parse(end) - Date.now();
    const warn = setTimeout(() => setOpen(true), Math.max(0, left - WARN_MS));
    const out = setTimeout(() => {
      setOpen(false);
      void signOut().then(() => router.push(localHref(locale, "/login")));
    }, Math.max(0, left));
    return () => { clearTimeout(warn); clearTimeout(out); };
  }, [end, dismissed, signOut, router, locale]);
  if (!user) return null;
  return (
    <Dialog
      open={open}
      onClose={() => { setOpen(false); setDismissed(end); }}
      title={c.title}
      description={c.body}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => void signOut().then(() => router.push(localHref(locale, "/login")))}>{c.signIn}</Button>
          <Button onClick={() => { setOpen(false); ping(); void qc.invalidateQueries({ queryKey: qk.session }); }}>{c.stay}</Button>
        </div>
      }
    />
  );
}

"use client";
// IAM-11: warn 2 minutes before the server-side session end (idle or absolute lifetime), then send to sign-in.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { authCopy } from "@/content/pages/client-auth";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";

const WARN_MS = 2 * 60_000;

export function SessionExpiry() {
  const { user, signOut } = useSession();
  const { locale } = useI18n();
  const c = authCopy(locale).expiry;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const end = user?.expiresAt ?? null;
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
          <Button onClick={() => { setOpen(false); setDismissed(end); }}>{c.stay}</Button>
        </div>
      }
    />
  );
}

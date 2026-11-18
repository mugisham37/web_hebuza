"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { clearLocalDrafts } from "@/components/molecules/auth/auth";
import { Wordmark } from "@/components/organisms/site/site-header";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { Spinner } from "@/components/atoms/feedback";

/** Minimal chrome + guest guard: /apply and /pay are public paths in proxy.ts, so guests are bounced to login here (?next= keeps their place). */
export function FlowShell({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const { status } = useSession();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (status === "anonymous") clearLocalDrafts();
  }, [status]);
  useEffect(() => {
    if (status === "anonymous") router.replace(`${localHref(locale, "/login")}?next=${encodeURIComponent(path + location.search)}`);
  }, [status, locale, path, router]);
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <div className="container-page flex h-16 items-center justify-between px-gutter">
          <Wordmark href={localHref(locale, "/")} />
          <LocaleSwitcher />
        </div>
      </header>
      <main id="main" className="container-page px-gutter py-8 md:py-12">
        {status === "authenticated" ? children : <div className="flex justify-center py-24"><Spinner /></div>}
      </main>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { useSession } from "@/lib/auth/session";
import { clearLocalDrafts } from "@/components/molecules/auth/auth";
import type { MessageKey } from "@/lib/i18n/translate";
import { cx } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { authCopy } from "@/content/pages/client-auth";

const TABS: { href: string; label: MessageKey; icon: IconName }[] = [
  { href: "/dashboard", label: "wsnav.overview", icon: "layers" },
  { href: "/requests", label: "wsnav.requests", icon: "file" },
  { href: "/messages", label: "wsnav.messages", icon: "message" },
  { href: "/documents", label: "wsnav.documents", icon: "fileCheck" },
  { href: "/settings", label: "wsnav.settings", icon: "user" },
];

/** Client-only additions around WorkspaceShell: verify-email gate (F-IAM-04) + phone bottom nav (<1024px). */
export function ClientChrome({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const { user, status } = useSession();
  useEffect(() => {
    if (status === "anonymous") clearLocalDrafts(); // signed out or expired: drop this device's drafts
  }, [status]);
  const path = stripLocale(usePathname());
  const c = authCopy(locale).shell;
  return (
    <>
      {user && !user.emailVerified && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-3 border-info bg-info-bg px-4 py-3 text-body text-info"
        >
          <Icon name="mail" aria-hidden />
          <span className="flex-1">{c.verifyGate}</span>
          <Link
            href={localHref(locale, "/verify")}
            className="text-button underline underline-offset-4"
          >
            {c.verifyCta}
          </Link>
        </div>
      )}
      <div className="pb-20 lg:pb-0">{children}</div>
      <nav
        aria-label={c.nav}
        data-bottom-bar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map((tab) => {
            const on = path === tab.href || path.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  href={localHref(locale, tab.href)}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] leading-tight",
                    on ? "font-medium text-navy-700" : "text-fg-subtle",
                  )}
                >
                  <span
                    className={cx(
                      "flex h-7 w-12 items-center justify-center transition-colors",
                      on && "bg-gold-200",
                    )}
                  >
                    <Icon name={tab.icon} size={20} aria-hidden />
                  </span>
                  <span className="max-w-full truncate px-1">
                    {t(tab.label)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

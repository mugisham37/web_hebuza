"use client";
// Lane E shared bits: audit sub-nav, URL-param state, online flag, error → toast copy.
import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemAudit } from "@/content/pages/system-audit";
import { sysError } from "@/content/pages/system-common";
import { ApiError } from "@/lib/api/client";
import { cx } from "@/shared/format";

/** Read/replace query params without scrolling (filters, tabs, drawer id live in the URL). */
export function useParamState() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const set = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    const qs = next.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  }, [sp, router, path]);
  return [sp, set] as const;
}


/** errorType → localized copy (never the server's raw message). */
export function useErrText() {
  const { locale } = useI18n();
  return (e: unknown) => sysError(locale, e instanceof ApiError ? e.errorType : null);
}

const NAV = [["log", "/system/audit"], ["sensitive", "/system/audit/sensitive"], ["integrity", "/system/audit/integrity"]] as const;
export function AuditNav() {
  const { locale } = useI18n();
  const c = systemAudit(locale);
  const path = usePathname();
  return (
    <nav aria-label={c.title} className="-mt-2 mb-5 flex gap-1 overflow-x-auto border-b border-border">
      {NAV.map(([k, href]) => {
        const on = path.endsWith(href);
        return (
          <Link key={k} href={localHref(locale, href)} aria-current={on ? "page" : undefined}
            className={cx("-mb-px flex h-11 items-center border-b-2 px-4 text-button whitespace-nowrap", on ? "border-primary text-navy-700" : "border-transparent text-fg-subtle hover:text-navy-700")}>
            {c.nav[k]}
          </Link>
        );
      })}
    </nav>
  );
}

export const TH = "px-3 py-2.5 text-left text-eyebrow font-medium text-fg-subtle whitespace-nowrap";

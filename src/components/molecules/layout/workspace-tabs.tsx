"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { api } from "@/lib/api/client";
import { Icon } from "@/components/atoms/icon";
import { ROLE_ICON } from "@/components/molecules/auth/role-picker";
import { AUTH_ROLES, authRolesCopy, roleHome, roleOf } from "@/content/pages/auth-roles";
import type { Workspace } from "@/shared/auth/roles";
import { cx } from "@/shared/format";

/**
 * Top workspace navigation for accounts holding several roles (e.g. a system admin with "All workspaces"): one tab per
 * workspace, in the fixed Client → System order. The sidebar below follows the open tab. Hidden for single-workspace accounts.
 */
export function WorkspaceTabs({ current }: { current: Workspace }) {
  const { t, locale } = useI18n();
  const { workspaces, setActiveWorkspace } = useSession();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { // narrow screens: keep the open tab in view (scrollLeft only, never the page)
    const el = ref.current, tab = el?.querySelector<HTMLElement>("[aria-current=page]");
    if (el && tab && el.scrollWidth > el.clientWidth) el.scrollLeft = tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2;
  }, [current]);
  if (workspaces.length < 2) return null;
  const names = authRolesCopy(locale).roles; // same short names as the sign-in role cards
  const tabs = AUTH_ROLES.filter((w) => workspaces.includes(w));
  return (
    <nav ref={ref} aria-label={t("workspace.switch")} className="sticky top-16 z-20 flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-gutter py-2 backdrop-blur [scrollbar-width:none] lg:px-8">
      {tabs.map((w) => {
        const on = w === current;
        return (
          <Link key={w} href={localHref(locale, roleHome(w))} data-role={w} aria-current={on ? "page" : undefined}
            onClick={() => {
              setActiveWorkspace(w);
              void api.POST("/api/auth/active-role", { body: { role: roleOf(w) } }).catch(() => {}); // remembers the choice; access is by role set, not this
            }}
            className={cx("flex h-9 shrink-0 items-center gap-2 border px-3 text-small font-medium transition-colors",
              on ? "border-role-accent bg-role-accent text-on-role-accent" : "border-transparent text-fg-muted hover:border-border hover:bg-surface hover:text-fg")}>
            <Icon name={ROLE_ICON[w]} size={16} aria-hidden />
            {names[w].name}
          </Link>
        );
      })}
    </nav>
  );
}

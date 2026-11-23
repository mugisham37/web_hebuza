"use client";
import { useEffect, useRef, type KeyboardEvent } from "react";
import type { IconName } from "@/components/atoms/icon";
import { RoleCard } from "@/components/atoms/role-card";
import { AUTH_ROLES, type AuthRole } from "@/content/pages/auth-roles";
import { useAuthRole } from "@/components/molecules/auth/auth";

export const ROLE_ICON: Record<AuthRole, IconName> = {
  client: "user", agent: "briefcase", work: "laptop", ops: "layers", finance: "wallet",
  marketing: "megaphone", procurement: "file", partners: "users", exec: "chart", system: "shield",
};

/** Radiogroup of the 10 sign-in roles: 5×2 cards on desktop, a scrolling chip row on phones. Arrow keys move + select. */
export function RolePicker() {
  const { role, setRole, copy } = useAuthRole();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { // phones: keep the picked chip in view (scrollLeft only, never the page)
    const el = ref.current, chip = el?.querySelector<HTMLElement>("[aria-checked=true]");
    if (el && chip && el.scrollWidth > el.clientWidth) el.scrollLeft = chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2;
  }, [role]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key] ?? (e.key === "Home" ? -99 : e.key === "End" ? 99 : 0);
    if (!d) return;
    e.preventDefault();
    const i = AUTH_ROLES.indexOf(role);
    const n = Math.abs(d) === 99 ? (d < 0 ? 0 : AUTH_ROLES.length - 1) : (i + d + AUTH_ROLES.length) % AUTH_ROLES.length;
    setRole(AUTH_ROLES[n]);
    ref.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[n]?.focus();
  };
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={copy.pickerLabel}
      className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0"
    >
      {AUTH_ROLES.map((r) => (
        <RoleCard key={r} icon={ROLE_ICON[r]} label={copy.roles[r].name} selected={r === role} onSelect={() => setRole(r)} onKeyDown={onKey} />
      ))}
    </div>
  );
}

"use client";
import { Icon } from "@/components/atoms/icon";
import { useAuthRole } from "@/components/molecules/auth/auth";
import { ROLE_ICON } from "@/components/molecules/auth/role-picker";

/** "Signing in as X" pill + role headline and one line, on the role gradient. */
export function RoleHero({ compact }: { compact?: boolean }) {
  const { role, copy } = useAuthRole();
  const r = copy.roles[role];
  return (
    <div className="grid gap-4" aria-live="polite">
      <p className="inline-flex items-center gap-2 justify-self-start border border-white/30 bg-white/10 px-3 py-1 text-small font-medium">
        <Icon name={ROLE_ICON[role]} size={16} />
        {copy.signingInAs.replace("{role}", r.name)}
      </p>
      {!compact && (
        <>
          <p className="text-[clamp(2rem,3.2vw,3rem)] leading-[1.05] font-medium tracking-[-0.03em] text-balance">{r.headline}</p>
          <p className="max-w-md text-lead text-white/85">{r.line}</p>
        </>
      )}
    </div>
  );
}

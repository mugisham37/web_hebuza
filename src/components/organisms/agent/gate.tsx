"use client";
import { useWs } from "@/lib/agent/ws";
// U2 gating, client-side (mock mode can't read server state in proxy.ts). Mount once inside the agent layout.
// Agents whose clearance is new/in_progress are sent to onboarding from every /agent page except onboarding + profile.
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { useSummary } from "@/lib/agent/api";

export const gated = (path: string, clearance: string | undefined) =>
  (clearance === "new" || clearance === "in_progress") &&
  /\/agent(\/|$)/.test(path) &&
  !/\/agent\/(onboarding|profile)(\/|$)/.test(path);

export function OnboardingGate() {
  const path = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const clearance = useSummary().data?.clearance;
  const go = gated(path, clearance);
  useEffect(() => {
    if (go) router.replace(localHref(locale, wsHref("/agent/onboarding/profile")));
  }, [go, router, locale, wsHref]);
  return null;
}

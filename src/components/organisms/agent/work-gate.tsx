"use client";
// WorkGate (plan §7.2): client-side, summary-driven like Stage 4 OnboardingGate. Uncleared workers are sent to
// onboarding from offers/jobs/inbox/team; suspended/terminated get a takeover (earnings stay readable, §2.2).
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { useExternal } from "@/lib/work/api";
import { StatusTakeover } from "@/components/organisms/agent/work-states";

const LOCKED = /^\/work\/(offers|jobs|inbox|team)(\/|$)/;
const READABLE_WHEN_OFF = /^\/work\/(earnings|contract)(\/|$)/;

export function WorkGate({ children }: { children: ReactNode }) {
  const path = stripLocale(usePathname());
  const router = useRouter();
  const { locale } = useI18n();
  const { ext } = useExternal();
  const st = ext?.status;
  const uncleared = st === "onboarding" || st === "changes_requested" || st === "pending_verification";
  const go = uncleared && LOCKED.test(path);
  useEffect(() => {
    if (go) router.replace(localHref(locale, `/work/onboarding/${st === "pending_verification" ? "review" : (ext?.todo[0] ?? "identity")}`));
  }, [go, router, locale, st, ext?.todo]);
  if (go) return null;
  if ((st === "suspended" || st === "terminated") && !READABLE_WHEN_OFF.test(path)) return <StatusTakeover status={st} />;
  return <>{children}</>;
}

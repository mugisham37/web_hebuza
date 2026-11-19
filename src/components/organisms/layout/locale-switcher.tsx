"use client";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, stripLocale, type Locale } from "@/shared/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";

/** rw / en / fr switch; keeps the current path. proxy.ts remembers the choice in the NEXT_LOCALE cookie. */
export function LocaleSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  // F-SET-10: locales the sysadmin disabled are hidden (their URLs still resolve). Shows all three until loaded.
  const enabled = useQuery({
    queryKey: ["platform", "public-settings"],
    queryFn: () => unwrap<{ enabledLocales?: Locale[] }>(api.GET("/api/platform/public-settings")),
    staleTime: 5 * 60_000,
  }).data?.enabledLocales;
  const shown = locales.filter((l) => !enabled || enabled.includes(l) || l === locale);
  function change(next: Locale) {
    router.replace(`/${next}${stripLocale(pathname) === "/" ? "" : stripLocale(pathname)}${window.location.search}`);
  }
  return (
    <div role="group" aria-label={t("common.language")} className={cx("inline-flex p-0.5", tone === "dark" ? "bg-white/10" : "bg-ink-100")}>
      {shown.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === locale} title={localeNames[l]} onClick={() => change(l)}
          className={cx("h-8 px-2.5 text-eyebrow uppercase", l === locale ? (tone === "dark" ? "bg-white text-navy-900" : "bg-secondary text-on-navy hover:bg-secondary-hover") : "opacity-70 hover:opacity-100")}>
          {l}
        </button>
      ))}
    </div>
  );
}

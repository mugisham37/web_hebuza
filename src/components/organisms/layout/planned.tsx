"use client";
import { usePathname } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { ButtonLink } from "@/components/atoms/button";
import { Container, Eyebrow } from "@/components/atoms/typography";

/** Placeholder for public/auth routes scheduled in a later stage. */
export function PublicPlanned({ stage }: { stage: number }) {
  const { t, locale } = useI18n();
  const path = stripLocale(usePathname());
  return (
    <Container className="grid min-h-[70dvh] content-center justify-items-start gap-5 pt-[var(--spacing-hero-top)] pb-16">
      <Eyebrow>{path}</Eyebrow>
      <h1 className="text-h2 text-fg-heading">{t("placeholder.stage")}</h1>
      <p className="text-lead text-fg-muted">{t("placeholder.plannedIn", { stage: `Stage ${stage}` })}</p>
      <ButtonLink href={localHref(locale, "/")} variant="secondary" dots>{t("common.back")}</ButtonLink>
    </Container>
  );
}

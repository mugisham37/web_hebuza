"use client";
import { useI18n } from "@/lib/i18n/provider";
import { authCopy } from "@/content/pages/client-auth";
import { GoogleButton, useGoogleSignIn } from "@/components/atoms/google-button";
import { Divider } from "@/components/molecules/auth/auth";

export function OAuthDivider() {
  const { locale } = useI18n();
  return <Divider label={authCopy(locale).google.or} />;
}

/** Google button + "or" divider above an auth form; renders nothing while googleSignIn is off. */
export function GoogleAuthBlock({ intent, next }: { intent: "login" | "signup"; next: string }) {
  if (!useGoogleSignIn()) return null;
  return (
    <>
      <GoogleButton intent={intent} next={next} />
      <OAuthDivider />
    </>
  );
}

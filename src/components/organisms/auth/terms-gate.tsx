"use client";
// F-CMS-14: when the published terms/privacy version changes, signed-in users must re-accept before carrying on.
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";

type Status = { current: string; accepted: string | null; needsAccept: boolean };
const COPY = {
  en: { t: "Our terms have changed", b: "Please review the updated Terms and Privacy Policy. You need to accept them to keep using HEBUZA.", terms: "Terms", privacy: "Privacy Policy", ok: "I accept", fail: "Could not save. Please try again." },
  fr: { t: "Nos conditions ont changé", b: "Veuillez lire les Conditions et la Politique de confidentialité mises à jour. Vous devez les accepter pour continuer à utiliser HEBUZA.", terms: "Conditions", privacy: "Confidentialité", ok: "J'accepte", fail: "Échec de l'enregistrement. Réessayez." },
  rw: { t: "Amabwiriza yacu yahindutse", b: "Soma amabwiriza n'politiki y'ibanga byavuguruwe. Ugomba kubyemera kugira ngo ukomeze gukoresha HEBUZA.", terms: "Amabwiriza", privacy: "Politiki y'ibanga", ok: "Ndabyemeye", fail: "Ntibyabitswe. Ongera ugerageze." },
} as const;

export function TermsGate() {
  const { user } = useSession();
  const { locale } = useI18n();
  const c = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["me", "terms"], enabled: !!user, staleTime: 10 * 60_000, queryFn: () => unwrap<Status>(api.GET("/api/me/terms")) });
  const accept = useMutation({
    mutationFn: (version: string) => unwrap<Status>(api.POST("/api/me/terms/accept", { body: { version } })),
    onSuccess: (d) => qc.setQueryData(["me", "terms"], d),
    onError: () => void qc.invalidateQueries({ queryKey: ["me", "terms"] }), // 409: version moved, show the new one
  });
  if (!user || !q.data?.needsAccept) return null;
  return (
    <Dialog open onClose={() => {}} title={c.t} description={c.b}
      footer={<Button type="button" disabled={accept.isPending} onClick={() => accept.mutate(q.data!.current)}>{c.ok}</Button>}>
      <p className="flex gap-4 text-body">
        <Link href={localHref(locale, "/legal/terms")} target="_blank" className="text-link underline">{c.terms}</Link>
        <Link href={localHref(locale, "/legal/privacy")} target="_blank" className="text-link underline">{c.privacy}</Link>
      </p>
      {accept.isError && <p role="alert" className="mt-3 text-small text-danger">{c.fail}</p>}
    </Dialog>
  );
}

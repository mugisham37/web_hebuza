"use client";
// Testimonial consent prompt: HEBUZA asked to publish a client's review; the client answers yes/no here.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/atoms/button";

type Req = { id: string; quote: string; stars: number; service: string };
const COPY = {
  en: { t: "May we share your review?", b: "We'd like to show these words on our website. We only publish them if you agree, and you can change your mind later.", yes: "Yes, publish", no: "No, keep private" },
  fr: { t: "Pouvons-nous partager votre avis ?", b: "Nous aimerions afficher ces mots sur notre site. Nous ne les publions qu'avec votre accord, révocable à tout moment.", yes: "Oui, publier", no: "Non, garder privé" },
  rw: { t: "Twasangiza igitekerezo cyawe?", b: "Twifuza kugaragaza aya magambo ku rubuga rwacu. Tubitangaza gusa ubyemeye, kandi ushobora kwisubiraho.", yes: "Yego, bitangaze", no: "Oya, bigumane ibanga" },
} as const;

export function TestimonialPrompt() {
  const { locale } = useI18n();
  const c = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["c4", "testimonial-requests"], queryFn: () => unwrap<{ items: Req[] }>(api.GET("/api/me/testimonial-requests")) });
  const answer = useMutation({
    mutationFn: (v: { id: string; consent: boolean }) => unwrap(api.POST("/api/me/testimonial-requests/{id}", { params: { path: { id: v.id } }, body: { consent: v.consent } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["c4", "testimonial-requests"] }),
  });
  const r = q.data?.items[0];
  if (!r) return null;
  return (
    <section aria-labelledby="tp-h" className="grid gap-3 border-l-[3px] border-gold-400 bg-gold-100 p-5">
      <h2 id="tp-h" className="text-card-title">{c.t}</h2>
      <blockquote className="text-body italic">“{r.quote}”</blockquote>
      <p className="text-small text-fg-muted">{c.b}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={answer.isPending} onClick={() => answer.mutate({ id: r.id, consent: true })}>{c.yes}</Button>
        <Button type="button" size="sm" variant="secondary" disabled={answer.isPending} onClick={() => answer.mutate({ id: r.id, consent: false })}>{c.no}</Button>
      </div>
    </section>
  );
}

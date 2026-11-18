"use client";
// U8 payment card on the Work step: MoMo prompt (online only) + cash branch only when enabled for the service (F-WRK-21).
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { useOnline } from "@/lib/field/net";
import { useEngine } from "@/lib/field/sync";
import { useFieldCopy } from "@/lib/field/copy";
import { copyE } from "@/lib/field/copy-e";
import type { FieldVisit } from "@/shared/field/types";
import { NeedsConnection } from "@/components/atoms/field-agent";
import { MomoPromptSheet } from "@/components/organisms/field/momo-prompt-sheet";
import { CashSheet, CashList } from "@/components/organisms/field/cash-sheet";

export function PaymentCard({ visit }: { visit: FieldVisit }) {
  const { locale } = useFieldCopy();
  const t = copyE(locale);
  const online = useOnline();
  const eng = useEngine();
  const [sheet, setSheet] = useState<"momo" | "cash" | null>(null);
  const cash = visit.cashEnabled && (eng.bundle?.settings.fieldCashEnabled ?? visit.cashEnabled);
  return (
    <section className="grid gap-3 border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center bg-navy-50 text-navy-700"><Icon name="wallet" size={20} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-label-lg">{t.pay.title}</h3>
          <p className="text-small text-fg-muted">{t.pay.never}</p>
        </div>
      </div>
      <NeedsConnection online={online}>
        <Button variant="primary" size="lg" disabled={!online} onClick={() => setSheet("momo")}>{t.pay.open}</Button>
      </NeedsConnection>
      {cash && <Button variant="outline" onClick={() => setSheet("cash")}>{t.cash.open}</Button>}
      {cash && <CashList visit={visit} />}
      {sheet === "momo" && <MomoPromptSheet visit={visit} open onClose={() => setSheet(null)} />}
      {sheet === "cash" && <CashSheet visit={visit} open onClose={() => setSheet(null)} />}
    </section>
  );
}

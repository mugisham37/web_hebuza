"use client";
// U5 visit flow (board 04): Check-in → Work → Receipt (collect/return visits only) → Check-out. Step lives in the URL
// (?step=); each panel keeps its data in the op queue / drafts, so Back never loses work.
import { setUrlParams } from "@/lib/url-state";
import { useCopyB } from "@/lib/field/copy-b";
import { cx } from "@/shared/format";
import type { FieldVisit } from "@/shared/field/types";
import { ReceiptStep } from "@/components/organisms/field/receipt-step";
import { CheckinPanel } from "@/components/organisms/field/checkin-panel";
import { WorkPanel } from "@/components/organisms/field/work-panel";
import { CheckoutPanel } from "@/components/organisms/field/checkout-panel";

export type Step = "checkin" | "work" | "receipt" | "checkout";

export function VisitFlow({ visit, step }: { visit: FieldVisit; step: Step }) {
  const t = useCopyB();
  const steps: Step[] = visit.collectsDocs ? ["checkin", "work", "receipt", "checkout"] : ["checkin", "work", "checkout"];
  const cur = Math.max(0, steps.indexOf(step));
  const go = (s: Step) => { setUrlParams({ step: s }); window.scrollTo({ top: 0 }); };
  const checkedIn = !!visit.checkin;

  return (
    <div className="grid gap-5">
      <ol aria-label="Progress" className="flex gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => go(s)} disabled={!checkedIn && s !== "checkin"} aria-current={i === cur ? "step" : undefined}
              className="grid w-full gap-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60">
              <span className={cx("h-1.5 transition-colors duration-(--dur-3)", i < cur ? "bg-navy-700" : i === cur ? "bg-gold-400" : "bg-ink-300")} />
              <span className={cx("truncate text-eyebrow normal-case", i === cur ? "font-semibold text-fg-heading" : "text-fg-subtle")}>
                <span className="tabular">{i + 1}</span> {t.steps[s]}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {visit.status === "cancelled" && <p role="alert" className="m-shake bg-danger-bg px-4 py-3 text-small font-medium text-danger">{t.cancelled}</p>}
      <div key={step} className="m-rise">
        {step === "checkin" && <CheckinPanel visit={visit} onNext={() => go("work")} />}
        {step === "work" && <WorkPanel visit={visit} onNext={() => go(visit.collectsDocs ? "receipt" : "checkout")} onCheckin={() => go("checkin")} />}
        {step === "receipt" && <ReceiptStep visit={visit} onDone={() => go("checkout")} />}
        {step === "checkout" && <CheckoutPanel visit={visit} />}
      </div>
    </div>
  );
}

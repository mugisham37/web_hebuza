"use client";
// U17 /finance/field body: Expenses L2 + Cash to confirm. Unmounted for now — the finance workspace route is owned by
// Stage 5; it mounts <FinanceFieldView /> at /finance/field (?tab=expenses|cash).
import { Tabs } from "@/components/atoms/tabs";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useFieldCopy } from "@/lib/field/copy";
import { copyF } from "@/lib/field/copy-f";
import { ExpenseApprovalQueue } from "@/components/organisms/field/expense-approval-queue";
import { CashConfirmQueue } from "@/components/organisms/field/cash-confirm-queue";

export function FinanceFieldView() {
  const { locale } = useFieldCopy();
  const t = copyF(locale).finance;
  const tab = useUrlParams().get("tab") === "cash" ? "cash" : "expenses";
  return (
    <div className="grid gap-5">
      <h1 className="m-rise text-h2">{t.title}</h1>
      <Tabs value={tab} onChange={(id) => setUrlParams({ tab: id === "expenses" ? null : id })}
        tabs={[{ id: "expenses", label: t.tabs.expenses, content: <ExpenseApprovalQueue level={2} /> }, { id: "cash", label: t.tabs.cash, content: <CashConfirmQueue /> }]} />
    </div>
  );
}

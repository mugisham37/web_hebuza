// Mirror of server/src/domain/finance/approvals.ts — UI display only; the server enforces.
// Approval chains + the one signer guard (plan 05 §2.2, spec/02 §4 SoD). Stage 12 reuses billChain + canSign.
import { POLICY } from "@/shared/policy";
import type { Role } from "@/shared/auth/roles";
import type { Rwf, Step, UserRef } from "@/shared/finance/types";

const step = (role: Step["role"], reason: string, orExec?: boolean): Step => ({ role, reason, ...(orExec && { orExec }) });

/** X-4: maker never signs; ≥ 500,000 a second finance user; > 1,000,000 an executive too. */
export function manualChain(amount: Rwf, p = POLICY): Step[] {
  const s = [step("finance", "checker")];
  if (amount >= p.manualConfirmSecondFinance) s.push(step("finance_second", "secondOver"));
  if (amount > p.manualConfirmExec) s.push(step("executive", "execOver"));
  return s;
}

/** RFD: SM recommends, finance approves; executive above the limit (X-3) or when the destination ≠ payer. */
export function refundChain(amount: Rwf, o: { destinationChanged?: boolean; execLimit?: Rwf } = {}): Step[] {
  const s = [step("service_manager", "smReview"), step("finance", "financeApprove")];
  if (amount > (o.execLimit ?? POLICY.refundExecLimit)) s.push(step("executive", "execOver"));
  else if (o.destinationChanged) s.push(step("executive", "destinationChanged"));
  return s;
}

/** Preparer signs at submit; authoriser is another finance user or an executive (D-19: exec step only if a threshold is set). */
export function batchChain(total: Rwf, execThreshold: Rwf | null = POLICY.payoutExecThreshold): Step[] {
  const s = [step("finance", "preparer"), step("finance_second", "authoriser", true)];
  if (execThreshold != null && total > execThreshold) s.push(step("executive", "execOver"));
  return s;
}

export const settingChain = (): Step[] => [step("finance", "proposer"), step("executive", "execApprove")];
export const ruleChain = (agentBps: number, defaultBps = POLICY.defaultAgentBps): Step[] =>
  agentBps === defaultBps ? [step("finance", "proposer")] : [step("finance", "proposer"), step("executive", "deviation")];
/** D-16: refund-linked adjustments inherit the refund's approval. */
export const adjustmentChain = (a: { refundNo?: string }): Step[] =>
  a.refundNo ? [] : [step("finance", "proposer"), step("finance_second", "secondSigner", true)];
/** Stage 12 bills: preparer procurement · finance approves · executive above 1,000,000 · payer ≠ both. */
export function billChain(amount: Rwf, p = POLICY): Step[] {
  const s = [step("procurement", "preparer"), step("finance", "financeApprove")];
  if (amount > p.manualConfirmExec) s.push(step("executive", "execOver"));
  return s;
}
/** D-18: SM quotes above the threshold need a finance approval before sending. */
export const quoteChain = (total: Rwf, p = POLICY): Step[] => (total > p.quoteApprovalThreshold ? [step("finance", "financeApprove")] : []);

const ROLE_OF: Record<Step["role"], Role> = {
  finance: "staff:finance", finance_second: "staff:finance", executive: "staff:executive",
  service_manager: "staff:service_manager", procurement: "staff:procurement",
};

export type SignCheck = { ok: true; index: number } | { ok: false; reason: "complete" | "same_approver" | "forbidden" };

/**
 * May `user` sign the next open step? Distinct people across every step and against the maker/requester/preparer,
 * even when one person holds several roles (spec/02 §4).
 */
export function canSign(chain: Step[], user: { id: string; roles: readonly Role[] }, makerIds: readonly string[] = []): SignCheck {
  const index = chain.findIndex((s) => !s.signedBy);
  if (index < 0) return { ok: false, reason: "complete" };
  if (makerIds.includes(user.id) || chain.some((s) => s.signedBy?.id === user.id)) return { ok: false, reason: "same_approver" };
  const s = chain[index];
  const allowed = user.roles.includes(ROLE_OF[s.role]) || (!!s.orExec && user.roles.includes("staff:executive"));
  return allowed ? { ok: true, index } : { ok: false, reason: "forbidden" };
}

/** Returns a new chain with the next step signed (call canSign first). */
export function sign(chain: Step[], user: UserRef, at: string): Step[] {
  const i = chain.findIndex((s) => !s.signedBy);
  return chain.map((s, j) => (j === i ? { ...s, signedBy: { id: user.id, name: user.name }, at } : s));
}
export const chainComplete = (chain: Step[]) => chain.every((s) => s.signedBy);

/** RFD §7: the executor is a finance user who signed nothing in the chain. */
export const canExecute = (chain: Step[], user: { id: string; roles: readonly Role[] }) =>
  user.roles.includes("staff:finance") && !chain.some((s) => s.signedBy?.id === user.id);

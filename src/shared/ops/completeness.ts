// Mirror of server/src/domain/ops/completeness.ts — UI display only; the server enforces.
// Completeness checklist evaluation (spec: service-request-lifecycle F-REQ-06, documents F-DOC-04).
export type ItemState =
  "provided" | "missing" | "check" | "rejected" | "pending";
export type ChecklistItem = {
  key: string;
  label: string;
  required: boolean;
  state: ItemState;
  docId?: string | null;
  note?: string;
};

export function evaluate(items: ChecklistItem[]) {
  const required = items.filter((i) => i.required);
  const done = required.filter((i) => i.state === "provided").length;
  const missing = required.filter(
    (i) => i.state === "missing" || i.state === "rejected",
  );
  const needsCheck = required.filter(
    (i) => i.state === "check" || i.state === "pending",
  );
  return {
    done,
    total: required.length,
    pct: required.length ? Math.round((done / required.length) * 100) : 100,
    complete: done === required.length,
    missing,
    needsCheck,
    /** Why "Mark complete" is disabled (i18n key), or null. */
    blocker: missing.length
      ? "hasMissing"
      : needsCheck.length
        ? "needsCheck"
        : null,
  };
}

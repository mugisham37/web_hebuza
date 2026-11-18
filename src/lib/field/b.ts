"use client";
// Lane B helpers: enqueue with the quota/storage toast (data stays in the form on failure), Kigali datetime-local maths.
import { useToast } from "@/components/atoms/toast";
import { useFieldCopy } from "./copy";
import { enqueue, type EnqueueInput } from "./sync";
import type { Op } from "@/shared/field/types";

export function useSave() {
  const toast = useToast();
  const { c } = useFieldCopy();
  return async (i: EnqueueInput): Promise<Op | null> => {
    try { return await enqueue(i); } catch (e) {
      toast({ title: (e as Error)?.name === "QuotaExceededError" ? c.quotaFull : c.storeError, tone: "danger" });
      return null;
    }
  };
}

/** datetime-local value (wall clock in Kigali, UTC+2, no DST) → ISO with +02:00. */
export const kigaliLocalToIso = (v: string) => (v ? `${v}:00+02:00` : "");

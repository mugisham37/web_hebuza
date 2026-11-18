"use client";
// Lane B data: onboarding & clearance (plan §7.4), credentials. Mock contract in src/mocks/handlers-work-b.ts.
import { api, unwrap } from "@/lib/api/client";
import { asMime } from "@/lib/api/upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { putUpload, workKeys, type ContractDoc, type Credential, type WithUpload, type WorkerStatus } from "./api";

export const STEPS = ["identity", "credentials", "agreements", "payout", "services", "review"] as const;
export type ObStep = (typeof STEPS)[number];
export type ItemState = "todo" | "in_progress" | "done" | "submitted" | "verified" | "rejected";
export type KycSlotKey = "id_front" | "id_back" | "selfie";
export type KycSlotState = { status: "empty" | "uploaded" | "rejected"; fileName?: string; note?: string };
export type ObVM = {
  status: WorkerStatus;
  signer: string;
  manager: string;
  items: { key: ObStep; state: ItemState; note?: string }[];
  identity: { idType: "national_id" | "passport"; idNumberMasked: string; slots: Record<KycSlotKey, KycSlotState> };
  payout: { method: "momo" | "airtel" | "bank" | null; bank: string; account: string; name: string; tin: string };
  services: { slugs: string[]; maxJobs: number; days: string[] };
  catalogue: { slug: string; name: string }[];
  docs: ContractDoc[];
  credentials: Credential[];
  savedAt: string | null;
  submittedAt: string | null;
  changes: { items: string[]; note: string } | null;
};
const key = workKeys.lane("b", "onboarding");
const credKey = workKeys.lane("b", "credentials");

export const useOnboarding = () => useQuery({ queryKey: key, queryFn: () => unwrap<ObVM>(api.GET("/api/work/x/onboarding")) });

/** Every onboarding mutation returns the fresh view; also refresh summary (strip, gate) and credentials. */
function useObMutation<V>(fn: (v: V) => Promise<ObVM>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (vm) => {
      qc.setQueryData(key, vm);
      qc.invalidateQueries({ queryKey: ["agent", "summary"] });
      qc.invalidateQueries({ queryKey: credKey });
    },
  });
}
export const useSaveStep = () =>
  useObMutation((b: { step: "identity" | "payout" | "services"; data: Record<string, unknown> }) => unwrap<ObVM>(api.PUT("/api/work/x/onboarding", { body: b })));
export const useKycUpload = () =>
  useObMutation(async ({ file, ...b }: { slot: KycSlotKey; fileName: string; size: number; type: string; file?: File }) =>
    putUpload(await unwrap<WithUpload<ObVM>>(api.POST("/api/work/x/kyc/upload", { body: { ...b, type: asMime(b.type) } })), file),
  );
export const useSignOnboarding = () =>
  useObMutation((b: { docId: string; typedName: string }) =>
    unwrap<ObVM>(api.POST("/api/work/x/onboarding/sign/{docId}", { params: { path: { docId: b.docId } }, body: { typedName: b.typedName, readPct: 100, agree: true } })),
  );
export const useSubmitOnboarding = () => useObMutation(() => unwrap<ObVM>(api.POST("/api/work/x/onboarding/submit")));

// ---------------------------------------------------------------- credentials
export const useCredentials = () =>
  useQuery({ queryKey: credKey, queryFn: async () => (await unwrap<{ items: Credential[] }>(api.GET("/api/work/x/credentials"))).items });
export type CredentialInput = {
  kind: Credential["kind"];
  title: string;
  issuer: string;
  number: string;
  issuedOn: string;
  expiresOn: string;
  fileName: string;
  size: number;
  services: string[];
};
export function useSaveCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: { id?: string; data: Partial<CredentialInput> & { size: number; type: string }; file?: File }) =>
      putUpload(
        await (b.id
          ? unwrap<WithUpload<{ items: Credential[] }>>(api.PUT("/api/work/x/credentials/{id}", { params: { path: { id: b.id } }, body: { ...b.data, type: asMime(b.data.type) } }))
          : unwrap<WithUpload<{ items: Credential[] }>>(api.POST("/api/work/x/credentials", { body: { ...b.data, type: asMime(b.data.type) } }))),
        b.file,
      ),
    onSuccess: (r) => {
      qc.setQueryData(credKey, r.items);
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["agent", "summary"] });
    },
  });
}
/** Days until a credential expires (ceil); null without an expiry date. */
export const daysLeft = (iso: string | null, now = Date.now()) => (iso ? Math.ceil((Date.parse(iso) - now) / 86_400_000) : null);

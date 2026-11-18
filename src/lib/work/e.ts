"use client";
// Lane E data: external statements, payouts, own invoices (/api/work/x/*, plan §9.2).
import { api, unwrap } from "@/lib/api/client";
import { asMime } from "@/lib/api/upload";
import { download } from "@/lib/api/download";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { putUpload, workKeys, type Statement, type WithUpload } from "./api";

export type WorkPayout = { id: string; month: string; date: string; method: string; ref: string; amount: number; status: "paid" | "pending" | "failed" };
export type WorkInvoice = { id: string; number: string; period: string; amount: number; fileName: string; status: "received" | "accepted" | "rejected"; note?: string; at: string };

export const useWorkStatements = () =>
  useQuery({
    queryKey: workKeys.lane("e", "statements"),
    queryFn: () => unwrap<Statement[]>(api.GET("/api/work/x/statements")),
    refetchInterval: (q) => (q.state.data?.some((s) => s.status === "generating") ? 3000 : false),
  });
export const useWorkStatement = (month: string) =>
  useQuery({
    queryKey: workKeys.lane("e", "statement", month),
    queryFn: () => unwrap<Statement>(api.GET("/api/work/x/statements/{month}", { params: { path: { month } } })),
    retry: false,
    refetchInterval: (q) => (q.state.data?.status === "generating" ? 3000 : false),
  });
export const useWorkPayouts = () =>
  useQuery({
    queryKey: workKeys.lane("e", "payouts"),
    queryFn: () => unwrap<{ items: WorkPayout[]; paidToFirm: string | null }>(api.GET("/api/work/x/payouts")),
  });
export const useWorkInvoices = () =>
  useQuery({
    queryKey: workKeys.lane("e", "invoices"),
    queryFn: () => unwrap<{ items: WorkInvoice[]; required: boolean }>(api.GET("/api/work/x/invoices")),
  });
export function useUploadInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...b }: { number: string; period: string; amount: number; fileName: string; size: number; type: string; file?: File }) =>
      putUpload(await unwrap<WithUpload<WorkInvoice>>(api.POST("/api/work/x/invoices", { body: { ...b, type: asMime(b.type) } })), file),
    onSuccess: () => qc.invalidateQueries({ queryKey: workKeys.lane("e", "invoices") }),
  });
}
/** Downloads a statement file (PDF or CSV) through the browser. */
export function useStatementFile() {
  return useMutation({
    mutationFn: async ({ month, format, name }: { month: string; format: "pdf" | "csv"; name: string }) => {
      await download(`/api/work/x/statements/${encodeURIComponent(month)}/file?format=${format}`, `${name}.${format}`);
    },
  });
}

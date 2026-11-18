"use client";
// Lane A: public application (/join) + status lookup (/join/status). Plan §2.1, §7.3, §9.2 public endpoints.
import { api, unwrap } from "@/lib/api/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Application } from "./api";
import { POLICY } from "@/shared/policy";

export const APPLY_STEPS = ["profile", "services", "rates", "availability", "registrations", "references", "review"] as const;
export type ApplyStep = (typeof APPLY_STEPS)[number];
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const SLOTS = ["am", "pm"] as const;

export type Draft = {
  kind: "individual" | "firm";
  name: string;
  email: string;
  phone: string;
  district: string;
  firmName: string;
  firmCode: string;
  services: string[];
  expertise: string;
  rates: Record<string, { mode: "pct" | "flat" | "hourly"; value: string }>;
  grid: string[]; // "mon-am"
  maxJobs: string;
  start: string;
  body: string;
  bodyOther: string;
  regNumber: string;
  regExpiry: string;
  files: { name: string; size: number; href?: string }[]; // href = stored upload (/api/files/:id/:name)
  refs: { name: string; org: string; contact: string; ok: boolean }[];
  consentPrivacy: boolean;
  consentRetention: boolean;
  consentAccuracy: boolean;
};
export const EMPTY: Draft = {
  kind: "individual",
  name: "",
  email: "",
  phone: "",
  district: "",
  firmName: "",
  firmCode: "",
  services: [],
  expertise: "",
  rates: {},
  grid: ["mon-am", "tue-am", "wed-am", "thu-am", "fri-am"],
  maxJobs: "3",
  start: "",
  body: "",
  bodyOther: "",
  regNumber: "",
  regExpiry: "",
  files: [],
  refs: [],
  consentPrivacy: false,
  consentRetention: false,
  consentAccuracy: false,
};

/** Error keys per field (copy in work-apply `err`). Empty object = step valid. */
export type Errs = Partial<Record<string, "required" | "email" | "phone" | "positive" | "pctRange" | "oneService" | "maxJobs" | "slot" | "file" | "refOk">>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validate(step: ApplyStep, d: Draft): Errs {
  const e: Errs = {};
  const req = (k: keyof Draft) => !String(d[k] ?? "").trim() && (e[k] = "required");
  if (step === "profile") {
    req("name");
    if (!EMAIL.test(d.email.trim())) e.email = d.email.trim() ? "email" : "required";
    if (!/^7\d{8}$/.test(d.phone.replace(/\s/g, ""))) e.phone = d.phone.trim() ? "phone" : "required";
    if (d.kind === "firm") {
      req("firmName");
      req("firmCode");
    } else req("district");
  }
  if (step === "services" && !d.services.length) e.services = "oneService";
  if (step === "rates")
    for (const s of d.services) {
      const r = d.rates[s];
      const n = Number(r?.value);
      if (!r || !r.value.trim()) e[`rate-${s}`] = "required";
      else if (!Number.isInteger(n) || n <= 0) e[`rate-${s}`] = "positive";
      else if (r.mode === "pct" && n > 100) e[`rate-${s}`] = "pctRange";
    }
  if (step === "availability") {
    if (!d.grid.length) e.grid = "slot";
    const m = Number(d.maxJobs);
    if (!Number.isInteger(m) || m < 1 || m > POLICY.capMax) e.maxJobs = "maxJobs";
    req("start");
  }
  if (step === "registrations") {
    req("body");
    if (d.body === "other") req("bodyOther");
    req("regNumber");
    if (!d.files.length) e.files = "file";
  }
  if (step === "references")
    d.refs.forEach((r, i) => {
      if (!r.name.trim()) e[`ref-${i}-name`] = "required";
      if (!r.contact.trim()) e[`ref-${i}-contact`] = "required";
      if (!r.ok) e[`ref-${i}-ok`] = "refOk";
    });
  if (step === "review") {
    if (!d.consentPrivacy) e.consentPrivacy = "required";
    if (!d.consentRetention) e.consentRetention = "required";
    if (!d.consentAccuracy) e.consentAccuracy = "required";
  }
  return e;
}
/** First step with errors (review re-validates all). */
export const firstInvalid = (d: Draft) => APPLY_STEPS.find((s) => Object.keys(validate(s, d)).length);

// ---------------------------------------------------------------- data
export type PublicService = { slug: string; name: string };
export const usePublicServices = () =>
  useQuery({ queryKey: ["public", "apply", "services"], queryFn: () => unwrap<{ items: PublicService[] }>(api.GET("/api/public/x/applications/services")), staleTime: Infinity });

export const useSubmitApplication = () =>
  useMutation({ mutationFn: (b: { draft: Draft; client_op_id: string }) => unwrap<{ ref: string }>(api.POST("/api/public/x/applications", { body: b })) });

export type StatusView = Application & { email: string; draft: Partial<Draft> };
export const useRequestOtp = () => useMutation({ mutationFn: (b: { ref: string; email: string }) => unwrap<{ sent: true }>(api.POST("/api/public/x/applications/{ref}/otp", { params: { path: { ref: b.ref } }, body: b })) });
export const useVerifyOtp = () =>
  useMutation({ mutationFn: (b: { ref: string; email: string; code: string }) => unwrap<StatusView>(api.POST("/api/public/x/applications/{ref}/verify", { params: { path: { ref: b.ref } }, body: b })) });
export const useResubmit = () =>
  useMutation({ mutationFn: (b: { ref: string; email: string; patch: Partial<Draft> }) => unwrap<StatusView>(api.PUT("/api/public/x/applications/{ref}", { params: { path: { ref: b.ref } }, body: b })) });

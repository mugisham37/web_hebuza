"use client";
// Lane F data: onboarding (U2), profile & settings (U13), calendar (U8). Pure helpers are exported for unit tests.
import { api, unwrap } from "@/lib/api/client";
import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentKeys, type Summary } from "@/lib/agent/api";
import type { EventKind, Level } from "@/components/atoms/agent";

export const fKeys = {
  onboarding: () => ["agent", "onboarding"] as const,
  skills: () => ["agent", "skills"] as const,
  availability: () => ["agent", "availability"] as const,
  leave: () => ["agent", "leave"] as const,
  contract: () => ["agent", "contract"] as const,
  notif: () => ["agent", "notif-matrix"] as const,
  calendar: (start: string, end: string) =>
    ["agent", "calendar", start, end] as const,
  ics: () => ["agent", "ics"] as const,
};

// ---------------------------------------------------------------- onboarding
export const STEPS = [
  "profile",
  "cv",
  "certificates",
  "payout",
  "agreements",
] as const;
export type Step = (typeof STEPS)[number];
export type Edu = {
  id: string;
  degree: string;
  institution: string;
  year: string;
};
export type Exp = {
  id: string;
  role: string;
  org: string;
  from: string;
  to: string;
  description: string;
};
export type Cert = {
  id: string;
  name: string;
  expires: string; // YYYY-MM-DD, required
  status: "verified" | "pending";
};
export type PayoutMethod = "bank" | "mtn" | "airtel";
export type Onboarding = {
  step: Step;
  status: Summary["clearance"];
  savedAt: string | null;
  changes: { fields: string[]; note: string } | null;
  profile: {
    photo: string | null;
    name: string;
    phone: string;
    email: string;
    linkedin: string;
    website: string;
    languages: string[];
    bio: string;
  };
  cv: {
    education: Edu[];
    experience: Exp[];
    expertise: string[];
    years: string;
  };
  certificates: Cert[];
  payout: {
    method: PayoutMethod;
    bank: string;
    /** Server never returns the full number; `accountLast4` drives the masked display after save. */
    account: string;
    accountLast4: string;
    holder: string;
    verification: "none" | "pending" | "verified" | "failed";
  };
  agreements: {
    nda: boolean;
    code: boolean;
    signature: string;
    signedAt: string | null;
  };
};
export type OnboardingPatch = Partial<
  Omit<Onboarding, "status" | "savedAt" | "changes">
>;

export const useOnboarding = () =>
  useQuery({
    queryKey: fKeys.onboarding(),
    queryFn: () => unwrap<Onboarding>(api.GET("/api/agent/x/onboarding")),
  });
export function useSaveOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: OnboardingPatch) =>
      unwrap<Onboarding>(api.PUT("/api/agent/x/onboarding", { body: b })),
    onSuccess: (d) => qc.setQueryData(fKeys.onboarding(), d),
  });
}
export function useSubmitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<Onboarding>(api.POST("/api/agent/x/onboarding/submit")),
    onSuccess: (d) => {
      qc.setQueryData(fKeys.onboarding(), d);
      qc.invalidateQueries({ queryKey: agentKeys.summary() });
    },
  });
}

/** Per-step completeness (drives Continue + the submitted checklist). */
export function stepDone(o: Onboarding, s: Step): boolean {
  switch (s) {
    case "profile":
      return o.profile.name.trim().length > 1 && o.profile.phone.length >= 9;
    case "cv":
      return (
        o.cv.expertise.length > 0 &&
        (o.cv.experience.length > 0 || o.cv.education.length > 0)
      );
    case "certificates":
      return (
        o.certificates.length > 0 && o.certificates.every((c) => !!c.expires)
      );
    case "payout":
      return (
        o.payout.holder.trim().length > 1 &&
        !!o.payout.accountLast4 &&
        (o.payout.method !== "bank" || !!o.payout.bank)
      );
    case "agreements":
      return o.agreements.nda && o.agreements.code && !!o.agreements.signedAt;
  }
}

/** Real Rwandan banks (D8: names only, no logos). */
export const RW_BANKS = [
  "Bank of Kigali",
  "I&M Bank Rwanda",
  "Equity Bank Rwanda",
  "KCB Bank Rwanda",
  "Access Bank Rwanda",
  "Ecobank Rwanda",
  "BPR Bank Rwanda",
  "Cogebanque",
  "GT Bank Rwanda",
  "NCBA Bank Rwanda",
  "Bank of Africa Rwanda",
  "Development Bank of Rwanda (BRD)",
  "Zigama CSS",
];

// ---------------------------------------------------------------- skills (real GET /api/agent/skills + x_agent.pending)
export const LEVELS: Level[] = ["basic", "intermediate", "advanced", "expert"];
export const levelOf = (n: number): Level =>
  LEVELS[Math.min(4, Math.max(1, n)) - 1];
export type SkillChange = {
  service_category: string;
  proficiency_level: number;
};
export type Skills = {
  agent_id: string;
  skills: {
    service_category: string;
    proficiency_level: number;
    notes?: string | null;
  }[];
  x_agent?: {
    pending: null | {
      id: string;
      changes: SkillChange[];
      note: string;
      at: string;
    };
  };
};
export const useSkills = () =>
  useQuery({
    queryKey: fKeys.skills(),
    queryFn: () => unwrap<Skills>(api.GET("/api/agent/skills")),
  });
export function useSkillRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { changes: SkillChange[]; note: string } | null) =>
      b
        ? unwrap<Skills>(api.POST("/api/agent/x/skills/requests", { body: b }))
        : unwrap<Skills>(api.POST("/api/agent/x/skills/requests/cancel")),
    onSuccess: (d) => qc.setQueryData(fKeys.skills(), d),
  });
}

// ---------------------------------------------------------------- availability + leave
export const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
export type Day = (typeof DAYS)[number];
export type Availability = Record<Day, { am: boolean; pm: boolean }>;
export const useAvailability = () =>
  useQuery({
    queryKey: fKeys.availability(),
    queryFn: () => unwrap<Availability>(api.GET("/api/agent/x/availability")),
  });
export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: Availability) =>
      unwrap<Availability>(api.PUT("/api/agent/x/availability", { body: b })),
    onMutate: async (b) => {
      await qc.cancelQueries({ queryKey: fKeys.availability() });
      const prev = qc.getQueryData<Availability>(fKeys.availability());
      qc.setQueryData(fKeys.availability(), b);
      return { prev };
    },
    onError: (_e, _b, ctx) =>
      ctx?.prev && qc.setQueryData(fKeys.availability(), ctx.prev),
  });
}
export type LeaveItem = {
  id: string;
  from: string;
  to: string;
  reason: string;
  status: "pending" | "approved" | "declined";
};
export const useLeave = () =>
  useQuery({
    queryKey: fKeys.leave(),
    queryFn: () => unwrap<{ items: LeaveItem[] }>(api.GET("/api/agent/x/leave")),
  });
export function useLeaveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      b:
        | { kind: "request"; from: string; to: string; reason: string }
        | { kind: "cancel" },
    ) =>
      b.kind === "request"
        ? unwrap<{ items: LeaveItem[] }>(api.POST("/api/agent/x/leave", { body: b }))
        : unwrap<{ items: LeaveItem[] }>(api.POST("/api/agent/x/leave/cancel")),
    onSuccess: (d) => {
      qc.setQueryData(fKeys.leave(), d);
      qc.invalidateQueries({ queryKey: agentKeys.summary() });
    },
  });
}
/** Cases due inside [from, to] (inclusive days) — Diane reassigns these. */
export function leaveConflicts<T extends { dueAt: string | null }>(
  cases: T[],
  from: string,
  to: string,
): T[] {
  if (!from || !to || to < from) return [];
  const a = Date.parse(`${from}T00:00:00`),
    b = Date.parse(`${to}T23:59:59`);
  return cases.filter((c) => {
    const d = c.dueAt ? Date.parse(c.dueAt) : NaN;
    return d >= a && d <= b;
  });
}

// ---------------------------------------------------------------- contract + notification matrix
export type Contract = {
  type: string;
  sharePct: number;
  start: string;
  end: string;
};
export const useContract = () =>
  useQuery({
    queryKey: fKeys.contract(),
    queryFn: () => unwrap<Contract>(api.GET("/api/agent/x/contract")),
  });
/** Reminder bucket for the contract expiry chip (T-60/30/7). */
export const expiryBucket = (daysLeft: number) =>
  daysLeft < 0
    ? "expired"
    : daysLeft <= 7
      ? 7
      : daysLeft <= 30
        ? 30
        : daysLeft <= 60
          ? 60
          : null;

export const CHANNELS = ["inApp", "sms", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];
export type NotifRow = { event: string; required: Channel[] } & Record<
  Channel,
  boolean
>;
export const useNotifMatrix = () =>
  useQuery({
    queryKey: fKeys.notif(),
    queryFn: () =>
      unwrap<{ rows: NotifRow[] }>(api.GET("/api/agent/x/notification-matrix")),
  });
export function useSetNotif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: NotifRow[]) =>
      unwrap<{ rows: NotifRow[] }>(api.PUT("/api/agent/x/notification-matrix", { body: { rows } })),
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: fKeys.notif() });
      const prev = qc.getQueryData<{ rows: NotifRow[] }>(fKeys.notif());
      qc.setQueryData(fKeys.notif(), { rows });
      return { prev };
    },
    onError: (_e, _b, ctx) =>
      ctx?.prev && qc.setQueryData(fKeys.notif(), ctx.prev),
  });
}

// ---------------------------------------------------------------- calendar (real GET /api/agent/calendar, mocked by lane A)
type CalItem = {
  kind: "case" | "obligation";
  id: string;
  code?: string | null;
  title: string;
  /** label.type = deadline | appointment | field | obligation (the real `kind` only knows case | obligation). */
  label?: Record<string, string> | null;
  serviceName: string;
  clientName?: string | null;
  dueDate: string;
  dueAt?: string | null;
  state: string;
  status: string;
  note?: string | null;
};
export type CalEvent = {
  id: string;
  kind: EventKind;
  source: "case" | "obligation";
  title: string;
  ref: string | null;
  client: string | null;
  service: string;
  day: string; // YYYY-MM-DD, local
  at: number | null; // epoch ms of the due time / start
  allDay: boolean; // deadlines sit in the all-day row (their time shows on the chip)
  end: number | null;
  location: string | null;
  joinUrl: string | null;
  state: string;
};
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (s: string, n: number) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
/** Monday of the week containing s. */
export const weekStart = (s: string) =>
  addDays(s, -((parseYmd(s).getDay() + 6) % 7));
export const monthGridStart = (s: string) => {
  const d = parseYmd(s);
  return weekStart(ymd(new Date(d.getFullYear(), d.getMonth(), 1)));
};

const KINDS: EventKind[] = ["deadline", "appointment", "field", "obligation"];
export function toEvent(i: CalItem): CalEvent {
  const t = i.label?.type as EventKind | undefined;
  const kind: EventKind = t && KINDS.includes(t) ? t : i.kind === "obligation" ? "obligation" : "deadline";
  const at = i.dueAt ? Date.parse(i.dueAt) : null;
  const allDay = at === null || kind === "deadline";
  const note = i.note ?? null;
  const url = note && /^https?:\/\//.test(note) ? note : null;
  return {
    id: i.id,
    kind,
    source: i.kind,
    title: i.title,
    ref: i.code ?? null,
    client: i.clientName ?? null,
    service: i.serviceName,
    day: at === null ? i.dueDate.slice(0, 10) : ymd(new Date(at)),
    at,
    allDay,
    end: at === null ? null : at + 3600_000, // shortcut: 1 h blocks, upgrade when CalendarItem carries an end time
    location: url ? null : note,
    joinUrl: url,
    state: i.state,
  };
}
export const useCalendar = (start: string, end: string, enabled = true) =>
  useQuery({
    queryKey: fKeys.calendar(start, end),
    enabled,
    queryFn: async () =>
      (
        await unwrap<{ items: CalItem[] }>(api.GET("/api/agent/calendar", { params: { query: { start: start, end: end } } }))
      ).items
        .map(toEvent)
        .sort((a, b) => (a.at ?? 0) - (b.at ?? 0)),
  });

/** Overlapping timed events → side-by-side columns. Returns col index and the column count of its overlap cluster. */
export function layoutDay<
  T extends { at: number | null; end: number | null },
>(evs: T[]) {
  const timed = evs
    .filter((e) => e.at !== null)
    .sort((a, b) => a.at! - b.at! || b.end! - a.end!);
  const out: { e: T; col: number; cols: number }[] = [];
  let cluster: typeof out = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const cols = Math.max(0, ...cluster.map((c) => c.col)) + 1;
    cluster.forEach((c) => (c.cols = cols));
    out.push(...cluster);
    cluster = [];
  };
  for (const e of timed) {
    if (e.at! >= clusterEnd && cluster.length) flush();
    const colEnds: number[] = [];
    cluster.forEach(
      (c) => (colEnds[c.col] = Math.max(colEnds[c.col] ?? -Infinity, c.e.end!)),
    );
    let col = colEnds.findIndex((end) => end === undefined || end <= e.at!);
    if (col < 0) col = colEnds.length;
    cluster.push({ e, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, e.end!);
  }
  if (cluster.length) flush();
  return out;
}

export function useObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: "done" | "link" | "skip";
      body: object;
    }) =>
      unwrap<{ state: string; code?: string }>(api.POST("/api/agent/obligations/{id}/{action}", { params: { path: { id, action } }, body: body })),
    // Patch the cached item instead of refetching: the calendar mock is owned by lane A.
    onSuccess: (r, v) =>
      qc.setQueriesData<CalEvent[]>({ queryKey: ["agent", "calendar"] }, (xs) =>
        xs?.map((e) =>
          e.id === v.id ? { ...e, state: r.state, ref: r.code ?? e.ref } : e,
        ),
      ),
  });
}
export const useIcs = (enabled: boolean) =>
  useQuery({
    queryKey: fKeys.ics(),
    queryFn: () => unwrap<{ url: string }>(api.GET("/api/agent/x/ics")),
    enabled,
  });
export function useRegenerateIcs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<{ url: string }>(api.POST("/api/agent/x/ics/regenerate")),
    onSuccess: (d) => qc.setQueryData(fKeys.ics(), d),
  });
}

// ---------------------------------------------------------------- viewport
const mq = "(max-width: 1023px)";
/** Phone/tablet (< lg): drawers become bottom sheets. */
export const usePhone = () =>
  useSyncExternalStore(
    (fn) => {
      const m = window.matchMedia(mq);
      m.addEventListener("change", fn);
      return () => m.removeEventListener("change", fn);
    },
    () => window.matchMedia(mq).matches,
    () => false,
  );

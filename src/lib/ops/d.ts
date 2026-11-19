"use client";
// Lane D data layer: U14 tickets & disputes, U15 conversations console. Same pattern as lib/ops/c.ts.
// Tickets, disputes, chat, claim, templates, metrics and transcript: server modules ops.manage + chat.
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


// ---------------------------------------------------------------- U14 tickets
export type TicketTab = "complaints" | "disputes" | "enquiries" | "resolved";
export type TicketStatus =
  "open" | "waiting_client" | "escalated" | "confirming" | "resolved";
export type TicketMsg = {
  id: string;
  author: string;
  role: "client" | "staff" | "system";
  internal: boolean;
  kind: "text" | "call";
  body: string;
  at: string;
};
export type Ticket = {
  ref: string;
  kind: "complaint" | "dispute" | "enquiry";
  category: "delay" | "quality" | "billing" | "conduct" | "other";
  client: string;
  caseRef: string;
  service: string;
  paid: number;
  priority: "critical" | "high" | "medium" | "low";
  status: TicketStatus;
  owner: { id: string; name: string };
  responseDueAt: string;
  responded: boolean;
  escalatedAt: string | null;
  disputeId: string | null;
  conversationId: string | null;
  satisfaction: number | null;
};
export type TicketDetail = Ticket & {
  messages: TicketMsg[];
  files: { name: string; size: string }[];
  activity: { at: string; text: string }[];
  history: {
    ref: string;
    category: Ticket["category"];
    status: TicketStatus;
  }[];
  refundRequest: { amount: number; reason: string; status: string } | null;
  credits: number;
  resolution: { summary: string; rootCause: string; preventive: string } | null;
};
export const dKeys = {
  tickets: (tab: string) => ["ops", "tickets", tab] as const,
  ticket: (ref: string) => ["ops", "ticket", ref] as const,
  convs: (f: string, q: string) => ["ops", "convs", f, q] as const,
  thread: (id: string) => ["ops", "thread", id] as const,
  templates: ["ops", "templates"] as const,
  metrics: ["ops", "chat-metrics"] as const,
  mentions: (id: string) => ["ops", "mentions", id] as const,
};

export const useTickets = (tab: TicketTab) =>
  useQuery({
    queryKey: dKeys.tickets(tab),
    queryFn: () =>
      unwrap<{ items: Ticket[]; counts: Record<TicketTab, number> }>(api.GET("/api/admin/ops/tickets", { params: { query: { tab: tab } } })),
  });
export const useTicket = (ref: string) =>
  useQuery({
    queryKey: dKeys.ticket(ref),
    queryFn: () =>
      unwrap<TicketDetail>(api.GET("/api/admin/ops/tickets/{ref}", { params: { path: { ref: ref } } })),
    retry: (n, e) => n < 2 && !/not.?found/i.test(String(e)),
    refetchInterval: 5000,
  });

export type TicketAction =
  | {
      action: "message";
      body: string;
      internal: boolean;
      kind?: "text" | "call";
    }
  | { action: "refund"; amount: number; reason: string; stepUp: string }
  | { action: "credit" }
  | { action: "reassign"; agentId: string }
  | { action: "escalate"; note: string }
  | {
      action: "resolve";
      summary: string;
      resolutionKind?: string;
      rootCause: string;
      preventive: string;
      askConfirm: boolean;
    }
  | { action: "confirm"; ok: boolean; score: number | null }
  | { action: "reopen" }
  | { action: "severity"; severity: "critical" | "high" | "medium" | "low" };
/** One mutation for every ticket action; dispute tickets resolve through the real dispute endpoint first. */
export function useTicketAction(t: { ref: string; disputeId: string | null }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: TicketAction) => {
      if (a.action === "resolve" && t.disputeId)
        await unwrap(api.POST("/api/chat/disputes/{id}/resolve", { params: { path: { id: t.disputeId } }, body: {
          resolution_kind: a.rootCause,
          note: a.summary,
        } }));
      const { stepUp, ...body } = a as TicketAction & { stepUp?: string };
      return unwrap<TicketDetail>(api.POST("/api/admin/ops/tickets/{ref}/actions", { params: { path: { ref: t.ref } }, body: body, headers: hdr({
          stepUp,
          audit:
            a.action === "refund" || a.action === "escalate"
              ? a.action
              : undefined,
          idempotent: true,
        }) }));
    },
    onSuccess: (d) => qc.setQueryData(dKeys.ticket(t.ref), d),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ops", "tickets"] }),
  });
}
/** New ticket; a dispute goes through the real POST /api/chat/conversations/{id}/disputes. */
export function useNewTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: {
      kind: Ticket["kind"];
      category: Ticket["category"];
      caseRef: string;
      note: string;
    }) =>
      b.kind === "dispute"
        ? unwrap<{ dispute_id?: string; ref?: string }>(
            api.POST("/api/chat/conversations/{id}/disputes", {
              params: { path: { id: `cv-${b.caseRef}` } },
              body: { category: b.category, note: b.note },
            }),
          )
        : unwrap<{ dispute_id?: string; ref?: string }>(api.POST("/api/admin/ops/tickets", { body: b, headers: hdr({
            idempotent: true,
          }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ops", "tickets"] }),
  });
}

// ---------------------------------------------------------------- U15 conversations
export type ConvFilter =
  "unassigned" | "mine" | "waiting_us" | "waiting_client" | "handoff" | "dms";
export type AdminConv = {
  conversation_id: string;
  kind: string;
  code: string | null;
  title: string | null;
  client_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  waiting_since: string | null;
  unread_for_admin: number;
  has_dispute: boolean;
  has_internal_notes: boolean;
  claimed_by: string | null;
  claimed_by_name: string | null;
};
export type ChatMsg = {
  message_id: string;
  seq: number;
  sender_id: string | null;
  sender_name: string | null;
  sender_role: string | null;
  content: string;
  lane: string;
  kind: string;
  is_system: boolean;
  mentions: string[];
  pinned_at?: string | null;
  created_at: string;
};
export type Template = {
  template_id: string;
  title: string;
  body_rw: string;
  body_en: string;
  body_fr: string;
};

const FILTER_QS: Record<ConvFilter, Record<string, string>> = {
  unassigned: { unassigned: "true" },
  mine: { agent_id: "me" },
  waiting_us: { waiting_hours: "0" },
  handoff: { handoff: "true" },
  waiting_client: { waiting_on: "client" },
  dms: {},
};
export const useConvs = (f: ConvFilter, q: string) =>
  useQuery({
    queryKey: dKeys.convs(f, q),
    queryFn: async () => {
      if (f === "dms") {
        const r = await unwrap<{
          conversations: (AdminConv & { title: string })[];
        }>(api.GET("/api/chat/conversations", { params: { query: { kind: "staff_dm", q: q } } }));
        return {
          conversations: r.conversations,
          total: r.conversations.length,
        };
      }
      return unwrap<{ conversations: AdminConv[]; total: number }>(
        api.GET("/api/admin/chat/conversations", { params: { query: { ...FILTER_QS[f], q } } }),
      );
    },
  });
/** One conversation's list row, for the /ops/conversations/[id] page. Keyed under "convs" so claim refreshes it. */
export const useConv = (id: string) =>
  useQuery({
    queryKey: ["ops", "convs", "one", id],
    queryFn: () => unwrap<AdminConv>(api.GET("/api/admin/chat/conversations/{id}", { params: { path: { id } } })),
    retry: false,
  });
export const useConvCounts = () =>
  useQuery({
    queryKey: ["ops", "convs", "counts"],
    queryFn: () =>
      unwrap<Record<ConvFilter, number>>(api.GET("/api/admin/chat/conversations/counts")),
  });
export const useThread = (id: string | null) =>
  useQuery({
    queryKey: dKeys.thread(id ?? ""),
    queryFn: () =>
      unwrap<{ messages: ChatMsg[]; write_lanes: string[] }>(api.GET("/api/chat/conversations/{id}/messages", { params: { path: { id: id! }, query: { limit: 100 } } })),
    enabled: !!id,
  });
export const useChatMetrics = () =>
  useQuery({
    queryKey: dKeys.metrics,
    queryFn: () =>
      unwrap<{
        waiting_for_reply: number;
        open_disputes: number;
        breached_disputes: number;
      }>(api.GET("/api/admin/chat/metrics")),
    refetchInterval: 30_000,
  });
export const useTemplates = () =>
  useQuery({
    queryKey: dKeys.templates,
    queryFn: () => unwrap<Template[]>(api.GET("/api/chat/templates")),
  });
export const renderTemplate = (
  id: string,
  conversationId: string,
  locale: "rw" | "en" | "fr",
) =>
  unwrap<{ body: string }>(api.POST("/api/chat/templates/{id}/render", { params: { path: { id }, query: { locale: locale } }, body: {
      conversation_id: conversationId,
    } }));
export const useMentionCandidates = (id: string | null) =>
  useQuery({
    queryKey: dKeys.mentions(id ?? ""),
    queryFn: () =>
      unwrap<{ user_id: string; name: string }[]>(api.GET("/api/chat/mention-candidates/{id}", { params: { path: { id: id! } } })),
    enabled: !!id,
  });

export function useSendMsg(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { content: string; lane: "client" | "internal" | "team"; mentions: string[] }) =>
      unwrap<ChatMsg>(api.POST("/api/chat/conversations/{id}/messages", { params: { path: { id } }, body: {
        client_msg_id: crypto.randomUUID(),
        ...b,
      } })),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dKeys.thread(id) });
      qc.invalidateQueries({ queryKey: ["ops", "convs"] });
    },
  });
}
export function useClaim(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.POST("/api/admin/chat/conversations/{id}/claim", { params: { path: { id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ops", "convs"] }),
  });
}

/** Fetch the transcript and hand it to the browser as a download (notes need a step-up token). */
export async function downloadTranscript(
  id: string,
  o: {
    notes: boolean;
    from: string;
    to: string;
    format: "pdf" | "csv";
    stepUp?: string;
  },
) {
  const qs = new URLSearchParams({
    include_internal: String(o.notes),
    date_from: o.from,
    date_to: o.to,
    format: o.format,
  });
  const r = await fetch(
    `/api/admin/chat/conversations/${id}/transcript.pdf?${qs}`,
    {
      headers: o.stepUp
        ? { "X-Step-Up-Token": o.stepUp, "X-Audit-Reason": "transcript export" }
        : {},
      credentials: "include",
    },
  );
  if (!r.ok)
    throw new Error(r.status === 401 ? "step_up_required" : `HTTP ${r.status}`);
  const url = URL.createObjectURL(await r.blob());
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `transcript-${id}.${o.format}`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/** Reply-SLA for a waiting conversation: 1 business-target hour from the client's last message. */
export const REPLY_TARGET_MS = 3600_000;
export function replySla(waitingSince: string | null, now: number) {
  if (!waitingSince || !now) return null;
  const left = Date.parse(waitingSince) + REPLY_TARGET_MS - now;
  return {
    left,
    state: left < 0 ? "overdue" : left < 30 * 60_000 ? "due" : "ok",
  } as const;
}

"use client";
// Lane D data layer: inbox threads, personal templates, clients + limited 360. Sends go through the outbox.
import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { normalizeStatus, type CaseStatus } from "@/shared/domain/case-status";
import { agentKeys } from "@/lib/agent/api";
import { configureOutbox, enqueue } from "@/lib/agent/outbox";

export const dKeys = {
  threads: (f: string, q: string) => ["agent", "threads", f, q] as const,
  thread: (ref: string) => ["agent", "thread", ref] as const,
  templates: ["agent", "templates"] as const,
  clients: ["agent", "clients"] as const,
  client: (id: string) => ["agent", "client", id] as const,
};

// ---------------------------------------------------------------- threads
export type InboxFilter = "all" | "unread" | "waiting" | "mentions";
export type ThreadRow = {
  ref: string;
  clientId: string;
  client: string;
  clientLanguage: string;
  service: string;
  status: CaseStatus;
  dueAt: string;
  preview: string;
  previewLane: "client" | "internal";
  lastAt: string;
  unread: number;
  waiting: boolean;
  waitingSince: string | null;
  mentions: number;
  dispute: boolean;
  readOnly: boolean;
};
export type Card = {
  type: "doc_request" | "appointment" | "status";
  title: string;
  detail: string;
};
export type Msg = {
  id: string;
  lane: "client" | "internal";
  kind: "text" | "voice" | "file" | "card" | "system";
  authorId: string;
  author: string;
  body: string;
  at: string;
  mentions?: string[];
  file?: { name: string; size: number };
  voice?: { seconds: number; src?: string; mime?: string };
  card?: Card;
};
export const useThreads = (f: InboxFilter, q: string) =>
  useQuery({
    queryKey: dKeys.threads(f, q),
    queryFn: async () => {
      const r = await unwrap<{
        items: (ThreadRow & { status: string })[];
        counts: Record<InboxFilter, number>;
      }>(api.GET("/api/agent/x/threads", { params: { query: { filter: f, q: q } } }));
      return {
        ...r,
        items: r.items.map((t) => ({
          ...t,
          status: normalizeStatus(t.status),
        })),
      };
    },
    refetchInterval: 15_000,
  });
export const useThread = (ref: string | null) =>
  useQuery({
    queryKey: dKeys.thread(ref ?? ""),
    queryFn: () =>
      unwrap<{ thread: ThreadRow; messages: Msg[] }>(api.GET("/api/agent/x/threads/{ref}", { params: { path: { ref: ref ?? "" } } })),
    enabled: !!ref,
    refetchInterval: 15_000,
    retry: (n, e) => n < 2 && !/not one of/i.test(String(e)),
  });
export function markRead(qc: QueryClient, ref: string) {
  void unwrap(api.POST("/api/agent/x/threads/{ref}/read", { params: { path: { ref: ref } } })).then(() =>
    qc.invalidateQueries({ queryKey: agentKeys.summary() }),
  );
}

/** Send = enqueue in the outbox; the outbox POSTs (now or on reconnect) and refreshes the thread. */
export function useSend(ref: string) {
  const qc = useQueryClient();
  useEffect(
    () =>
      configureOutbox(
        (i) => unwrap(api.POST("/api/agent/x/threads/{ref}/messages", { params: { path: { ref: i.ref } }, body: { client_msg_id: i.id, ...i.body } })),
        (i) => {
          void qc.invalidateQueries({ queryKey: dKeys.thread(i.ref) });
          void qc.invalidateQueries({ queryKey: ["agent", "threads"] });
        },
      ),
    [qc],
  );
  return (body: Omit<Msg, "id" | "authorId" | "author" | "at" | "kind"> & { kind: Exclude<Msg["kind"], "system"> }) =>
    enqueue({
      id: crypto.randomUUID(),
      ref,
      path: `/api/agent/x/threads/${encodeURIComponent(ref)}/messages`,
      body,
    });
}

// ---------------------------------------------------------------- templates
export const LANGS = ["rw", "en", "fr"] as const;
export type Lang = (typeof LANGS)[number];
export type Tpl = {
  id: string;
  name: string;
  body_rw: string;
  body_en: string;
  body_fr: string;
  updatedAt: string;
};
export const VARS = ["client_name", "case_ref", "due_date"] as const;
export const useTemplates = () =>
  useQuery({
    queryKey: dKeys.templates,
    queryFn: async () =>
      (await unwrap<{ items: Tpl[] }>(api.GET("/api/agent/x/templates"))).items,
  });
export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: Partial<Tpl> & { isNew?: boolean }) => {
      const { isNew, ...b } = t;
      return isNew || !b.id
        ? unwrap<Tpl>(api.POST("/api/agent/x/templates", { body: b }))
        : unwrap<Tpl>(api.PUT("/api/agent/x/templates/{id}", { params: { path: { id: b.id } }, body: b }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: dKeys.templates }),
  });
}
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE("/api/agent/x/templates/{id}", { params: { path: { id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: dKeys.templates }),
  });
}

// ---------------------------------------------------------------- clients
export type ClientRow = {
  clientId: string;
  name: string;
  phone: null;
  planName: string;
  status: "active" | "inactive";
  lastCaseCode: string | null;
  openCaseCount: number;
  focusServices: string[];
  x_agent: {
    type: "individual" | "company";
    dedicated: boolean;
    nextObligation: { label: string; dueAt: string; ref: string } | null;
    lastContactAt: string | null;
  };
};
export type Client360 = ClientRow & {
  language: string;
  since: string;
  cases: { ref: string; service: string; status: CaseStatus; dueAt: string }[];
  documents: { id: string; name: string; ref: string; state: string }[];
  obligations: { ref: string; label: string; dueAt: string }[];
  activity: { at: string; ref: string; who: string; text: string }[];
  notes: { id: string; text: string; at: string; by: string }[];
  bridge: string;
};
export const useClients = () =>
  useQuery({
    queryKey: dKeys.clients,
    queryFn: async () =>
      (await unwrap<{ clients: ClientRow[] }>(api.GET("/api/agent/clients"))).clients,
  });
export const useClient = (id: string) =>
  useQuery({
    queryKey: dKeys.client(id),
    queryFn: async () => {
      const r = await unwrap<Client360 & { cases: { status: string }[] }>(api.GET("/api/agent/x/clients/{id}", { params: { path: { id: id } } }));
      return {
        ...r,
        cases: r.cases.map((c) => ({
          ...c,
          status: normalizeStatus(c.status),
        })),
      } as Client360;
    },
    retry: (n, e) => n < 2 && !/isn't on any/i.test(String(e)),
  });
export function useAddClientNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      unwrap(api.POST("/api/agent/x/clients/{id}/notes", { params: { path: { id: id } }, body: { text } })),
    onSettled: () => qc.invalidateQueries({ queryKey: dKeys.client(id) }),
  });
}

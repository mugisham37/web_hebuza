"use client";
// Chat actions shared by the client thread (C08) and the ops console (U15): F-MSG-02/04/06/08/09/10/11/15.
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { dKeys, type Template } from "@/lib/ops/d";

type Msg = components["schemas"]["ChatMessage"];
export type Reaction = { emoji: string; user_ids: string[] };
export type Dispute = {
  dispute_id: string;
  status: "open" | "resolved";
  category: string;
} | null;
export type TemplateBody = Omit<Template, "template_id">;
export type ConvOp =
  "join" | "leave" | "laneOpen" | "laneClose" | "holdOn" | "holdOff";

/** Mutation that refreshes `key` (the thread) and every ["chat", …] read when it settles. */
function useInv<V, R = unknown>(key: QueryKey, fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["chat"] }),
      ]),
  });
}
const p = (id: string) => ({ params: { path: { id } } });

// ── messages (F-MSG-04)
export const useEditMsg = (key: QueryKey) =>
  useInv(key, (b: { id: string; content: string }) =>
    unwrap(
      api.PATCH("/api/chat/messages/{id}", {
        ...p(b.id),
        body: { content: b.content },
      }),
    ),
  );
export const useDeleteMsg = (key: QueryKey) =>
  useInv(key, (id: string) =>
    unwrap(api.DELETE("/api/chat/messages/{id}", p(id))),
  );
export const useReact = (key: QueryKey) =>
  useInv(key, (b: { id: string; emoji: string }) =>
    unwrap(
      api.POST("/api/chat/messages/{id}/reactions", {
        ...p(b.id),
        body: { emoji: b.emoji },
      }),
    ),
  );
export const usePinMsg = (key: QueryKey) =>
  useInv(key, (b: { id: string; on: boolean }) =>
    unwrap(
      b.on
        ? api.POST("/api/chat/messages/{id}/pin", p(b.id))
        : api.DELETE("/api/chat/messages/{id}/pin", p(b.id)),
    ),
  );
export const useMsgHistory = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: ["chat", "history", id],
    queryFn: () =>
      unwrap<{ content: string; edited_at: string }[]>(
        api.GET("/api/chat/messages/{id}/history", p(id)),
      ),
    enabled,
  });

// ── conversation reads (F-MSG-09/11)
export const useConvSearch = (id: string, q: string) =>
  useQuery({
    queryKey: ["chat", "search", id, q],
    queryFn: () =>
      unwrap<{ results: Msg[] }>(
        api.GET("/api/chat/conversations/{id}/search", {
          params: { path: { id }, query: { q } },
        }),
      ),
    enabled: q.trim().length >= 2,
  });
export const usePinned = (id: string) =>
  useQuery({
    queryKey: ["chat", "pinned", id],
    queryFn: () =>
      unwrap<Msg[]>(api.GET("/api/chat/conversations/{id}/pinned", p(id))),
  });
export const useDispute = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: ["chat", "dispute", id],
    queryFn: () =>
      unwrap<Dispute>(api.GET("/api/chat/conversations/{id}/dispute", p(id))),
    enabled,
  });
export const useRefCandidates = (id: string, q: string | null) =>
  useQuery({
    queryKey: ["chat", "refs", id, q],
    queryFn: () =>
      unwrap<{ ref: string; label: string }[]>(
        api.GET("/api/chat/reference-candidates/{id}", {
          params: { path: { id }, query: { q: q ?? "" } },
        }),
      ),
    enabled: q !== null,
  });

// ── presence (F-MSG-06): fire-and-forget, failures are irrelevant to the user
export const pingTyping = (id: string) =>
  void api
    .POST("/api/chat/conversations/{id}/typing", { ...p(id), body: {} })
    .catch(() => {});
export const pingDelivered = (id: string, seq: number) =>
  void api
    .POST("/api/chat/conversations/{id}/delivered", { ...p(id), body: { seq } })
    .catch(() => {});

export const useMute = (key: QueryKey) =>
  useInv(key, (b: { id: string; muted: boolean }) =>
    unwrap(
      api.POST("/api/chat/conversations/{id}/mute", {
        ...p(b.id),
        body: { muted: b.muted },
      }),
    ),
  );

// ── ops conversation controls (F-MSG-10/15)
export const useConvOp = (key: QueryKey) =>
  useInv(key, ({ id, op }: { id: string; op: ConvOp }) =>
    unwrap(
      op === "join"
        ? api.POST("/api/chat/conversations/{id}/join", p(id))
        : op === "leave"
          ? api.POST("/api/chat/conversations/{id}/leave", p(id))
          : op === "laneOpen" || op === "laneClose"
            ? api.POST("/api/chat/conversations/{id}/partner-lane", {
                ...p(id),
                body: { open: op === "laneOpen" },
              })
            : api.POST("/api/chat/conversations/{id}/legal-hold", {
                ...p(id),
                body: { on: op === "holdOn" },
              }),
    ),
  );
export const useLinkConv = (key: QueryKey) =>
  useInv(key, (b: { id: string; code: string }) =>
    unwrap(
      api.POST("/api/admin/chat/conversations/{id}/link", {
        ...p(b.id),
        body: { code: b.code },
      }),
    ),
  );
export const useStartDm = () =>
  useInv(["ops", "convs"], (participant_id: string) =>
    unwrap<{ conversation_id: string }>(
      api.POST("/api/chat/conversations", { body: { kind: "staff_dm", participant_id } }),
    ),
  );

// ── templates CRUD (F-MSG-08)
export const useSaveTemplate = () =>
  useInv(
    dKeys.templates,
    ({ id, ...b }: TemplateBody & { id: string | null }) =>
      unwrap(
        id
          ? api.PATCH("/api/chat/templates/{id}", { ...p(id), body: b })
          : api.POST("/api/chat/templates", { body: b }),
      ),
  );
export const useDeleteTemplate = () =>
  useInv(dKeys.templates, (id: string) =>
    unwrap(api.DELETE("/api/chat/templates/{id}", p(id))),
  );

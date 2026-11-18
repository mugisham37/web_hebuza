import { z } from "zod";

// Public form submit (runs in the browser via useActionState). Posts /api/contact — dummy data answers it until the backend exists.

export type FormState =
  | { k: "idle" }
  | { k: "sent"; ref: string | null }
  | { k: "invalid"; fields: string[] }
  | { k: "rate" }
  | { k: "error" };

const fieldsOf = (detail?: { loc?: unknown[] }[]) =>
  (detail ?? []).map((d) => String(d.loc?.[1] ?? "")).filter(Boolean);

type Res = { status: number; success: boolean; data?: { reference?: string | null } | null; detail?: { loc?: unknown[] }[] };
async function post(path: string, body: unknown): Promise<Res> {
  try {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const b = await r.json().catch(() => ({}));
    return { status: r.status, success: r.ok && b.success !== false, data: b.data, detail: b.detail };
  } catch {
    return { status: 0, success: false };
  }
}

function outcome(r: Res): FormState {
  if (r.status === 429) return { k: "rate" };
  if (r.status === 422) return { k: "invalid", fields: fieldsOf(r.detail) };
  if (!r.success) return { k: "error" };
  return { k: "sent", ref: r.data?.reference ?? null };
}

const Contact = z.object({
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(3).max(255),
  topic: z.string().trim().min(1).max(100),
  language: z.string().max(8).optional(),
  message: z.string().trim().min(10).max(4000),
  consent: z.literal("on"),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitContact(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(fd);
  if (raw.website) return { k: "sent", ref: null }; // bot: pretend success, send nothing
  const p = Contact.safeParse(raw);
  if (!p.success)
    return {
      k: "invalid",
      fields: [...new Set(p.error.issues.map((i) => String(i.path[0])))],
    };
  const d = p.data;
  // shortcut: the contract has no language field yet, so the preferred language rides in `topic`.
  return outcome(
    await post("/api/contact", {
      name: d.name,
      contact: d.contact,
      topic: `${d.topic} · ${d.language ?? ""}`.slice(0, 128),
      message: d.message,
    }),
  );
}

// Typed API client (paths/types in schema.d.ts, generated from the server's /api/openapi.json via `pnpm api:types`). Frontend only: same-origin
// /api/* is answered by MSW dummy data (src/mocks) until the backend exists; then NEXT_PUBLIC_API_URL points here.
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/lib/api/schema";

/** Server envelope: { success, message, errorType, data } (server/app/core ApiResponse). */
export type Envelope<T> = { success: boolean; message: string; errorType?: string | null; data?: T | null };

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorType: string | null,
    message: string,
    public requestId: string | null,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
  get isAuth() { return this.status === 401; }
  get isForbidden() { return this.status === 403 || this.errorType === "forbidden"; }
  get isNotFound() { return this.status === 404; }
  get isValidation() { return this.status === 422 || this.errorType === "validation"; }
  get isRateLimited() { return this.status === 429 || this.errorType === "rate_limited"; }
}

// Same-origin in the browser (next.config rewrites /api/* to the API); server-side calls go straight to API_URL.
const baseUrl = typeof window === "undefined" ? (process.env.API_URL ?? "") : "";

let refreshing: Promise<boolean> | null = null;
async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${baseUrl}/api/auth/session`, { credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { setTimeout(() => (refreshing = null), 0); });
  return refreshing;
}

const RETRIED = "x-retried";

const middleware: Middleware = {
  onRequest({ request }) {
    if (!request.headers.has("x-request-id")) request.headers.set("x-request-id", crypto.randomUUID());
    // @Idempotent API routes 400 without a key; callers that need retry-dedupe pass their own stable key.
    if (request.method !== "GET" && request.method !== "HEAD" && !request.headers.has("idempotency-key")) request.headers.set("Idempotency-Key", crypto.randomUUID());
    return request;
  },
  async onResponse({ request, response }) {
    // Access token expired → let the server refresh via cookie, retry once.
    if (response.status === 401 && !request.headers.has(RETRIED) && !request.url.includes("/api/auth/")) {
      if (await refreshSession()) {
        const retry = new Request(request, { headers: new Headers(request.headers) });
        retry.headers.set(RETRIED, "1");
        return fetch(retry);
      }
      // Refresh failed: the session is gone (idle timeout). Shells listen and offer sign-in (ST3).
      if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:expired"));
    }
    return response;
  },
};

// fetch resolved per call, so mock-mode hold (providers.tsx) and test stubs apply to the typed client too.
export const api = createClient<paths>({ baseUrl, credentials: "include", fetch: (input: Request) => globalThis.fetch(input) });
api.use(middleware);

/** Unwrap openapi-fetch result + server envelope; throw ApiError on failure. */
export async function unwrap<T>(
  call: Promise<{ data?: Envelope<T> | unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  const requestId = response.headers.get("x-request-id");
  if (error || !response.ok) {
    const body = (error ?? {}) as { message?: string; errorType?: string; detail?: unknown };
    const fields: Record<string, string> = {};
    if (Array.isArray(body.detail)) {
      for (const d of body.detail as { loc?: unknown[]; msg?: string }[]) {
        const key = d.loc?.slice(1).join(".");
        if (key && d.msg) fields[key] = d.msg;
      }
    }
    throw new ApiError(response.status, body.errorType ?? null, body.message ?? response.statusText, requestId, fields);
  }
  const env = data as Envelope<T>;
  if (env && typeof env === "object" && "success" in env) {
    if (!env.success) throw new ApiError(response.status, env.errorType ?? null, env.message, requestId);
    return env.data as T;
  }
  return data as T;
}

/** Last path segment of every POST route under `Base` (`/api/x/{id}` → "approve" | "reject" …), for one-helper-many-actions UIs. */
export type ActionOf<Base extends string> = {
  [P in keyof paths]: P extends `${Base}/${infer A}` ? (A extends `${string}/${string}` | `{${string}}` ? never : paths[P] extends { post: object } ? A : never) : never;
}[keyof paths];

/** A typed `api.X(...)` call that still needs its headers (step-up, idempotency…): generic mutation hooks add them, then unwrap. */
export type ApiCall = (headers: Record<string, string>) => Parameters<typeof unwrap>[0];

/** Idempotency key for money-moving / submit calls (spec X-04, F-FIN-16, F-REQ-02). Keep it per user intent, not per click. */
export const newIdempotencyKey = () => crypto.randomUUID();

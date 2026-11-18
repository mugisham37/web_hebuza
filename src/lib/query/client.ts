import { QueryClient, isServer } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

function make() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false, // low-bandwidth first (spec principle 1)
        retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;
/** One client per request on the server, a singleton in the browser. */
export function getQueryClient() {
  if (isServer) return make();
  return (browserClient ??= make());
}

/** Query-key conventions: [module, entity, ...params]. Add per module as stages land. */
export const qk = {
  session: ["iam", "session"] as const,
  catalogue: (locale: string) => ["cat", "services", locale] as const,
  service: (slug: string, locale: string) => ["cat", "service", slug, locale] as const,
  case: (ref: string) => ["req", "case", ref] as const,
  cases: (filters: Record<string, unknown>) => ["req", "cases", filters] as const,
  notifications: ["ntf", "list"] as const,
};

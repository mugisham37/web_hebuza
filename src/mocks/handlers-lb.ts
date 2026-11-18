// L-B mocks: /api/contact returns a TKT- reference (the server contract only has `submitted` today; `reference` is the proposed addition).
// Test hooks: a name of "ratelimit" → 429, "servererror" → 500.
import { http, HttpResponse, delay } from "msw";

let seq = 141;
export const handlers = [
  http.post("/api/contact", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { name?: string };
    const fail = (status: number, errorType: string, message: string) =>
      HttpResponse.json(
        { success: false, message, errorType, data: null },
        { status },
      );
    if (body.name?.toLowerCase() === "ratelimit")
      return fail(429, "rate_limited", "Too many requests.");
    if (body.name?.toLowerCase() === "servererror")
      return fail(500, "server_error", "Something went wrong.");
    seq += 1;
    return HttpResponse.json({
      success: true,
      message: "OK",
      errorType: null,
      data: {
        submitted: true,
        reference: `TKT-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`,
      },
    });
  }),
];

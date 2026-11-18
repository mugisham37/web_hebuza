// MSW handlers for C03 auth (contract: src/lib/api/schema.d.ts). Demo rules:
// OTP / 2FA code 123456 passes; password "locked" → 423 lockout; "slowdown" → 429; reset token "bad" → 400;
// claim code HBZ-WMVX19 + any valid phone passes. Login: a client persona's email (or DEMO_PHONE) + DEMO_PASSWORD.
// The session (persona) starts only after OTP for new or unverified accounts (P0-AUTH-1).
import { http, HttpResponse, delay } from "msw";
import { PERSONAS, currentPersona, setPersona } from "./personas";

const ok = <T>(data: T, message = "OK") =>
  HttpResponse.json({ success: true, message, errorType: null, data });
const fail = (status: number, errorType: string, message: string) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null },
    { status },
  );
export const DEMO_PASSWORD = "Demo-pass-1"; // mock-only credential
export const DEMO_PHONE = "+250788123456";
let pendingOtp: string | null = null; // persona that gets a session once the OTP passes

/** 403 `unverified` for money / submit / download calls from an account that hasn't done its OTP (F-IAM-02). */
export const unverifiedGate = () =>
  currentPersona()?.key === "unverified"
    ? fail(403, "unverified", "Verify your account first.")
    : undefined;

const mask = (s: string) => s.replace(/^(.{2}).*(@.*|.{3})$/, "$1•••$2");

const session = (name: string, email: string, verified: boolean, userId = "mock-client") => ({
  session: {
    userId,
    name,
    email,
    phone: null,
    role: "client",
    isEmailVerified: verified,
    language: "rw",
    createdAt: new Date().toISOString(),
    expiresAt: null,
  },
  maskedEmail: mask(email),
});

export const handlers = [
  // Unverified persona: same session shape as handlers.ts but isEmailVerified false; everyone else passes through.
  http.get("/api/auth/session", () => {
    const p = currentPersona();
    if (p?.key !== "unverified") return;
    return ok({ session: { ...session(p.name, p.email, false, `mock-${p.key}`).session, roles: p.roles } });
  }),
  http.delete("/api/auth/session", () => {
    setPersona(null); // mock session ends with the call; handlers.ts answers
  }),
  http.post("/api/auth/signup", async ({ request }) => {
    await delay(400);
    const b = (await request.json()) as { name: string; identifier: string };
    if (b.identifier.includes("taken"))
      return fail(409, "conflict", "An account already exists.");
    pendingOtp = "client";
    return ok(
      session(
        b.name,
        b.identifier.includes("@") ? b.identifier : "client@example.test",
        false,
      ),
    );
  }),
  http.post("/api/auth/login", async ({ request }) => {
    await delay(400);
    const b = (await request.json()) as {
      identifier: string;
      password: string;
    };
    if (b.password === "locked")
      return fail(423, "locked", "Too many attempts. Try again in 15 minutes.");
    if (b.password === "slowdown")
      return fail(429, "rate_limited", "Too many requests.");
    const id = b.identifier.trim().toLowerCase();
    const p = PERSONAS.find(
      (x) => x.roles.includes("client") && (x.email === id || (x.key === "client" && id === DEMO_PHONE)),
    );
    if (!p || b.password !== DEMO_PASSWORD)
      return fail(
        401,
        "unauthorized",
        "Phone, email or password is incorrect. 2 tries left.",
      );
    const verified = p.key !== "unverified";
    if (verified) setPersona(p.key);
    else pendingOtp = p.key;
    return ok(session(p.name, p.email, verified, `mock-${p.key}`));
  }),
  http.post("/api/auth/verify-otp", async ({ request }) => {
    await delay(300);
    const { code } = (await request.json()) as { code: string };
    if (code !== "123456")
      return fail(400, "invalid_code", "That code didn't match. 2 tries left.");
    const k = pendingOtp ?? currentPersona()?.key ?? "client";
    setPersona(k === "unverified" ? "client" : k); // shortcut: verifying turns the demo "unverified" persona into "client", until personas carry a verified flag
    pendingOtp = null;
    return ok({ verified: true });
  }),
  http.post("/api/auth/resend-otp", async () => {
    await delay(300);
    return ok({ verified: false });
  }),
  http.post("/api/auth/forgot-password", async ({ request }) => {
    await delay(300);
    const b = (await request.json()) as { identifier: string };
    return ok({ maskedEmail: mask(b.identifier) });
  }),
  http.post("/api/auth/reset-password", async ({ request }) => {
    await delay(300);
    const b = (await request.json()) as { token: string };
    return b.token === "bad"
      ? fail(400, "invalid_token", "This reset link is invalid or has expired.")
      : ok({ verified: true });
  }),
  http.post("/api/applications/claim", async ({ request }) => {
    await delay(300);
    if (!currentPersona()) return fail(401, "unauthorized", "Not signed in.");
    const b = (await request.json()) as { code: string };
    return b.code === "HBZ-WMVX19"
      ? ok({ claimed: true })
      : fail(404, "not_found", "Not found.");
  }),
  // MSW-only until the server ships MFA (F-IAM-05, Stage 3).
  http.post("/api/auth/mfa/verify", async ({ request }) => {
    await delay(300);
    const b = (await request.json()) as { code: string; backup: boolean };
    return (
      b.backup ? /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(b.code) : b.code === "123456"
    )
      ? ok({ verified: true })
      : fail(400, "invalid_code", "Wrong code.");
  }),
];

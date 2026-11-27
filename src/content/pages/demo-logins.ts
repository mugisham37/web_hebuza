import type { AuthRole } from "@/content/pages/auth-roles";

// "Use demo account" when public-settings.demoLogins is on (local dev, or System → Settings → Security → Demo sign-in).
// Sign-in roles only; the system admin persona holds every workspace. Mirrors server/src/db/seed/auth.ts personas.
const STAFF = "Demo-pass-staff-1!";
export const DEMO_LOGINS: Partial<Record<AuthRole, { email: string; password: string }>> = {
  client: { email: "client@example.test", password: "Demo-pass-1" },
  agent: { email: "eric.habimana@hebuza.example", password: STAFF },
  work: { email: "jean-paul.nkurunziza@ingabo.example", password: STAFF },
  partners: { email: "pm@example.test", password: STAFF },
  system: { email: "innocent.kayitare@hebuza.example", password: STAFF },
};

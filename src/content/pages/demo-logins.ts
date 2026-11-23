import type { AuthRole } from "@/content/pages/auth-roles";

// Staging-only "Use demo account" (public-settings.demoLogins). Mirrors server/src/db/seed/auth.ts personas.
const STAFF = "Demo-pass-staff-1!";
export const DEMO_LOGINS: Record<AuthRole, { email: string; password: string }> = {
  client: { email: "client@example.test", password: "Demo-pass-1" },
  agent: { email: "eric.habimana@hebuza.example", password: STAFF },
  work: { email: "jean-paul.nkurunziza@ingabo.example", password: STAFF },
  ops: { email: "diane.mukamana@hebuza.example", password: STAFF },
  finance: { email: "patrick.niyonzima@hebuza.example", password: STAFF },
  marketing: { email: "grace.mutesi@hebuza.example", password: STAFF },
  procurement: { email: "josiane.uwera@hebuza.example", password: STAFF },
  partners: { email: "pm@example.test", password: STAFF },
  exec: { email: "alice.mutoni@hebuza.example", password: STAFF },
  system: { email: "innocent.kayitare@hebuza.example", password: STAFF },
};

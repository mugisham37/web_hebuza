// Dev-only personas for MSW mode. Anonymised (F-PRV-06): no real names, IDs, or phone numbers.
import type { Role } from "@/shared/auth/roles";

export type Persona = { key: string; name: string; email: string; roles: Role[] };

export const PERSONAS: Persona[] = [
  { key: "client", name: "Demo Client", email: "client@example.test", roles: ["client"] },
  { key: "unverified", name: "Demo New Client", email: "new@example.test", roles: ["client"] }, // F-IAM-02: OTP not done yet
  { key: "agent", name: "Eric Habimana", email: "eric.habimana@hebuza.example", roles: ["staff:agent"] },
  { key: "ext", name: "Jean-Paul Nkurunziza", email: "jean-paul.nkurunziza@ingabo.example", roles: ["ext:agent"] }, // Stage 8 PE-08, firm admin (fictional firm)
  { key: "sm", name: "Diane Mukamana", email: "diane.mukamana@hebuza.example", roles: ["staff:service_manager"] },
  { key: "finance", name: "Patrick Niyonzima", email: "patrick.niyonzima@hebuza.example", roles: ["staff:finance"] },
  { key: "finance2", name: "Solange Mukeshimana", email: "solange.mukeshimana@hebuza.example", roles: ["staff:finance"] }, // Stage 5 checker

  { key: "marketing", name: "Grace Mutesi", email: "grace.mutesi@hebuza.example", roles: ["staff:marketing"] }, // Stage 10 main actor (≠ agent Grace Uwimana),
  { key: "procurement", name: "Josiane Uwera", email: "josiane.uwera@hebuza.example", roles: ["staff:procurement"] }, // Stage 12 main actor
  { key: "partners", name: "Demo Partner Manager", email: "pm@example.test", roles: ["staff:partner_manager"] },
  { key: "exec", name: "Alice Mutoni", email: "alice.mutoni@hebuza.example", roles: ["staff:executive", "staff:service_manager"] },
  { key: "sysadmin", name: "Innocent Kayitare", email: "innocent.kayitare@hebuza.example", roles: ["staff:sysadmin"] }, // Stage 6 main actor
  { key: "sysadmin2", name: "Yvonne Uwamahoro", email: "yvonne.uwamahoro@hebuza.example", roles: ["staff:sysadmin"] }, // Stage 6 second approver
  { key: "field", name: "Emmanuel Mugabo", email: "emmanuel.mugabo@hebuza.example", roles: ["staff:agent"] }, // Stage 9 field agent (is_field_agent)
  { key: "client-b", name: "Demo Client B", email: "client-b@example.test", roles: ["client"] }, // Stage 6 non-owner checks
  { key: "ext-member", name: "Chantal Mukamana", email: "chantal.mukamana@ingabo.example", roles: ["ext:agent"] }, // Stage 8 firm member
];

const KEY = "posiba.mockPersona";
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export function currentPersona(): Persona | null {
  try { return PERSONAS.find((p) => p.key === localStorage.getItem(KEY)) ?? null; } catch { return null; }
}

/** Sets an UNSIGNED fake access cookie so proxy.ts routing works in mock mode. Never valid against the real API. */
export function setPersona(key: string | null) {
  const p = PERSONAS.find((x) => x.key === key);
  if (!p) {
    localStorage.removeItem(KEY);
    document.cookie = "hebuza_access=; path=/; max-age=0";
    return;
  }
  localStorage.setItem(KEY, p.key);
  const jwt = `${b64({ alg: "none" })}.${b64({ sub: `mock-${p.key}`, roles: p.roles, ...(p.key !== "client" && { mfa_enrolled: true }) })}.mock`;
  document.cookie = `hebuza_access=${jwt}; path=/; max-age=86400; samesite=lax`;
}

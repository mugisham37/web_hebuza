// Verifies the access JWT with the API's EdDSA public key (same iss/aud as core/auth/tokens.ts). Without JWT_PUBLIC_KEY
// (dummy-data mode) it only decodes. Invalid/expired → null (signed out). Used by the proxy and server-rendered guides.
import { importSPKI, jwtVerify, decodeJwt, type JWTPayload } from "jose";
import { normalizeRoles, type Role } from "@/shared/auth/roles";

export const ACCESS_COOKIE = "hebuza_access";
let pub: ReturnType<typeof importSPKI> | undefined;
export async function accessClaims(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null;
  const pem = process.env.JWT_PUBLIC_KEY;
  try {
    if (!pem) return decodeJwt(token);
    pub ??= importSPKI(pem.replace(/\\n/g, "\n"), "EdDSA");
    return (await jwtVerify(token, await pub, { issuer: "hebuza", audience: "hebuza-api", algorithms: ["EdDSA"] })).payload;
  } catch { return null; }
}
/** Verified roles from the access cookie value ([] when signed out or invalid). */
export const rolesFromToken = async (token: string | undefined): Promise<Role[]> => {
  const c = await accessClaims(token);
  return c ? normalizeRoles(c as Parameters<typeof normalizeRoles>[0]) : [];
};

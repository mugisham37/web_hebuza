/** One audit-trail entry as the API returns it. */
export type AuditEvent = {
  id: string; at: string; actor: string; action: string;
  entity: { kind: string; id: string };
  before?: unknown; after?: unknown; reason?: string; ip: string;
};

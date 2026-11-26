import { cookies } from "next/headers";
import type { Locale } from "@/shared/i18n/config";
import type { Workspace } from "@/shared/auth/roles";
import { ACCESS_COOKIE, rolesFromToken } from "@/lib/auth/claims";
import { guidesFor } from "@/content/guides/workspaces";
import { WorkspaceGuides } from "@/components/organisms/site/workspace-guides";

/** Server part of a dashboard's Guides page: verifies the access cookie and sends only the sets this person may read. */
export async function WorkspaceGuidesPage({ locale, workspace }: { locale: Locale; workspace: Workspace }) {
  const roles = await rolesFromToken((await cookies()).get(ACCESS_COOKIE)?.value);
  return <WorkspaceGuides sets={guidesFor(roles, locale)} current={workspace} />;
}

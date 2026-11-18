import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { ClientChrome } from "@/components/organisms/layout/client-chrome";
import { LazyAssistantLauncher } from "@/components/organisms/booking/launcher-lazy";

// Shared shell (sidebar, top bar, bell, palette) + client extras. Pages under this group are slots for later units.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell workspace="client">
      <ClientChrome>{children}</ClientChrome>
      <LazyAssistantLauncher context="portal" />
    </WorkspaceShell>
  );
}

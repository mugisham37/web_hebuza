import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { OpsProvider } from "@/components/organisms/layout/ops-shell";

// Service Manager console (Stage 3). OpsProvider feeds live badges, palette sources, bell drawer, shortcuts and the phone tab bar.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OpsProvider>
      <WorkspaceShell workspace="ops">{children}</WorkspaceShell>
    </OpsProvider>
  );
}

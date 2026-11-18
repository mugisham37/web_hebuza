import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { AgentProvider } from "@/components/organisms/layout/agent-shell";
import { WorkGate } from "@/components/organisms/agent/work-gate";
import { WorkShellExtras } from "@/components/organisms/layout/work-shell";

// External Agent workspace (Stage 8 §0.3): the Stage 4 agent workspace mounted at /work with external limits.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <WorkShellExtras>
      <WorkspaceShell workspace="work">
        <WorkGate>{children}</WorkGate>
      </WorkspaceShell>
    </WorkShellExtras>
  );
}

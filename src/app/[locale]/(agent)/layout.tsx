import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { AgentProvider } from "@/components/organisms/layout/agent-shell";
import { OnboardingGate } from "@/components/organisms/agent/gate";

// Internal Agent workspace (Stage 4). AgentProvider feeds badges, duty pill, banner, bell, palette and the phone tab bar.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AgentProvider>
      <OnboardingGate />
      <WorkspaceShell workspace="agent">{children}</WorkspaceShell>
    </AgentProvider>
  );
}

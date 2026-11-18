import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { FinanceGate, FinanceProvider } from "@/components/organisms/layout/finance-shell";

// Finance Officer workspace (Stage 5). FinanceProvider feeds badges, approvals tray, bell, banner, palette and the phone tab bar.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <FinanceProvider>
      <WorkspaceShell workspace="finance"><FinanceGate>{children}</FinanceGate></WorkspaceShell>
    </FinanceProvider>
  );
}

import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { ProcurementGate, ProcurementProvider } from "@/components/organisms/layout/procurement-shell";

// Procurement & Administration Officer workspace (Stage 12). The provider feeds badges, ⌘K, bell, banner and the phone tab bar.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProcurementProvider>
      <WorkspaceShell workspace="procurement"><ProcurementGate>{children}</ProcurementGate></WorkspaceShell>
    </ProcurementProvider>
  );
}

import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { MarketingGate, MarketingProvider } from "@/components/organisms/layout/marketing-shell";

// Marketing Officer workspace (Stage 10). MarketingProvider feeds badges, palette, bell, banner and the phone tab bar.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingProvider>
      <WorkspaceShell workspace="marketing"><MarketingGate>{children}</MarketingGate></WorkspaceShell>
    </MarketingProvider>
  );
}

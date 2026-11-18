import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";
import { SystemProvider } from "@/components/organisms/layout/system-shell";

// System Administrator workspace (Stage 6). SystemProvider feeds badges, ⌘K sources, env pill, alerts drawer,
// banner stack (break-glass → impersonation → maintenance → offline), G-chords and the phone tab bar.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SystemProvider>
      <WorkspaceShell workspace="system">{children}</WorkspaceShell>
    </SystemProvider>
  );
}

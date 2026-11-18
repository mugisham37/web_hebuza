import { FlowShell } from "@/components/organisms/layout/flow-shell";

// Focused layout for /apply and /pay: no workspace sidebar, just the brand, language and the task.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FlowShell>{children}</FlowShell>;
}

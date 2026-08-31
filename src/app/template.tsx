import { AppShell } from "@/components/shell/app-shell";

export default function Template({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

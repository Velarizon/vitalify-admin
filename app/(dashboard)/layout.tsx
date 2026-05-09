import { DashboardShell } from '@/components/layout/dashboard-shell'

export const runtime = 'edge'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}

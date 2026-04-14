// app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/shared/metric-card'
import { getDashboardData } from '@/lib/supabase/actions/dashboard'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export default function DashboardPage() {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null)

  useEffect(() => {
    if (!userData || !selectedLocation) return
    getDashboardData(userData.company.id, selectedLocation.location.id).then(setData)
  }, [userData, selectedLocation])

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard title="Clientes activos" value={data.totalClients} />
        <MetricCard title="Ingresos del mes" value={fmt(data.monthlyRevenue)} className="text-emerald-600" />
        <MetricCard title="Cumpleaños hoy" value={data.todayBirthdays.length} />
      </div>
      {data.todayBirthdays.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {data.todayBirthdays.map((c, i) => (
            <div key={i}>🎂 {c.name} {c.last_name}</div>
          ))}
        </div>
      )}
    </div>
  )
}

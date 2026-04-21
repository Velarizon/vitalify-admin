// app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/shared/metric-card'
import { getDashboardData } from '@/lib/supabase/actions/dashboard'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Cake, Activity, TrendingUp, Zap, Calendar, ArrowUpRight, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* HUD Header */}
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-heading font-black uppercase italic tracking-tighter text-foreground">Centro de Mando</h1>
          </div>
          <p className="text-hud tracking-[0.3em]">Monitoreo de Telemetría Operativa</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Ciclo Actual</p>
          <p className="text-sm font-mono text-primary font-bold">{new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
        </div>
      </div>

      {/* Primary KPIs - Monolithic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Miembros Activos" 
          value={data.totalClients} 
          trend={{ value: 12.4, label: 'CRECIMIENTO', isPositive: true }}
          className="bg-primary/5 border-primary/10 shadow-[0_0_20px_rgba(0,255,157,0.02)]"
        />
        <MetricCard 
          title="Ingresos Netos" 
          value={fmt(data.monthlyRevenue)} 
          trend={{ value: 5.2, label: 'VS META', isPositive: true }}
        />
        <MetricCard
          title="Alertas Vencimiento"
          value={data.expirationsSoon}
          subtitle="En los próximos 30 días"
          className={data.expirationsSoon > 10 ? 'border-destructive/20 shadow-[0_0_20px_rgba(255,69,58,0.02)]' : ''}
        />
        <MetricCard 
          title="Eventos Hoy" 
          value={data.todayBirthdays.length} 
          subtitle="Cumpleaños detectados"
          className="border-white/5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Heatmap Area (Placeholder for check-ins) */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Flujo de Tráfico Semanal</h2>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn("h-2 w-2 rounded-sm", i === 3 ? "bg-primary" : "bg-primary/20")} />
              ))}
            </div>
          </div>
          
          <div className="h-40 flex items-end gap-1 px-2">
            {Array.from({ length: 24 }).map((_, i) => {
              const height = [40, 30, 20, 15, 10, 5, 5, 15, 45, 70, 85, 90, 80, 65, 55, 60, 75, 95, 100, 85, 60, 40, 30, 20][i];
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-primary/10 hover:bg-primary/40 transition-all rounded-t-sm relative group"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-[8px] px-1.5 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {i}:00 - {height}%
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest px-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* Sidebar Panel: Birthdays & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-xl p-6 space-y-4 border-l-4 border-l-primary">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Cake className="h-4 w-4 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Protocolo Cumpleaños</h2>
            </div>
            
            {data.todayBirthdays.length > 0 ? (
              <div className="space-y-4">
                {data.todayBirthdays.map((c, i) => (
                  <div key={i} className="flex items-center justify-between group bg-white/5 p-3 rounded-lg border border-white/5 hover:border-primary/20 transition-all">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black uppercase text-foreground/90 group-hover:text-primary transition-colors">
                        {c.name} {c.last_name}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono">
                        DETECTADO_HOY
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Zap className="h-8 w-8 text-white/5 mx-auto" />
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">No se detectan eventos hoy</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-primary/10 transition-all cursor-pointer">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-[8px] font-black uppercase tracking-widest">Agenda</span>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-white/10 transition-all cursor-pointer">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-[8px] font-black uppercase tracking-widest">Accesos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

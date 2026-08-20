import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, TrendingUp, Users, BarChart3, UserX } from 'lucide-react'

const reports = [
  { title: 'Pagos Mensuales', description: 'Pagos recibidos por mes', href: '/reports/monthly-payments', icon: DollarSign, enabled: true },
  { title: 'Sin Renovar (4+ meses)', description: 'Clientes con membresía vencida hace 4 meses o más', href: '/reports/overdue-renewals', icon: UserX, enabled: true },
  { title: 'Altas de Clientes', description: 'Clientes dados de alta en terminal', href: '#', icon: Users, enabled: false },
  { title: 'Ingresos por Plan', description: 'Análisis por tipo de membresía', href: '#', icon: TrendingUp, enabled: false },
  { title: 'Reporte General', description: 'Vista general de métricas', href: '#', icon: BarChart3, enabled: false },
]

export default function ReportsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Reportes</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {reports.map(r => {
          const Icon = r.icon
          return (
            <Card key={r.href} className={r.enabled ? '' : 'opacity-50'}>
              <CardContent className="p-4">
                {r.enabled ? (
                  <Link href={r.href} className="block space-y-1 hover:text-primary">
                    <Icon size={18} className="text-primary" />
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </Link>
                ) : (
                  <div className="space-y-1">
                    <Icon size={18} className="text-muted-foreground" />
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                    <span className="text-xs text-[#FF9F0A]">Próximamente</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

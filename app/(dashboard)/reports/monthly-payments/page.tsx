'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPaymentsByMonth } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'
import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react'

type Payment = Awaited<ReturnType<typeof getPaymentsByMonth>>[number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const formatDateTime = (isoString: string | null) => {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const paymentMethodConfig: Record<string, { label: string; icon: any }> = {
  cash: { label: 'Efectivo', icon: Banknote },
  card: { label: 'Tarjeta', icon: CreditCard },
  transfer: { label: 'Transferencia', icon: ArrowLeftRight },
}

const columns: ColumnDef<Payment>[] = [
  {
    header: 'Cliente',
    cell: ({ row }) => {
      const c = (row.original.subscriptions as any)?.clients
      return c ? `${c.name} ${c.last_name}` : '—'
    },
  },
  {
    header: 'Plan',
    cell: ({ row }) => (row.original.subscriptions as any)?.plans?.name ?? '—',
  },
  {
    header: 'Monto',
    cell: ({ row }) => (row.original.amount != null ? fmt(row.original.amount) : '—'),
  },
  {
    accessorKey: 'payment_method',
    header: 'Método',
    cell: ({ row }) => {
      const method = row.original.payment_method
      const config = paymentMethodConfig[method] || { label: method, icon: null }
      const Icon = config.icon
      return (
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-muted-foreground" />}
          <span>{config.label}</span>
        </div>
      )
    },
  },
  {
    header: 'Tipo',
    accessorKey: 'payment_type',
    cell: ({ row }) => {
      const type = row.original.payment_type
      if (!type) return '—'
      if (type === 'new_subscription') {
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Nueva</Badge>
      }
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Renovación</Badge>
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha y hora',
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
  {
    header: 'Responsable',
    cell: ({ row }) => {
      const user = (row.original as any).user_data
      return user ? `${user.name} ${user.last_name}` : '—'
    },
  },
]

export default function MonthlyPaymentsPage() {
  const { selectedLocation } = usePreferencesStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    if (!selectedLocation) return
    getPaymentsByMonth(selectedLocation.location.id, year, month).then(setPayments)
  }, [selectedLocation, year, month])

  const total = payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)
  const cash = payments
    .filter((payment) => payment.payment_method === 'cash')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0)
  const card = payments
    .filter((payment) => payment.payment_method === 'card')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0)
  const other = total - cash - card

  const newSubscriptions = payments
    .filter((payment) => payment.payment_type === 'new_subscription')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

  const renewals = payments
    .filter((payment) => payment.payment_type === 'renewal')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

  const classified = newSubscriptions + renewals
  const retentionRate = classified > 0
    ? ((renewals / classified) * 100).toFixed(1)
    : '0.0'

  const exportCSV = () => {
    const header = 'Cliente,Plan,Monto,Método,Tipo,Fecha y hora,Responsable\n'
    const rows = payments
      .map((payment) => {
        const client = (payment.subscriptions as any)?.clients
        const name = client ? `${client.name} ${client.last_name}` : ''
        const plan = (payment.subscriptions as any)?.plans?.name ?? ''
        const method = paymentMethodConfig[payment.payment_method]?.label || payment.payment_method
        const type = payment.payment_type === 'new_subscription' ? 'Nueva' : payment.payment_type === 'renewal' ? 'Renovación' : ''
        const date = formatDateTime(payment.created_at)
        const user = (payment as any).user_data
        const responsible = user ? `${user.name} ${user.last_name}` : ''
        return `"${name}","${plan}",${payment.amount ?? 0},"${method}","${type}","${date}","${responsible}"`
      })
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `pagos-${year}-${month}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-lg font-semibold">Pagos Mensuales</h1>
        <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue>{months[month - 1]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((label, index) => (
              <SelectItem key={index + 1} value={String(index + 1)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear(), now.getFullYear() - 1].map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={exportCSV} disabled={payments.length === 0}>
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <MetricCard title="Inscripciones Nuevas" value={fmt(newSubscriptions)} />
        <MetricCard title="Renovaciones" value={fmt(renewals)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total ingresos" value={fmt(total)} />
        <MetricCard title="Efectivo" value={fmt(cash)} />
        <MetricCard title="Tarjeta" value={fmt(card)} />
        <MetricCard title="Otros" value={fmt(other)} />
      </div>

      {classified > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Tasa de renovación: {retentionRate}%
        </p>
      )}

      <DataTable columns={columns} data={payments} />
    </div>
  )
}

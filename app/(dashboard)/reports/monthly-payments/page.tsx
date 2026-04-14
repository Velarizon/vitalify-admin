'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPaymentsByMonth } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'

type Payment = Awaited<ReturnType<typeof getPaymentsByMonth>>[number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

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
  { accessorKey: 'payment_method', header: 'Método' },
  {
    accessorKey: 'payment_date',
    header: 'Fecha',
    cell: ({ row }) => row.original.payment_date?.split('T')[0] ?? '—',
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

  const exportCSV = () => {
    const header = 'Cliente,Plan,Monto,Método,Fecha\n'
    const rows = payments
      .map((payment) => {
        const client = (payment.subscriptions as any)?.clients
        const name = client ? `${client.name} ${client.last_name}` : ''
        const plan = (payment.subscriptions as any)?.plans?.name ?? ''
        return `"${name}","${plan}",${payment.amount ?? 0},"${payment.payment_method}","${payment.payment_date?.split('T')[0] ?? ''}"`
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
            <SelectValue />
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total ingresos" value={fmt(total)} />
        <MetricCard title="Efectivo" value={fmt(cash)} />
        <MetricCard title="Tarjeta" value={fmt(card)} />
        <MetricCard title="Otros" value={fmt(other)} />
      </div>

      <DataTable columns={columns} data={payments} />
    </div>
  )
}

// app/(dashboard)/reports/monthly-payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { getPaymentsByMonth } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    cell: ({ row }) => row.original.amount ? fmt(row.original.amount) : '—',
  },
  { accessorKey: 'payment_method', header: 'Método' },
  { accessorKey: 'payment_date', header: 'Fecha', cell: ({ row }) => row.original.payment_date?.split('T')[0] ?? '—' },
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

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0)

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold flex-1">Pagos Mensuales</h1>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear(), now.getFullYear() - 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard title="Total del mes" value={fmt(total)} />
        <MetricCard title="Número de pagos" value={payments.length} />
      </div>
      <DataTable columns={columns} data={payments} />
    </div>
  )
}

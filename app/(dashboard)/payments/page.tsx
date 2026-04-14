// app/(dashboard)/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getPayments } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/shared/table-skeleton'

type Payment = Awaited<ReturnType<typeof getPayments>>[number]

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
}

const columns: ColumnDef<Payment>[] = [
  { accessorKey: 'id', header: 'ID', size: 50 },
  {
    header: 'Cliente',
    cell: ({ row }) => {
      const c = (row.original.subscriptions as any)?.clients
      return c ? `${c.name} ${c.last_name}` : '—'
    },
  },
  {
    header: 'Monto',
    cell: ({ row }) => row.original.amount
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.original.amount)
      : '—',
  },
  {
    header: 'Método',
    cell: ({ row }) => {
      const m = row.original.payment_method ?? ''
      return <Badge variant="outline">{methodLabel[m] ?? m}</Badge>
    },
  },
  { accessorKey: 'payment_date', header: 'Fecha', cell: ({ row }) => row.original.payment_date?.split('T')[0] ?? '—' },
  {
    header: 'Turno',
    cell: ({ row }) => (row.original as any).shift_id ?? '—',
  },
]

export default function PaymentsPage() {
  const { selectedLocation } = usePreferencesStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedLocation) return
    getPayments(selectedLocation.location.id).then(d => { setPayments(d); setLoading(false) })
  }, [selectedLocation])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Pagos</h1>
      {loading ? <TableSkeleton />
        : <DataTable columns={columns} data={payments} searchPlaceholder="Buscar pago..." />}
    </div>
  )
}

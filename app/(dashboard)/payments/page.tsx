// app/(dashboard)/payments/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getPaymentsPage } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

type Payment = Awaited<ReturnType<typeof getPaymentsPage>>['data'][number]

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
}

const columns: ColumnDef<Payment>[] = [
  { accessorKey: 'id', header: 'ID', size: 50 },
  {
    header: 'Cliente',
    cell: ({ row }) => {
      const c = row.original.subscriptions?.clients
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
    cell: ({ row }) => row.original.shift_id ?? '—',
  },
]

export default function PaymentsPage() {
  const { selectedLocation } = usePreferencesStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const loadPayments = useCallback(async () => {
    if (!selectedLocation) return
    setLoading(true)
    const result = await getPaymentsPage(selectedLocation.location.id, {
      page: pageIndex + 1,
      pageSize,
      search: debouncedSearch,
    })
    setPayments(result.data)
    setTotalRows(result.count)
    setLoading(false)
  }, [debouncedSearch, pageIndex, pageSize, selectedLocation])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPayments()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadPayments])

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Pagos</h1>
      {loading ? <TableSkeleton />
        : (
          <DataTable
            columns={columns}
            data={payments}
            searchPlaceholder="Buscar pago..."
            pagination={{
              pageIndex,
              pageSize,
              pageCount,
              totalRows,
              onPageChange: (nextPageIndex) => setPageIndex(Math.max(0, Math.min(nextPageIndex, pageCount - 1))),
              onPageSizeChange: (nextPageSize) => {
                setPageIndex(0)
                setPageSize(nextPageSize)
              },
            }}
            search={{
              value: search,
              onChange: (value) => {
                setPageIndex(0)
                setSearch(value)
              },
            }}
          />
        )}
    </div>
  )
}

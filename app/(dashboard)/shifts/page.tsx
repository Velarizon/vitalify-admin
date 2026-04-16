// app/(dashboard)/shifts/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getShiftsPage, openShift, getActiveShift } from '@/lib/supabase/actions/shifts'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

type Shift = Awaited<ReturnType<typeof getShiftsPage>>['data'][number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const columns: ColumnDef<Shift>[] = [
  { accessorKey: 'id', header: 'ID', size: 50 },
  { accessorKey: 'opened_at', header: 'Apertura', cell: ({ row }) => row.original.opened_at?.replace('T', ' ').slice(0, 16) },
  { accessorKey: 'closed_at', header: 'Cierre', cell: ({ row }) =>
    row.original.closed_at ? row.original.closed_at.replace('T', ' ').slice(0, 16) : <Badge className="bg-primary">Activo</Badge> },
  { accessorKey: 'cash_amount', header: 'Efectivo', cell: ({ row }) => fmt(row.original.cash_amount ?? 0) },
  { accessorKey: 'card_amount', header: 'Tarjeta', cell: ({ row }) => fmt(row.original.card_amount ?? 0) },
  { accessorKey: 'total_amount', header: 'Total', cell: ({ row }) => fmt(row.original.total_amount ?? 0) },
  {
    header: '',
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/shifts/${row.original.id}`}>
        <Button variant="ghost" size="sm" className="h-6 text-xs">Ver detalle</Button>
      </Link>
    ),
  },
]

export default function ShiftsPage() {
  const { selectedLocation } = usePreferencesStore()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [hasActive, setHasActive] = useState(false)
  const [opening, setOpening] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const load = useCallback(async () => {
    if (!selectedLocation) return
    const result = await getShiftsPage(selectedLocation.location.id, {
      page: pageIndex + 1,
      pageSize,
      search: debouncedSearch,
    })
    setShifts(result.data)
    setTotalRows(result.count)
    const active = await getActiveShift(selectedLocation.location.id)
    setHasActive(!!active)
  }, [debouncedSearch, pageIndex, pageSize, selectedLocation])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))

  const handleOpen = async () => {
    if (!selectedLocation) return
    setOpening(true)
    const { error } = await openShift(selectedLocation.location.id)
    if (error) toast.error(error)
    else toast.success('Turno abierto')
    await load()
    setOpening(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Turnos</h1>
        {!hasActive && (
          <Button size="sm" className="h-7 text-xs" onClick={handleOpen} disabled={opening}>
            {opening ? 'Abriendo...' : 'Abrir turno'}
          </Button>
        )}
        {hasActive && <Badge className="bg-primary">Turno activo</Badge>}
      </div>
      <DataTable
        columns={columns}
        data={shifts}
        searchPlaceholder="Buscar turno..."
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
    </div>
  )
}

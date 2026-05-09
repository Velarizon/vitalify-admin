// app/(dashboard)/shifts/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBrowserActiveShift, openBrowserShift } from '@/lib/supabase/browser-shifts'
import { getBrowserShiftsPage } from '@/lib/supabase/browser-catalogs'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { ArrowUpRight } from 'lucide-react'
import { formatHermosilloDateTime } from '@/lib/dates'

type Shift = Awaited<ReturnType<typeof getBrowserShiftsPage>>['data'][number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const columns: ColumnDef<Shift>[] = [
  { accessorKey: 'id', header: 'ID', size: 50 },
  {
    id: 'responsible',
    header: 'Responsable',
    cell: ({ row }) => {
      const responsible = row.original.responsible
      const name = responsible?.displayName ?? responsible?.email ?? '—'
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">{name}</span>
          {responsible?.email && responsible.displayName && (
            <span className="text-[10px] text-muted-foreground">{responsible.email}</span>
          )}
        </div>
      )
    },
  },
  { accessorKey: 'opened_at', header: 'Apertura', cell: ({ row }) => formatHermosilloDateTime(row.original.opened_at) },
  { accessorKey: 'closed_at', header: 'Cierre', cell: ({ row }) =>
    row.original.closed_at ? formatHermosilloDateTime(row.original.closed_at) : <Badge className="bg-primary">Activo</Badge> },
  { accessorKey: 'cash_amount', header: 'Efectivo', cell: ({ row }) => fmt(row.original.cash_amount ?? 0) },
  { accessorKey: 'card_amount', header: 'Tarjeta', cell: ({ row }) => fmt(row.original.card_amount ?? 0) },
  { accessorKey: 'total_amount', header: 'Total', cell: ({ row }) => fmt(row.original.total_amount ?? 0) },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link href={`/shifts/${row.original.id}`}>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-primary/30 bg-primary/5 px-3 text-[10px] font-black uppercase tracking-widest text-primary shadow-[0_0_14px_rgba(0,255,157,0.08)] transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_20px_rgba(0,255,157,0.16)]"
        >
          Detalle
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
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
    const result = await getBrowserShiftsPage(selectedLocation.location.id, {
      page: pageIndex + 1,
      pageSize,
      search: debouncedSearch,
    })
    setShifts(result.data)
    setTotalRows(result.count)
    const active = await getBrowserActiveShift(selectedLocation.location.id)
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
    const { error } = await openBrowserShift(selectedLocation.location.id)
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

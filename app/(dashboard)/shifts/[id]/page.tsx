// app/(dashboard)/shifts/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getShiftDetail, closeShift, getActiveShift } from '@/lib/supabase/actions/shifts'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'

type Detail = Awaited<ReturnType<typeof getShiftDetail>>
type Payment = Detail['payments'][number]

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
  { header: 'Monto', cell: ({ row }) => fmt(row.original.amount ?? 0) },
  { accessorKey: 'payment_method', header: 'Método' },
  { accessorKey: 'payment_date', header: 'Hora', cell: ({ row }) => row.original.payment_date?.slice(11, 16) ?? '—' },
]

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { selectedLocation } = usePreferencesStore()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [isMyActiveShift, setIsMyActiveShift] = useState(false)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState('')

  const load = async () => {
    const data = await getShiftDetail(Number(id))
    setDetail(data)
    if (selectedLocation) {
      const active = await getActiveShift(selectedLocation.location.id)
      setIsMyActiveShift(active?.id === Number(id))
    }
  }

  useEffect(() => { load() }, [id])

  const handleClose = async () => {
    setClosing(true)
    const { error } = await closeShift(Number(id), notes || undefined)
    if (error) { toast.error(error); setClosing(false); return }
    toast.success('Turno cerrado correctamente')
    router.push('/shifts')
  }

  if (!detail) return <p className="text-xs text-muted-foreground p-4">Cargando...</p>

  const { shift, payments } = detail
  const isOpen = !shift.closed_at

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold flex-1">Turno #{shift.id}</h1>
        {isOpen ? <Badge className="bg-emerald-600">Activo</Badge> : <Badge variant="outline">Cerrado</Badge>}
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>Apertura: {shift.opened_at?.replace('T', ' ').slice(0, 16)}</div>
        {shift.closed_at && <div>Cierre: {shift.closed_at.replace('T', ' ').slice(0, 16)}</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Efectivo" value={fmt(shift.cash_amount ?? 0)} />
        <MetricCard title="Tarjeta" value={fmt(shift.card_amount ?? 0)} />
        <MetricCard title="Otros" value={fmt(shift.other_amount ?? 0)} />
        <MetricCard title="Total" value={fmt(shift.total_amount ?? 0)} />
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Pagos del turno ({payments.length})</h2>
        <DataTable columns={columns} data={payments} />
      </div>

      {isMyActiveShift && (
        <div className="space-y-2 pt-2">
          <Separator />
          <p className="text-sm font-medium">Cerrar turno</p>
          <textarea
            className="w-full text-xs border rounded p-2 resize-none h-16 bg-background"
            placeholder="Notas opcionales..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <Button onClick={handleClose} disabled={closing} variant="destructive" size="sm" className="h-7 text-xs">
            {closing ? 'Cerrando...' : 'Confirmar cierre de turno'}
          </Button>
        </div>
      )}
    </div>
  )
}

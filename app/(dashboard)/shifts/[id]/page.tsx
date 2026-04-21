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
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { getShiftDetail, closeShift } from '@/lib/supabase/actions/shifts'
import { toast } from 'sonner'
import { Clock, CheckCircle } from 'lucide-react'

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
  { accessorKey: 'payment_date', header: 'Hora', cell: ({ row }) => row.original.payment_date?.slice(11, 16) ?? '—' },
]

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState('')

  const load = async () => {
    const data = await getShiftDetail(Number(id))
    setDetail(data)
  }

  useEffect(() => { load() }, [id])

  const handleClose = async () => {
    setClosing(true)
    const { error } = await closeShift(Number(id), notes || undefined)
    if (error) { toast.error(error); setClosing(false); return }
    toast.success('Turno cerrado correctamente')
    router.push('/shifts')
  }

  if (!detail) return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-pulse">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Separator />
      <TableSkeleton rows={3} columns={3} />
    </div>
  )

  const { shift, payments } = detail
  const isOpen = !shift.closed_at

  const newSubscriptions = payments
    .filter(p => p.payment_type === 'new_subscription')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const renewals = payments
    .filter(p => p.payment_type === 'renewal')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold flex-1">Turno #{shift.id}</h1>
        {isOpen ? <Badge className="bg-primary">Activo</Badge> : <Badge variant="outline">Cerrado</Badge>}
      </div>

      {/* Timeline */}
      <div className="relative flex items-center gap-4 py-4 px-6 glass-panel rounded-xl">
        {/* Apertura */}
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shadow-neon">
            <Clock size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Apertura</p>
            <p className="text-sm font-medium text-foreground">{shift.opened_at?.replace('T', ' ').slice(0, 16)}</p>
          </div>
        </div>

        {/* Connector line */}
        <div className="flex-1 h-px bg-gradient-to-r from-primary via-border to-border" />

        {/* Cierre */}
        {shift.closed_at ? (
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground text-right">Cierre</p>
              <p className="text-sm font-medium text-foreground text-right">{shift.closed_at.replace('T', ' ').slice(0, 16)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shadow-neon">
              <CheckCircle size={18} className="text-primary" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 text-right">Cierre</p>
              <p className="text-sm font-medium text-muted-foreground/40 text-right">En curso...</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-border/20 border-2 border-border/40 flex items-center justify-center">
              <Clock size={18} className="text-muted-foreground/40 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Efectivo" value={fmt(shift.cash_amount ?? 0)} />
        <MetricCard title="Tarjeta" value={fmt(shift.card_amount ?? 0)} />
        <MetricCard title="Otros" value={fmt(shift.other_amount ?? 0)} />
        <MetricCard title="Total" value={fmt(shift.total_amount ?? 0)} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <MetricCard title="Inscripciones Nuevas" value={fmt(newSubscriptions)} />
        <MetricCard title="Renovaciones" value={fmt(renewals)} />
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Pagos del turno ({payments.length})</h2>
        <DataTable columns={columns} data={payments} />
      </div>

      {detail.isMine && isOpen && (
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

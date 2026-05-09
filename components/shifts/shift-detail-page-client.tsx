// app/(dashboard)/shifts/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { getShiftDetail, closeShift } from '@/lib/supabase/actions/shifts'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, Clock, FileText, LockKeyhole, ReceiptText, UserRound } from 'lucide-react'
import { formatHermosilloDateTime, formatHermosilloTime } from '@/lib/dates'

type Detail = Awaited<ReturnType<typeof getShiftDetail>>
type Payment = Detail['payments'][number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const columns: ColumnDef<Payment>[] = [
  {
    id: 'client',
    header: 'Cliente',
    cell: ({ row }) => {
      const subscription = row.original.subscriptions as { clients?: { name?: string | null; last_name?: string | null } | null } | null
      const c = subscription?.clients
      return c ? `${c.name} ${c.last_name}` : '—'
    },
  },
  { id: 'amount', header: 'Monto', cell: ({ row }) => fmt(row.original.amount ?? 0) },
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
  { accessorKey: 'payment_date', header: 'Hora', cell: ({ row }) => formatHermosilloTime(row.original.payment_date) },
]

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [closing, setClosing] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    const data = await getShiftDetail(Number(id))
    setDetail(data)
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  const handleClose = async () => {
    setClosing(true)
    const { error } = await closeShift(Number(id), notes || undefined)
    if (error) { toast.error(error); setClosing(false); return }
    toast.success('Turno cerrado correctamente')
    setConfirmCloseOpen(false)
    window.dispatchEvent(new Event('vitalify:shift-changed'))
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
  const responsibleName = detail.responsible?.displayName ?? detail.responsible?.email ?? 'Responsable no disponible'

  const newSubscriptions = payments
    .filter(p => p.payment_type === 'new_subscription')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const renewals = payments
    .filter(p => p.payment_type === 'renewal')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const paymentTotals = payments.reduce(
    (totals, payment) => {
      const amount = payment.amount ?? 0
      if (payment.payment_method === 'cash') totals.cash += amount
      else if (payment.payment_method === 'card') totals.card += amount
      else totals.other += amount
      return totals
    },
    { cash: 0, card: 0, other: 0 }
  )
  const paymentTotal = paymentTotals.cash + paymentTotals.card + paymentTotals.other

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold flex-1">Turno #{shift.id}</h1>
        {isOpen ? <Badge className="bg-primary">Activo</Badge> : <Badge variant="outline">Cerrado</Badge>}
      </div>

      <div className="rounded-xl border border-border/70 bg-background/80 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsable del turno</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{responsibleName}</p>
            {detail.responsible?.email && detail.responsible.displayName && (
              <p className="text-xs text-muted-foreground">{detail.responsible.email}</p>
            )}
          </div>
        </div>
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
            <p className="text-sm font-medium text-foreground">{formatHermosilloDateTime(shift.opened_at)}</p>
          </div>
        </div>

        {/* Connector line */}
        <div className="flex-1 h-px bg-gradient-to-r from-primary via-border to-border" />

        {/* Cierre */}
        {shift.closed_at ? (
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground text-right">Cierre</p>
              <p className="text-sm font-medium text-foreground text-right">{formatHermosilloDateTime(shift.closed_at)}</p>
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
        <MetricCard title="Efectivo" value={fmt(isOpen ? paymentTotals.cash : shift.cash_amount ?? 0)} />
        <MetricCard title="Tarjeta" value={fmt(isOpen ? paymentTotals.card : shift.card_amount ?? 0)} />
        <MetricCard title="Otros" value={fmt(isOpen ? paymentTotals.other : shift.other_amount ?? 0)} />
        <MetricCard title="Total" value={fmt(isOpen ? paymentTotal : shift.total_amount ?? 0)} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <MetricCard title="Inscripciones Nuevas" value={fmt(newSubscriptions)} />
        <MetricCard title="Renovaciones" value={fmt(renewals)} />
      </div>

      {!isOpen && shift.notes && (
        <div className="rounded-xl border border-border/70 bg-background/80 p-4">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notas del cierre</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{shift.notes}</p>
            </div>
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Pagos del turno ({payments.length})</h2>
        <DataTable columns={columns} data={payments} />
      </div>

      {detail.isMine && isOpen && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 shadow-[inset_0_0_28px_rgba(255,0,64,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/10 text-destructive">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-foreground">Finalizar turno</p>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                  Al finalizar se calcula el corte del turno y se bloquea el registro de pagos en este turno.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setConfirmCloseOpen(true)}
              disabled={closing}
              variant="destructive"
              size="sm"
              className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
            >
              <ReceiptText className="h-3.5 w-3.5" />
              Finalizar turno
            </Button>
          </div>

          <textarea
            className="mt-4 h-20 w-full resize-none rounded-lg border border-border/70 bg-background/80 p-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50"
            placeholder="Notas opcionales para el corte..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      )}

      <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <DialogContent className="sm:max-w-md border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </span>
              Confirmar cierre
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vas a finalizar el turno #{shift.id}. Esta acción cerrará el corte con el total actual de {fmt(paymentTotal)}.
            </p>
            {notes.trim() && (
              <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nota a guardar</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">{notes.trim()}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-background/70 p-2 text-[10px]">
              <div>
                <span className="block uppercase tracking-widest text-muted-foreground">Pagos</span>
                <strong className="text-foreground">{payments.length}</strong>
              </div>
              <div>
                <span className="block uppercase tracking-widest text-muted-foreground">Nuevas</span>
                <strong className="text-foreground">{payments.filter(p => p.payment_type === 'new_subscription').length}</strong>
              </div>
              <div>
                <span className="block uppercase tracking-widest text-muted-foreground">Renov.</span>
                <strong className="text-foreground">{payments.filter(p => p.payment_type === 'renewal').length}</strong>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-transparent">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmCloseOpen(false)} disabled={closing}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleClose} disabled={closing}>
              {closing ? 'Finalizando...' : 'Sí, finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

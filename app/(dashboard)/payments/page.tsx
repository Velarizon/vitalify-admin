// app/(dashboard)/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getPayments } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { CreditCard, Banknote, Calendar, Hash, User, Activity } from 'lucide-react'

type Payment = Awaited<ReturnType<typeof getPayments>>[number]

const methodLabel: Record<string, { label: string, icon: any }> = {
  cash: { label: 'Efectivo', icon: Banknote },
  card: { label: 'Tarjeta', icon: CreditCard },
  transfer: { label: 'Transferencia', icon: Activity },
}

const columns: ColumnDef<Payment>[] = [
  { 
    accessorKey: 'id', 
    header: 'Folio',
    cell: ({ row }) => <span className="font-mono text-[10px] text-muted-foreground">#{row.original.id.toString().padStart(6, '0')}</span>
  },
  {
    header: 'Miembro',
    cell: ({ row }) => {
      const c = (row.original.subscriptions as any)?.clients
      return (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-xs font-bold text-foreground">{c ? `${c.name} ${c.last_name}` : 'SISTEMA'}</span>
        </div>
      )
    },
  },
  {
    header: 'Monto Transacción',
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0
      return (
        <div className="flex flex-col">
          <span className="text-sm font-heading font-bold text-primary italic">
            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">IVA Incluido</span>
        </div>
      )
    }
  },
  {
    header: 'Método de Pago',
    cell: ({ row }) => {
      const m = row.original.payment_method ?? 'other'
      const { label, icon: Icon } = methodLabel[m] ?? { label: m, icon: Activity }
      return (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-secondary/50 flex items-center justify-center border border-border/30">
            <Icon className="h-3 w-3 text-primary" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        </div>
      )
    },
  },
  { 
    accessorKey: 'payment_date', 
    header: 'Fecha Contable',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span className="text-[10px] font-mono tracking-tighter">{row.original.payment_date?.split('T')[0] ?? '—'}</span>
      </div>
    )
  },
  {
    header: 'Turno ID',
    cell: ({ row }) => {
      const shiftId = (row.original as any).shift_id
      return shiftId ? (
        <Badge variant="outline" className="text-[9px] font-mono border-primary/20 bg-primary/5 text-primary">
          SHIFT_{shiftId}
        </Badge>
      ) : <span className="text-muted-foreground/30 text-[10px]">N/A</span>
    },
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-heading font-bold tracking-tight">Registro de Pagos</h1>
          <p className="text-hud tracking-widest uppercase">Historial de Transacciones</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Total del Día</p>
            <p className="text-sm font-bold text-primary">MXN $0.00</p>
          </div>
          <div className="h-8 w-[1px] bg-border/40" />
          <Hash className="h-5 w-5 text-muted-foreground/20" />
        </div>
      </div>

      <div className="neon-card rounded-xl overflow-hidden">
        {loading ? <TableSkeleton />
          : <DataTable columns={columns} data={payments} searchPlaceholder="Filtrar por folio, miembro o método..." />}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  createBrowserVisitPayment,
  getBrowserDayVisitPrice,
} from '@/lib/supabase/browser-catalogs'
import { getBrowserActiveShift } from '@/lib/supabase/browser-shifts'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import { Banknote, CreditCard, ArrowLeftRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
]

export function ChargeVisitDialog({ open, onClose, onSuccess }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [loading, setLoading] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [visitPrice, setVisitPrice] = useState<number | null>(null)
  const [ticketNumber, setTicketNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')

  useEffect(() => {
    if (open && userData) {
      setLoadingPrice(true)
      getBrowserDayVisitPrice(userData.company.id)
        .then(setVisitPrice)
        .finally(() => setLoadingPrice(false))
    }
  }, [open, userData])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTicketNumber('')
      setPaymentMethod('cash')
      setVisitPrice(null)
    }
  }, [open])

  const handleCharge = async () => {
    if (!userData || !selectedLocation || !visitPrice) return
    const ticket = ticketNumber.trim()
    if (!ticket) return

    setLoading(true)
    const toastId = toast.loading('Procesando cobro...')

    try {
      const activeShift = await getBrowserActiveShift(selectedLocation.location.id)

      await createBrowserVisitPayment({
        amount: visitPrice,
        payment_method: paymentMethod,
        location_id: selectedLocation.location.id,
        ticket_number: ticket,
        shift_id: activeShift?.id ?? null,
      })

      if (!activeShift) {
        toast.warning('Cobro registrado, pero no hay un turno activo: no aparecerá en el corte de caja.', { id: toastId })
      } else {
        toast.success('Cobro de visita registrado exitosamente', { id: toastId })
      }
      onSuccess()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar el cobro', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  const canCharge = !loading && !loadingPrice && !!visitPrice && ticketNumber.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/40 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-foreground">Cobrar Visita</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">
            Pase de un día — no se registra como miembro
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {!loadingPrice && !visitPrice && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>No hay un precio de visita configurado. Configúralo en la sección de Planes antes de cobrar.</span>
            </div>
          )}

          {/* Amount */}
          <div className="rounded-lg border border-border/30 bg-secondary/20 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Monto a cobrar</span>
            <span className="text-lg font-bold text-primary font-mono">
              {loadingPrice ? '...' : fmtCurrency(visitPrice ?? 0)}
            </span>
          </div>

          {/* Ticket number */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket" className="text-xs text-muted-foreground font-medium">Número de ticket físico</Label>
            <Input
              id="ticket"
              value={ticketNumber}
              onChange={e => setTicketNumber(e.target.value)}
              placeholder="Ej. 00123"
              className="h-10 text-sm bg-background/50 border-border hover:border-primary/40 transition-colors"
            />
          </div>

          {/* Payment method tiles */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Forma de pago</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all',
                    paymentMethod === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-background/30 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border/40 text-sm hover:bg-secondary transition-colors"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCharge}
            disabled={!canCharge}
            className="flex-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon transition-all gap-2"
          >
            {loading ? 'Procesando...' : <><CheckCircle2 className="h-4 w-4" /> Confirmar Cobro</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

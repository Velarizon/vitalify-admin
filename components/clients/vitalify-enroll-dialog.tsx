'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createBrowserAddonPayment } from '@/lib/supabase/browser-catalogs'
import { getBrowserActiveShift } from '@/lib/supabase/browser-shifts'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import { Banknote, CreditCard, ArrowLeftRight, CheckCircle2, Smartphone, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { prorateAddon, ADDON_DAILY_RATE, MOBILE_APP_ADDON_PRICE } from '@/lib/vitalify/addon-proration'
import type { VitalifyInvite } from './vitalify-invite-dialog'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
]

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

interface Client {
  id: number
  name: string | null
  last_name: string | null
  email: string | null
  phone_number?: string | null
  subscriptions?: { id: number; end_date?: string | null }[] | null
}

interface Props {
  client: Client | null
  open: boolean
  onClose: () => void
  onEnrolled: (invite: VitalifyInvite) => void
}

export function VitalifyEnrollDialog({ client, open, onClose, onEnrolled }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')

  useEffect(() => {
    if (!open) setPaymentMethod('cash')
  }, [open])

  const subscription = client?.subscriptions?.[0] ?? null

  // El complemento se cobra prorrateado hasta el fin de la mensualidad del gym,
  // para que a partir de la siguiente renovación ambos se cobren juntos.
  // `open` entra en las deps para recalcular si el diálogo se deja abierto entre días.
  const proration = useMemo(
    () => prorateAddon(subscription?.end_date),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscription?.end_date, open],
  )

  const handleConfirm = async () => {
    if (!client || !userData || !selectedLocation || !proration) return
    setLoading(true)
    const toastId = toast.loading('Procesando cobro y registro en app...')

    try {
      const activeShift = await getBrowserActiveShift(selectedLocation.location.id)

      // El alta en Vitalify va primero: si falla, no queremos dejar registrado en
      // caja el cobro de un complemento que el cliente nunca recibió.
      const res = await fetch('/api/vitalify/enroll-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: userData.company.id,
          localClientId: client.id,
          firstName: client.name ?? '',
          lastName: client.last_name ?? '',
          email: client.email,
          phone: client.phone_number ?? null,
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: proration.endDate,
          amount: proration.amount,
          currency: 'MXN',
          paymentMethod,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'No se pudo registrar en la app')

      await createBrowserAddonPayment({
        subscription_id: subscription?.id ?? null,
        amount: proration.amount,
        payment_method: paymentMethod,
        location_id: selectedLocation.location.id,
        shift_id: activeShift?.id ?? null,
      })

      toast.success('Cobro registrado y miembro dado de alta en la app', { id: toastId })
      onClose()
      onEnrolled({
        name: `${client.name ?? ''} ${client.last_name ?? ''}`.trim(),
        email: client.email!,
        code: result.temporaryPassword ?? null,
        phone: client.phone_number ?? null,
      })
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-border/40 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-bold text-foreground">Complemento App Móvil</DialogTitle>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {client ? `${client.name} ${client.last_name}` : ''}
              </p>
            </div>
          </div>
        </DialogHeader>

        {!proration ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <p className="text-xs text-muted-foreground">
              La mensualidad de este cliente está vencida o no tiene fecha de expiración.
              Renuévala primero: la app se sincroniza con esa fecha.
            </p>
          </div>
        ) : (
        <div className="space-y-4 pt-1">
          <div className="rounded-lg border border-border/30 bg-secondary/20 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {proration.amount >= MOBILE_APP_ADDON_PRICE
                  ? `Mes completo · ${proration.days} días de acceso`
                  : `${proration.days} ${proration.days === 1 ? 'día' : 'días'} × ${fmtCurrency(ADDON_DAILY_RATE)}`}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                de {fmtCurrency(MOBILE_APP_ADDON_PRICE)} / 30 días
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Vence junto con la mensualidad</span>
              <span className="text-xs font-semibold text-foreground font-mono uppercase">
                {format(parseISO(proration.endDate), 'dd MMM yyyy', { locale: es })}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Monto a cobrar</span>
              <span className="text-lg font-bold text-primary font-mono">{fmtCurrency(proration.amount)}</span>
            </div>
          </div>

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
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 border-border/40 text-sm">
            {proration ? 'Cancelar' : 'Cerrar'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !proration}
            className="flex-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon gap-2"
          >
            {loading ? 'Procesando...' : <><CheckCircle2 className="h-4 w-4" /> Cobrar y Activar</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

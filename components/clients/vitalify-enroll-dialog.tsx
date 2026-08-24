'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createBrowserAddonPayment, updateBrowserClientVitalifyBilling, getAppAddonPromoStatus, redeemAppAddonPromo } from '@/lib/supabase/browser-catalogs'
import { getBrowserActiveShift } from '@/lib/supabase/browser-shifts'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import { Banknote, CreditCard, ArrowLeftRight, CheckCircle2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOBILE_APP_ADDON_PRICE, calculateInitialAppPaidUntil } from '@/lib/vitalify-billing'
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
  subscriptions?: { id: number }[] | null
}

interface Props {
  client: Client | null
  open: boolean
  onClose: () => void
  onEnrolled: (invite: VitalifyInvite) => void
}

// Primera activación del complemento (el cliente nunca tuvo el app). Cobro
// completo, siempre — la sincronización con el ciclo del gym para clientes
// que ya lo tenían se resuelve sola en la próxima renovación
// (ver renew-membership-dialog.tsx / calculateAppSyncCharge).
export function VitalifyEnrollDialog({ client, open, onClose, onEnrolled }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [promo, setPromo] = useState<{ redeemedCount: number; redemptionLimit: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setPaymentMethod('cash')
      return
    }
    getAppAddonPromoStatus()
      .then(status => setPromo(status?.available ? status : null))
      .catch(() => setPromo(null))
  }, [open])

  const handleConfirm = async () => {
    if (!client || !userData || !selectedLocation) return
    setLoading(true)
    const toastId = toast.loading('Procesando cobro y registro en app...')

    try {
      // Re-checked atomically against the DB, not trusted from the earlier
      // status fetch — the promo may have run out in the meantime.
      const isFree = promo ? await redeemAppAddonPromo() : false
      const addonAmount = isFree ? 0 : MOBILE_APP_ADDON_PRICE
      const activeShift = await getBrowserActiveShift(selectedLocation.location.id)

      await createBrowserAddonPayment({
        subscription_id: client.subscriptions?.[0]?.id ?? null,
        amount: addonAmount,
        payment_method: paymentMethod,
        location_id: selectedLocation.location.id,
        shift_id: activeShift?.id ?? null,
      })

      // Hoy + 30 días: hasta cuándo queda pagada el app. Se manda como
      // endDate del Membership (sin esto queda null y la app no sabe hasta
      // cuándo dar acceso) y también se guarda localmente como referencia
      // para el cobro de sincronización en la próxima renovación.
      const appPaidUntil = calculateInitialAppPaidUntil()

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
          startDate: new Date().toISOString(),
          endDate: appPaidUntil.toISOString(),
          amount: addonAmount,
          currency: 'MXN',
          paymentMethod,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'No se pudo registrar en la app')

      await updateBrowserClientVitalifyBilling(client.id, {
        vitalify_app_paid_until: appPaidUntil.toISOString(),
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

        <div className="space-y-4 pt-1">
          <div className="rounded-lg border border-border/30 bg-secondary/20 px-4 py-3 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Monto a cobrar</span>
              {promo && (
                <span className="text-[10px] text-primary">
                  🎁 Promo: {promo.redemptionLimit - promo.redeemedCount}/{promo.redemptionLimit} restantes
                </span>
              )}
            </div>
            {promo ? (
              <span className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground line-through">{fmtCurrency(MOBILE_APP_ADDON_PRICE)}</span>
                <span className="text-lg font-bold text-primary font-mono">{fmtCurrency(0)}</span>
              </span>
            ) : (
              <span className="text-lg font-bold text-primary font-mono">{fmtCurrency(MOBILE_APP_ADDON_PRICE)}</span>
            )}
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

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 border-border/40 text-sm">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon gap-2"
          >
            {loading ? 'Procesando...' : <><CheckCircle2 className="h-4 w-4" /> Cobrar y Activar</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

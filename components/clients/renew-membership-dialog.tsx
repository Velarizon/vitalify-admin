'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  createBrowserPayment,
  createBrowserSubscription,
  getBrowserActivePlans,
  updateBrowserSubscription,
} from '@/lib/supabase/browser-catalogs'
import { getBrowserActiveShift } from '@/lib/supabase/browser-shifts'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import Terminal from '@/lib/terminal'
import FacialApi from '@/lib/facial-api'
import { toast } from 'sonner'
import { add, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Banknote, CreditCard, ArrowLeftRight, CheckCircle2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { MOBILE_APP_ADDON_PRICE } from './step-plan-payment'
import { VitalifyInviteDialog, VitalifyInvite } from './vitalify-invite-dialog'

interface Props {
  client: {
    id: number
    plan_id?: number | null
    start_date?: string | null
    name: string | null
    last_name: string | null
    email?: string | null
    phone_number?: string | null
    subscriptions?: {
      id: number
      plan_id?: number | null
      start_date?: string | null
      end_date: string | null
    }[] | null
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
  gymRegistered?: boolean
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
]

const terminalDate = (date: string) => `${date}T23:59:59.000Z`

export function RenewMembershipDialog({ client, open, onClose, onSuccess, gymRegistered = false }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [mobileApp, setMobileApp] = useState(false)
  const [invite, setInvite] = useState<VitalifyInvite | null>(null)

  // App Móvil can only be offered if the gym is registered AND we have an email
  // to enroll the member with.
  const canMobileApp = gymRegistered && !!client?.email

  const selectedPlan = plans.find(p => String(p.id) === selectedPlanId)

  useEffect(() => {
    if (open && userData) {
      getBrowserActivePlans(userData.company.id).then(loadedPlans => {
        setPlans(loadedPlans)
        // Pre-select current plan if client has one
        const currentPlanId = client?.subscriptions?.[0]?.plan_id
        if (currentPlanId) {
          const match = loadedPlans.find((p: any) => p.id === currentPlanId)
          if (match) setSelectedPlanId(String(match.id))
        }
      })
    }
  }, [open, userData, client])

  // Reset state when dialog closes (keep `invite` so its dialog can show after close)
  useEffect(() => {
    if (!open) {
      setSelectedPlanId('')
      setPaymentMethod('cash')
      setPlans([])
      setMobileApp(false)
    }
  }, [open])

  const calculateEndDate = (duration: string, baseDate = new Date()) => {
    const num = parseInt(duration) || 1
    if (duration.includes('year')) return add(baseDate, { years: num })
    if (duration.includes('mon')) return add(baseDate, { months: num })
    if (duration.includes('day')) return add(baseDate, { days: num })
    return add(baseDate, { months: 1 })
  }

  const getRenewalBaseDate = () => {
    const currentEndDate = client?.subscriptions?.[0]?.end_date
    if (!currentEndDate) return new Date()

    const today = new Date()
    const endDate = parseISO(currentEndDate)
    return endDate > today ? endDate : today
  }

  const handleRenew = async () => {
    if (!client || !selectedPlan || !selectedLocation || !userData) return
    setLoading(true)
    const toastId = toast.loading('Procesando renovación...')

    try {
      const today = new Date()
      const currentSubscription = client.subscriptions?.[0] ?? null
      const startDate = format(today, 'yyyy-MM-dd')
      const planDuration = selectedPlan.duration ?? '1 month'
      const planPrice = selectedPlan.price ?? 0
      const endDateValue = format(calculateEndDate(planDuration, getRenewalBaseDate()), 'yyyy-MM-dd')
      const activeShift = await getBrowserActiveShift(selectedLocation.location.id)

      const subscription = currentSubscription
        ? await updateBrowserSubscription(currentSubscription.id, {
          plan_id: selectedPlan.id,
          location_id: selectedLocation.location.id,
          end_date: endDateValue,
        })
        : await createBrowserSubscription({
          client_id: client.id,
          plan_id: selectedPlan.id,
          location_id: selectedLocation.location.id,
          start_date: startDate,
          end_date: endDateValue,
        })

      const addMobileApp = mobileApp && canMobileApp
      await createBrowserPayment({
        subscription_id: subscription.id,
        amount: planPrice + (addMobileApp ? MOBILE_APP_ADDON_PRICE : 0),
        payment_method: paymentMethod,
        location_id: selectedLocation.location.id,
        shift_id: activeShift?.id || null,
        payment_type: currentSubscription ? 'renewal' : 'new_subscription',
      })

      // Facial API membership sync (non-blocking). Si el cliente no existía allá, el route
      // lo da de alta y responde con auto_registered.
      FacialApi.updateMembership({
        supabase_user_id: client.id,
        membership_type:  selectedPlan.name,
        start_date:       startDate,
        end_date:         endDateValue,
      }).then((res) => {
        if (res.auto_registered) toast.success('Cliente registrado en Facial API')
      }).catch((err: Error) => {
        toast.warning(`Sin sincronización facial: ${err.message}`, { duration: 8000 })
      })

      // Terminal date update (non-blocking)
      let terminalWarned = false
      try {
        await Terminal.updateEndDate({
          user_id: String(client.id),
          end_date: terminalDate(endDateValue),
        })
      } catch {
        terminalWarned = true
      }

      // Vitalify (App Móvil) enrollment (non-blocking) — idempotent on re-enroll
      let inviteToShow: VitalifyInvite | null = null
      if (addMobileApp) {
        try {
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
              startDate,
              endDate: endDateValue,
              planDuration: selectedPlan.duration ?? null,
              amount: MOBILE_APP_ADDON_PRICE, // Vitalify only charges the app add-on; the plan price is the gym's
              currency: 'MXN',
              paymentMethod,
            }),
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.error ?? 'No se pudo registrar en la app')
          inviteToShow = {
            name: `${client.name ?? ''} ${client.last_name ?? ''}`.trim(),
            email: client.email!,
            code: result.temporaryPassword ?? null,
            phone: client.phone_number ?? null,
          }
        } catch (e: any) {
          toast.warning(`Renovación completa, pero falló el registro en Vitalify: ${e.message}`, { duration: 8000 })
        }
      }

      toast.success(
        terminalWarned ? 'Membresía renovada. No se pudo actualizar la fecha en la terminal.' : 'Membresía renovada exitosamente',
        { id: toastId },
      )
      onSuccess()
      onClose()
      if (inviteToShow) setInvite(inviteToShow)
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  const nextEndDate = selectedPlan ? calculateEndDate(selectedPlan.duration ?? '1 month', getRenewalBaseDate()) : null
  const clientCode = `#VTL-${client?.id.toString().padStart(5, '0')}`

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/40 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-foreground">Renovar Membresía</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">
            ID CLIENTE: <span className="text-primary font-semibold">{clientCode}</span>
            {' · '}
            <span className="text-foreground/80">{client?.name} {client?.last_name}</span>
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Plan selector */}
          <div className="space-y-1.5">
            <Label htmlFor="plan" className="text-xs text-muted-foreground font-medium">Tipo de membresía</Label>
            <Select
              value={selectedPlanId}
              onValueChange={v => setSelectedPlanId(v ?? '')}
              items={plans.map(p => ({ value: String(p.id), label: p.name }))}
            >
              <SelectTrigger id="plan" className="h-10 text-sm bg-background/50 border-border hover:border-primary/40 transition-colors">
                <SelectValue placeholder="Seleccionar membresía" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {plans.map(p => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-sm focus:bg-primary/10 focus:text-primary">
                    {p.name} — {fmtCurrency(p.price ?? 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Mobile app add-on — only when the gym is registered and client has email */}
          {canMobileApp && (
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Complemento App Móvil</p>
                  <p className="text-xs text-muted-foreground">
                    Acceso a la aplicación móvil · +{fmtCurrency(MOBILE_APP_ADDON_PRICE)}
                  </p>
                </div>
              </div>
              <Switch checked={mobileApp} onCheckedChange={setMobileApp} />
            </div>
          )}

          {/* Summary */}
          {selectedPlan && nextEndDate && (
            <div className="rounded-lg border border-border/30 bg-secondary/20 divide-y divide-border/20 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Plan</span>
                <span className="text-xs font-semibold text-foreground font-mono">
                  {fmtCurrency(selectedPlan.price ?? 0)}
                </span>
              </div>
              {mobileApp && canMobileApp && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground">Complemento App Móvil</span>
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {fmtCurrency(MOBILE_APP_ADDON_PRICE)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Total a pagar</span>
                <span className="text-lg font-bold text-primary font-mono">
                  {fmtCurrency((selectedPlan.price ?? 0) + (mobileApp && canMobileApp ? MOBILE_APP_ADDON_PRICE : 0))}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Expiración</span>
                <span className="text-xs font-semibold text-foreground font-mono uppercase">
                  {format(nextEndDate, 'dd MMM yyyy', { locale: es })}
                </span>
              </div>
            </div>
          )}
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
            onClick={handleRenew}
            disabled={loading || !selectedPlanId}
            className="flex-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon transition-all gap-2"
          >
            {loading ? 'Procesando...' : <><CheckCircle2 className="h-4 w-4" /> Confirmar Renovación</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <VitalifyInviteDialog invite={invite} onClose={() => setInvite(null)} />
    </>
  )
}

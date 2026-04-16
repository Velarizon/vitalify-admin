'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createSubscription } from '@/lib/supabase/actions/clients'
import { createPayment } from '@/lib/supabase/actions/payments'
import { getActivePlans } from '@/lib/supabase/actions/plans'
import { getActiveShift } from '@/lib/supabase/actions/shifts'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import { add, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Banknote, CreditCard, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  client: {
    id: number
    name: string | null
    last_name: string | null
    subscriptions: any[]
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
]

export function RenewMembershipDialog({ client, open, onClose, onSuccess }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')

  const selectedPlan = plans.find(p => String(p.id) === selectedPlanId)

  useEffect(() => {
    if (open && userData) {
      getActivePlans(userData.company.id).then(loadedPlans => {
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

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPlanId('')
      setPaymentMethod('cash')
      setPlans([])
    }
  }, [open])

  const calculateEndDate = (duration: string) => {
    const today = new Date()
    const num = parseInt(duration) || 1
    if (duration.includes('year')) return add(today, { years: num })
    if (duration.includes('mon')) return add(today, { months: num })
    if (duration.includes('day')) return add(today, { days: num })
    return add(today, { months: 1 })
  }

  const handleRenew = async () => {
    if (!client || !selectedPlan || !selectedLocation || !userData) return
    setLoading(true)
    const toastId = toast.loading('Procesando renovación...')

    try {
      const today = new Date()
      const endDate = calculateEndDate(selectedPlan.duration)
      const activeShift = await getActiveShift(selectedLocation.location.id)

      const newSub = await createSubscription({
        client_id: client.id,
        plan_id: selectedPlan.id,
        location_id: selectedLocation.location.id,
        start_date: format(today, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      })

      await createPayment({
        subscription_id: newSub.id,
        amount: selectedPlan.price,
        payment_method: paymentMethod,
        location_id: selectedLocation.location.id,
        shift_id: activeShift?.id || null,
      })

      toast.success('Membresía renovada exitosamente', { id: toastId })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  const nextEndDate = selectedPlan ? calculateEndDate(selectedPlan.duration) : null
  const clientCode = `#VTL-${client?.id.toString().padStart(5, '0')}`

  return (
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
                    {p.name} — {fmtCurrency(p.price)}
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

          {/* Summary */}
          {selectedPlan && nextEndDate && (
            <div className="rounded-lg border border-border/30 bg-secondary/20 divide-y divide-border/20 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Total a pagar</span>
                <span className="text-lg font-bold text-primary font-mono">
                  {fmtCurrency(selectedPlan.price)}
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
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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

interface Props {
  client: {
    id: number
    name: string
    last_name: string
    subscriptions: any[]
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RenewMembershipDialog({ client, open, onClose, onSuccess }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  
  const currentSub = client?.subscriptions?.[0]
  const selectedPlan = plans.find(p => String(p.id) === selectedPlanId)

  useEffect(() => {
    if (open && userData) {
      getActivePlans(userData.company.id).then(setPlans)
    }
  }, [open, userData])

  const calculateEndDate = (duration: string) => {
    const today = new Date()
    const num = parseInt(duration) || 1
    if (duration.includes('year')) return add(today, { years: num })
    if (duration.includes('mon')) return add(today, { months: num })
    if (duration.includes('day')) return add(today, { days: num })
    return add(today, { months: 1 })
  }

  const handleRenew = async () => {
    if (!client || !selectedPlan || !selectedLocation) return
    setLoading(true)
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

      toast.success('Membresía renovada correctamente')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Renovar membresía</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <div className="text-sm font-medium">{client?.name} {client?.last_name}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Plan actual</Label>
              <div className="text-xs font-medium">{currentSub?.plans?.name || 'Ninguno'}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vencimiento</Label>
              <div className="text-xs font-medium">{currentSub?.end_date || '—'}</div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="plan" className="text-xs">Nuevo Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger id="plan" className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {p.name} — {fmtCurrency(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="method" className="text-xs">Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="method" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash" className="text-xs">Efectivo</SelectItem>
                <SelectItem value="card" className="text-xs">Tarjeta</SelectItem>
                <SelectItem value="transfer" className="text-xs">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Nueva fecha fin:</span>
                <span className="font-medium">{format(calculateEndDate(selectedPlan.duration), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                <span>Total a pagar:</span>
                <span className="text-primary">{fmtCurrency(selectedPlan.price)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button 
            onClick={handleRenew} 
            disabled={loading || !selectedPlanId} 
            size="sm" 
            className="h-8 text-xs bg-primary"
          >
            {loading ? 'Procesando...' : 'Confirmar renovación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// components/clients/create-client-sheet.tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createBrowserClientRecord, createBrowserSubscription } from '@/lib/supabase/browser-catalogs'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  plans: { id: number; name: string; duration: string }[]
}

type Step1Data = { name: string; last_name: string; email: string; phone_number: string; date_of_birth: string; gender: string }
type Step3Data = { plan_id: number; start_date: string; end_date: string }

export function CreateClientSheet({ open, onClose, plans }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [step, setStep] = useState(0)
  const [step1, setStep1] = useState<Step1Data>({ name: '', last_name: '', email: '', phone_number: '', date_of_birth: '', gender: 'M' })
  const [step3, setStep3] = useState<Step3Data>({ plan_id: 0, start_date: '', end_date: '' })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!userData || !selectedLocation) return
    setLoading(true)
    try {
      const client = await createBrowserClientRecord({ ...step1, company_id: userData.company.id })
      await createBrowserSubscription({
        client_id: client.id,
        plan_id: step3.plan_id,
        location_id: selectedLocation.location.id,
        start_date: step3.start_date,
        end_date: step3.end_date,
      })
      toast.success('Cliente creado correctamente')
      setStep(0)
      onClose()
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-96">
        <SheetHeader><SheetTitle>Nuevo cliente — Paso {step + 1} de 3</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {step === 0 && (
            <>
              {(['name','last_name','email','phone_number','date_of_birth'] as const).map(field => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs capitalize">{field.replace('_', ' ')}</Label>
                  <Input className="h-7 text-xs" value={step1[field]}
                    onChange={e => setStep1(p => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Género</Label>
                <Select value={step1.gender} onValueChange={v => setStep1(p => ({ ...p, gender: v as "M" | "F" | "O" }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="O">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {step === 1 && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Registro biométrico via terminal Hikvision.</p>
              <p className="text-xs">El cliente se registrará primero en la DB. Luego podrás sincronizar huella y foto facial desde la pantalla de acciones del cliente.</p>
            </div>
          )}
          {step === 2 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Plan</Label>
                <Select
                  value={String(step3.plan_id)}
                  onValueChange={v => setStep3(p => ({ ...p, plan_id: Number(v) }))}
                  items={plans.map(p => ({ value: String(p.id), label: p.name }))}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha inicio</Label>
                <Input type="date" className="h-7 text-xs" value={step3.start_date}
                  onChange={e => setStep3(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha fin</Label>
                <Input type="date" className="h-7 text-xs" value={step3.end_date}
                  onChange={e => setStep3(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            {step > 0 && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setStep(p => p - 1)}>Atrás</Button>}
            {step < 2
              ? <Button size="sm" className="h-7 text-xs ml-auto" onClick={() => setStep(p => p + 1)}>Siguiente</Button>
              : <Button size="sm" className="h-7 text-xs ml-auto" onClick={handleSave} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
            }
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

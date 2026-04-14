// components/clients/create-client-wizard.tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { WizardStepper } from './wizard-stepper'
import { StepPersonal, PersonalData } from './step-personal'
import { StepBiometrics, BiometricData } from './step-biometrics'
import { StepPlanPayment, PaymentData } from './step-plan-payment'
import { createClientRecord, createSubscription } from '@/lib/supabase/actions/clients'
import { createPayment } from '@/lib/supabase/actions/payments'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { getActiveShift } from '@/lib/supabase/actions/shifts'
import Terminal from '@/lib/terminal'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  plans: { id: number; name: string; price: number | null; duration: string | null }[]
}

const STEPS = ['Datos', 'Biométricos', 'Plan']

const emptyPersonal: PersonalData = { name: '', last_name: '', email: '', phone_number: '', date_of_birth: '', gender: 'M' }
const emptyBiometric: BiometricData = { faceImage: null, fingerprintData: null }
const emptyPayment: PaymentData = { plan_id: 0, payment_method: '', start_date: '', end_date: '', receipt_image: null }

export function CreateClientWizard({ open, onClose, plans }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonal)
  const [biometric, setBiometric] = useState<BiometricData>(emptyBiometric)
  const [payment, setPayment] = useState<PaymentData>(emptyPayment)
  const [saving, setSaving] = useState(false)

  const canNext = () => {
    if (step === 0) return !!(personal.name && personal.last_name && personal.email)
    if (step === 1) return !!(biometric.faceImage && biometric.fingerprintData)
    if (step === 2) return !!(payment.plan_id && payment.payment_method &&
      (payment.payment_method !== 'transfer' || payment.receipt_image))
    return false
  }

  const handleSubmit = async () => {
    if (!userData || !selectedLocation) return
    setSaving(true)
    try {
      // 1. Insert client
      const client = await createClientRecord({
        ...personal,
        company_id: userData.company.id,
        image_url: biometric.faceImage ?? undefined,
      })

      // 2. Insert subscription
      const subscription = await createSubscription({
        client_id: client.id,
        plan_id: payment.plan_id,
        location_id: selectedLocation.location.id,
        start_date: payment.start_date,
        end_date: payment.end_date,
      })

      // 3. Insert payment
      const activeShift = await getActiveShift(selectedLocation.location.id)
      await createPayment({
        subscription_id: subscription.id,
        amount: plans.find(p => p.id === payment.plan_id)?.price ?? 0,
        payment_method: payment.payment_method,
        location_id: selectedLocation.location.id,
        shift_id: activeShift?.id ?? null,
        registered_by: null,
      })

      // 4. Terminal sync (non-blocking)
      try {
        const employeeNo = String(client.id)
        await Terminal.createPerson({
          name: `${personal.name} ${personal.last_name}`,
          employeeNo,
          userType: 'normal',
          beginTime: payment.start_date + 'T00:00:00',
          endTime: payment.end_date + 'T23:59:59',
        })
        if (biometric.faceImage) await Terminal.setUpFaceImage(employeeNo, biometric.faceImage)
        if (biometric.fingerprintData) await Terminal.setUpFingerPrint(employeeNo, biometric.fingerprintData.fingerPrintData)
        toast.success('Cliente creado y sincronizado con terminal')
      } catch {
        toast.warning('Cliente creado en DB. Error al sincronizar con terminal — reintenta desde el listado.')
      }

      // Reset and close
      setStep(0); setPersonal(emptyPersonal); setBiometric(emptyBiometric); setPayment(emptyPayment)
      onClose()
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Nuevo cliente</SheetTitle>
        </SheetHeader>
        <WizardStepper steps={STEPS} currentStep={step} />
        <div className="mt-2">
          {step === 0 && <StepPersonal data={personal} onChange={setPersonal} />}
          {step === 1 && <StepBiometrics data={biometric} onChange={setBiometric} />}
          {step === 2 && <StepPlanPayment data={payment} onChange={setPayment} plans={plans} />}
        </div>
        <div className="flex gap-2 pt-4 mt-4 border-t border-border">
          {step > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStep(s => s - 1)}>
              Atrás
            </Button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Siguiente
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={handleSubmit} disabled={saving || !canNext()}>
              {saving ? 'Guardando...' : 'Crear cliente'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

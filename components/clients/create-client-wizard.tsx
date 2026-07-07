// components/clients/create-client-wizard.tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { WizardStepper } from './wizard-stepper'
import { StepPersonal, PersonalData } from './step-personal'
import { StepBiometrics, BiometricData } from './step-biometrics'
import { StepPlanPayment, PaymentData, MOBILE_APP_ADDON_PRICE } from './step-plan-payment'
import { VitalifyInviteDialog, VitalifyInvite } from './vitalify-invite-dialog'
import { createBrowserClientRecord, createBrowserPayment, createBrowserSubscription, updateBrowserClient } from '@/lib/supabase/browser-catalogs'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { getBrowserActiveShift } from '@/lib/supabase/browser-shifts'
import { uploadFaceImage } from '@/lib/face-image'
import Terminal from '@/lib/terminal'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, UserPlus, ShieldCheck } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  plans: { id: number; name: string; price: number | null; duration: string | null }[]
  gymRegistered?: boolean
}

const STEPS = ['IDENTIDAD', 'BIOMETRÍA', 'MEMBRESÍA']

const emptyPersonal: PersonalData = { name: '', last_name: '', email: '', phone_number: '', date_of_birth: '', gender: 'M' }
const emptyBiometric: BiometricData = { faceImage: null, fingerprintData: null }
const emptyPayment: PaymentData = { plan_id: 0, payment_method: '', start_date: '', end_date: '', receipt_image: null, mobile_app: false }
const terminalDate = (date: string, time: 'start' | 'end') =>
  `${date}T${time === 'start' ? '00:00:00' : '23:59:59'}.000Z`

export function CreateClientWizard({ open, onClose, plans, gymRegistered = false }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonal)
  const [biometric, setBiometric] = useState<BiometricData>(emptyBiometric)
  const [payment, setPayment] = useState<PaymentData>(emptyPayment)
  const [saving, setSaving] = useState(false)
  const [invite, setInvite] = useState<VitalifyInvite | null>(null)

  const canNext = () => {
    if (step === 0) return !!(personal.name && personal.last_name && personal.email)
    if (step === 1) return true // Biometrics can be optional for now
    if (step === 2) return !!(payment.plan_id && payment.payment_method)
    return false
  }

  const handleSubmit = async () => {
    if (!userData || !selectedLocation) return
    setSaving(true)
    const toastId = toast.loading('Procesando registro y sincronización...')
    
    try {
      // 1. Insert client
      const client = await createBrowserClientRecord({
        ...personal,
        company_id: userData.company.id,
      })

      // 1b. Upload face photo to Storage and link it to the client record
      if (biometric.faceImage) {
        const imageUrl = await uploadFaceImage(userData.company.id, client.id, biometric.faceImage)
        await updateBrowserClient(client.id, { image_url: imageUrl })
      }

      // 2. Insert subscription
      const subscription = await createBrowserSubscription({
        client_id: client.id,
        plan_id: payment.plan_id,
        location_id: selectedLocation.location.id,
        start_date: payment.start_date,
        end_date: payment.end_date,
      })

      // 3. Insert payment
      const activeShift = await getBrowserActiveShift(selectedLocation.location.id)
      const planPrice = plans.find(p => p.id === payment.plan_id)?.price ?? 0
      await createBrowserPayment({
        subscription_id: subscription.id,
        amount: planPrice + (payment.mobile_app ? MOBILE_APP_ADDON_PRICE : 0),
        payment_method: payment.payment_method,
        location_id: selectedLocation.location.id,
        shift_id: activeShift?.id ?? null,
      })

      // 4. Terminal sync (non-blocking)
      try {
        const employeeNo = String(client.id)
        await Terminal.createPerson({
          user_id: employeeNo,
          name: personal.name,
          last_name: personal.last_name,
          gender: personal.gender,
          start_date: terminalDate(payment.start_date, 'start'),
          end_date: terminalDate(payment.end_date, 'end'),
        })
        const syncUpdates: { is_sync: true; is_image_sync?: true } = { is_sync: true }
        if (biometric.faceImage) {
          await Terminal.setUpFaceImage(employeeNo, biometric.faceImage)
          syncUpdates.is_image_sync = true
        }
        if (biometric.fingerprintData) await Terminal.setUpFingerPrint(employeeNo, biometric.fingerprintData.fingerPrintData)
        await updateBrowserClient(client.id, syncUpdates)
        toast.success('Registro completado exitosamente', { id: toastId })
      } catch {
        toast.warning('Registro en DB exitoso. Error de sincronización local.', { id: toastId })
      }

      // 5. Vitalify (App Móvil) enrollment — non-blocking, only with add-on
      if (payment.mobile_app && gymRegistered) {
        try {
          const res = await fetch('/api/vitalify/enroll-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId: userData.company.id,
              localClientId: client.id,
              firstName: personal.name,
              lastName: personal.last_name,
              email: personal.email,
              phone: personal.phone_number,
              startDate: payment.start_date,
              endDate: payment.end_date,
              planDuration: plans.find(p => p.id === payment.plan_id)?.duration ?? null,
              amount: MOBILE_APP_ADDON_PRICE, // Vitalify only charges the app add-on; the plan price is the gym's
              currency: 'MXN',
              paymentMethod: payment.payment_method,
            }),
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.error ?? 'No se pudo registrar en la app')
          setInvite({
            name: `${personal.name} ${personal.last_name}`.trim(),
            email: personal.email,
            code: result.temporaryPassword ?? null,
            phone: personal.phone_number || null,
          })
        } catch (e) {
          toast.warning(`Alta completada, pero falló el registro en Vitalify: ${(e as Error).message}`, { duration: 8000 })
        }
      }

      onClose()
      setStep(0); setPersonal(emptyPersonal); setBiometric(emptyBiometric); setPayment(emptyPayment)
    } catch (e: unknown) {
      toast.error((e as Error).message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:w-[500px] bg-background border-l border-border/40 p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-neon">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <SheetTitle className="text-xl font-heading font-bold text-foreground">Registro de Miembro</SheetTitle>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Protocolo de Alta v2.0</p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-4 bg-secondary/20 border-b border-border/10">
          <WizardStepper steps={STEPS} currentStep={step} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-primary rounded-full shadow-neon" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">{STEPS[step]}</h3>
            </div>
            
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              {step === 0 && <StepPersonal data={personal} onChange={setPersonal} />}
              {step === 1 && <StepBiometrics data={biometric} onChange={setBiometric} />}
              {step === 2 && <StepPlanPayment data={payment} onChange={setPayment} plans={plans} gymRegistered={gymRegistered} />}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border/20 bg-card/50 flex items-center justify-between gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-secondary transition-all" 
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
          >
            <ArrowLeft className="h-3 w-3" /> {step > 0 ? 'Anterior' : 'Cancelar'}
          </Button>
          
          {step < 2 ? (
            <Button 
              size="sm" 
              className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon disabled:opacity-30 transition-all" 
              onClick={() => setStep(s => s + 1)} 
              disabled={!canNext()}
            >
              Siguiente <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon hover:bg-primary/90 transition-all" 
              onClick={handleSubmit} 
              disabled={saving || !canNext()}
            >
              {saving ? 'Procesando...' : <><ShieldCheck className="h-4 w-4" /> Finalizar Alta</>}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>

    <VitalifyInviteDialog invite={invite} onClose={() => setInvite(null)} />
    </>
  )
}

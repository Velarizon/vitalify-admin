// components/clients/step-plan-payment.tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Camera, QrCode, RotateCcw, Banknote, CreditCard, ArrowLeftRight, Smartphone } from 'lucide-react'
import { add, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Webcam from 'react-webcam'
import { QRCodeSVG } from 'qrcode.react'
import { MOBILE_APP_ADDON_PRICE } from '@/lib/vitalify-billing'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
]

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export { MOBILE_APP_ADDON_PRICE }

export interface PaymentData {
  plan_id: number
  payment_method: string
  start_date: string
  end_date: string
  receipt_image: string | null
  mobile_app: boolean
}

interface Props {
  data: PaymentData
  onChange: (data: PaymentData) => void
  plans: { id: number; name: string; price: number | null; duration: string | null }[]
  gymRegistered?: boolean
}

export function computeEndDate(startDate: string, duration: string | null): string {
  if (!duration || !startDate) return startDate
  const start = new Date(startDate)
  const parts = duration.match(/(\d+)\s*(day|days|mon|mons|month|months|year|years)/)
  if (!parts) return startDate
  const amount = parseInt(parts[1], 10)
  const unit = parts[2]
  if (unit.startsWith('day')) return add(start, { days: amount }).toISOString().split('T')[0]
  if (unit.startsWith('mon')) return add(start, { months: amount }).toISOString().split('T')[0]
  if (unit.startsWith('year')) return add(start, { years: amount }).toISOString().split('T')[0]
  return startDate
}

export function StepPlanPayment({ data, onChange, plans, gymRegistered = false }: Props) {
  const [showWebcam, setShowWebcam] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrToken] = useState(() => Math.random().toString(36).slice(2))
  const webcamRef = useRef<Webcam>(null)

  const selectedPlan = plans.find(p => p.id === data.plan_id)

  const set = (partial: Partial<PaymentData>) => onChange({ ...data, ...partial })

  const handlePlanChange = (planId: number) => {
    const plan = plans.find(p => p.id === planId)
    const today = new Date().toISOString().split('T')[0]
    const endDate = computeEndDate(today, plan?.duration ?? null)
    set({ plan_id: planId, start_date: today, end_date: endDate })
  }

  const captureReceipt = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) { set({ receipt_image: screenshot }); setShowWebcam(false) }
  }, [data])

  // Poll for QR receipt upload
  useEffect(() => {
    if (!showQR) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/receipt-upload?token=${qrToken}`)
        const { image } = await res.json()
        if (image) { set({ receipt_image: image }); setShowQR(false) }
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [showQR, qrToken])

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/receipt-upload?upload=true&token=${qrToken}`
    : ''

  const nextEndDate = selectedPlan ? (() => {
    const dur = selectedPlan.duration ?? ''
    const num = parseInt(dur) || 1
    const today = new Date()
    if (dur.includes('year')) return add(today, { years: num })
    if (dur.includes('mon')) return add(today, { months: num })
    if (dur.includes('day')) return add(today, { days: num })
    return add(today, { months: 1 })
  })() : null

  return (
    <div className="space-y-5">
      {/* Plan selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-medium">Tipo de membresía</Label>
        <Select
          value={data.plan_id ? String(data.plan_id) : ''}
          onValueChange={v => handlePlanChange(Number(v))}
          items={plans.map(p => ({ value: String(p.id), label: p.name }))}
        >
          <SelectTrigger className="h-10 text-sm bg-background/50 border-border hover:border-primary/40 transition-colors">
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
              onClick={() => set({ payment_method: value })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all',
                data.payment_method === value
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

      {/* Mobile app add-on — only when the gym is registered in Vitalify */}
      {gymRegistered && (
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
        <Switch
          checked={data.mobile_app}
          onCheckedChange={v => set({ mobile_app: v })}
        />
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
          {data.mobile_app && (
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
              {fmtCurrency((selectedPlan.price ?? 0) + (data.mobile_app ? MOBILE_APP_ADDON_PRICE : 0))}
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

      {/* Receipt upload (transfer only) */}
      {data.payment_method === 'transfer' && (
        <div className="space-y-2">
          <Label className="text-xs">Comprobante de pago</Label>
          {data.receipt_image ? (
            <div className="space-y-2">
              <img src={data.receipt_image} alt="Comprobante" className="w-full max-h-32 object-cover rounded-md border border-border" />
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => set({ receipt_image: null })}>
                <RotateCcw size={12} /> Repetir
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setShowWebcam(true); setShowQR(false) }}>
                <Camera size={12} /> Tomar foto
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setShowQR(true); setShowWebcam(false) }}>
                <QrCode size={12} /> Enviar desde celular
              </Button>
            </div>
          )}
          {showWebcam && (
            <div className="space-y-2">
              <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full rounded-md border border-border" />
              <Button size="sm" className="h-7 text-xs" onClick={captureReceipt}>Capturar</Button>
            </div>
          )}
          {showQR && (
            <div className="flex flex-col items-center gap-2 p-4 border border-border rounded-md">
              <QRCodeSVG value={qrUrl} size={160} bgColor="#0B221E" fgColor="#00FF9D" />
              <p className="text-[10px] text-muted-foreground text-center">Escanea con tu celular para enviar la foto del comprobante</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

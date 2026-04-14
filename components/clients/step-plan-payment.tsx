// components/clients/step-plan-payment.tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, QrCode, RotateCcw } from 'lucide-react'
import { add } from 'date-fns'
import Webcam from 'react-webcam'
import { QRCodeSVG } from 'qrcode.react'

export interface PaymentData {
  plan_id: number
  payment_method: string
  start_date: string
  end_date: string
  receipt_image: string | null
}

interface Props {
  data: PaymentData
  onChange: (data: PaymentData) => void
  plans: { id: number; name: string; price: number | null; duration: string | null }[]
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

export function StepPlanPayment({ data, onChange, plans }: Props) {
  const [showWebcam, setShowWebcam] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrToken] = useState(() => Math.random().toString(36).slice(2))
  const webcamRef = useRef<Webcam>(null)

  const selectedPlan = plans.find(p => p.id === data.plan_id)
  const price = selectedPlan?.price ?? 0

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

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Plan</Label>
        <Select value={data.plan_id ? String(data.plan_id) : ''} onValueChange={v => handlePlanChange(Number(v))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
          <SelectContent>
            {plans.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — ${p.price ?? 0}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Método de pago</Label>
        <Select value={data.payment_method} onValueChange={v => set({ payment_method: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="card">Tarjeta</SelectItem>
            <SelectItem value="transfer">Transferencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

      {data.start_date && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="text-muted-foreground">Inicio:</span> {data.start_date}</div>
          <div><span className="text-muted-foreground">Fin:</span> {data.end_date}</div>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <span className="text-sm font-bold">Total: ${price}</span>
      </div>
    </div>
  )
}

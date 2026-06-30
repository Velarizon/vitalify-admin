// components/clients/step-biometrics.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Camera, Fingerprint, RotateCcw, Check } from 'lucide-react'
import Terminal, { FingerprintCapture } from '@/lib/terminal'

export interface BiometricData {
  faceImage: string | null
  fingerprintData: FingerprintCapture | null
  syncFacial: boolean
}

interface Props {
  data: BiometricData
  onChange: (data: BiometricData) => void
}

export function StepBiometrics({ data, onChange }: Props) {
  const [capturingFP, setCapturingFP] = useState(false)
  const webcamRef = useRef<Webcam>(null)

  const capturePhoto = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) onChange({ ...data, faceImage: screenshot })
  }, [data, onChange])

  const captureFingerprint = async () => {
    setCapturingFP(true)
    try {
      const fp = await Terminal.readFingerPrint()
      onChange({ ...data, fingerprintData: fp })
    } catch (e) {
      console.error('Fingerprint capture error:', e)
    }
    setCapturingFP(false)
  }

  const fpQuality = data.fingerprintData?.fingerPrintQuality ?? null
  const fpLabel = fpQuality !== null
    ? fpQuality < 50 ? 'Mala calidad' : fpQuality < 80 ? 'Calidad media' : 'Buena calidad'
    : null

  return (
    <div className="space-y-4">
      {/* Face photo */}
      <div className="space-y-2">
        <p className="text-xs font-medium">Foto facial</p>
        {!data.faceImage ? (
          <div className="space-y-2">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded-md border border-border"
              videoConstraints={{ facingMode: 'user', width: 400, height: 300 }}
            />
            <Button size="sm" className="h-7 text-xs gap-1" onClick={capturePhoto}>
              <Camera size={12} /> Capturar imagen
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <img src={data.faceImage} alt="Captura" className="w-full max-h-48 object-cover rounded-md border border-border" />
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onChange({ ...data, faceImage: null })}>
              <RotateCcw size={12} /> Repetir imagen
            </Button>
          </div>
        )}
      </div>

      {/* Fingerprint */}
      <div className="space-y-2">
        <p className="text-xs font-medium">Huella digital</p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={captureFingerprint} disabled={capturingFP}>
          <Fingerprint size={12} /> {capturingFP ? 'Capturando... coloque el dedo' : 'Capturar huella digital'}
        </Button>
        {fpQuality !== null && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${fpQuality >= 80 ? 'bg-primary' : fpQuality >= 50 ? 'bg-[#FF9F0A]' : 'bg-destructive'}`} />
            <span className="text-xs text-muted-foreground">{fpLabel} ({fpQuality})</span>
          </div>
        )}
      </div>

      {/* Sincronización con Facial API */}
      <label className="group flex items-start gap-3 cursor-pointer select-none rounded-lg border p-3 transition-all duration-200 border-border/40 bg-secondary/20 hover:bg-secondary/30 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/10 has-[:checked]:shadow-neon">
        <input
          type="checkbox"
          checked={data.syncFacial}
          onChange={(e) => onChange({ ...data, syncFacial: e.target.checked })}
          className="peer sr-only"
        />
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border bg-background/40 transition-all duration-200 border-border/60 peer-checked:border-primary peer-checked:bg-primary peer-checked:shadow-neon peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
          <Check className="h-3 w-3 text-primary-foreground opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100" strokeWidth={3.5} />
        </span>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground transition-colors group-has-[:checked]:text-primary">
            Sincronizar con Facial API
          </p>
          <p className="text-[10px] text-muted-foreground">Registra al miembro en el reconocimiento facial al finalizar el alta.</p>
        </div>
      </label>
    </div>
  )
}

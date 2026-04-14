// components/clients/step-biometrics.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Camera, Fingerprint, RotateCcw } from 'lucide-react'
import Terminal from '@/lib/terminal'

export interface BiometricData {
  faceImage: string | null
  fingerprintData: any | null
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
    </div>
  )
}

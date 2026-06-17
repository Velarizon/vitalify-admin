'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { updateBrowserClient } from '@/lib/supabase/browser-catalogs'
import { uploadFaceImage, resolveFaceImageBase64 } from '@/lib/face-image'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { User, Fingerprint, CreditCard, History, Save, X, Camera, RotateCcw, ShieldCheck, WifiOff, Loader2, UserMinus, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Terminal, { FingerprintCapture } from '@/lib/terminal'
import FacialApi from '@/lib/facial-api'

interface Subscription {
  id: number
  start_date?: string | null
  end_date: string | null
  plans?: { name: string | null } | null
}

interface Props {
  client: {
    id: number
    name: string | null
    last_name: string | null
    email: string | null
    image_url: string | null
    phone_number: string | null
    date_of_birth: string | null
    gender: string | null
    is_sync?: boolean | null
    subscriptions?: Subscription[] | null
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type ClientPayment = {
  id: number
  amount: number | null
  payment_method: string | null
  payment_date: string | null
  payment_type: string | null
  subscription_id: number | null
  registered_by: string | null
  subscriptions?: {
    id: number
    plans?: { name: string | null } | { name: string | null }[] | null
  } | null
  responsible?: {
    id: string
    displayName: string | null
    email: string | null
  } | null
}

const fmtCurrency = (amount: number | null) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount ?? 0)

const formatPaymentDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

const paymentTypeLabel = (type: string | null) => {
  if (type === 'new_subscription') return 'Alta'
  if (type === 'renewal') return 'Renovación'
  return 'Pago'
}

const paymentMethodLabel = (method: string | null) => {
  if (method === 'cash') return 'Efectivo'
  if (method === 'card') return 'Tarjeta'
  if (method === 'transfer') return 'Transferencia'
  return method ?? '—'
}

function getPaymentPlanName(payment: ClientPayment) {
  const plans = payment.subscriptions?.plans
  if (Array.isArray(plans)) return plans[0]?.name ?? 'Membresía'
  return plans?.name ?? 'Membresía'
}

export function EditClientDialog({ client, open, onClose, onSuccess }: Props) {
  const { userData } = useAuthStore()
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentsLoadedFor, setPaymentsLoadedFor] = useState<number | null>(null)
  const [payments, setPayments] = useState<ClientPayment[]>([])
  const [savingBiometrics, setSavingBiometrics] = useState(false)
  const [capturingFP, setCapturingFP] = useState(false)
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [fingerprintData, setFingerprintData] = useState<FingerprintCapture | null>(null)
  const [terminalConfigured, setTerminalConfigured] = useState(false)
  const webcamRef = useRef<Webcam>(null)
  const [formData, setFormData] = useState({
    name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'M',
  })
  const [isSynced, setIsSynced] = useState(false)
  const [terminalLoading, setTerminalLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState<'baja' | 'alta' | null>(null)

  useEffect(() => {
    if (client) {
      const timeoutId = window.setTimeout(() => {
        setFormData({
          name: client.name || '',
          last_name: client.last_name || '',
          email: client.email || '',
          phone_number: client.phone_number || '',
          date_of_birth: client.date_of_birth || '',
          gender: client.gender || 'M',
        })
        setFaceImage(client.image_url || null)
        setFingerprintData(null)
        setActiveTab('info')
        setPayments([])
        setPaymentsLoadedFor(null)
        setIsSynced(client.is_sync ?? false)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [client])

  useEffect(() => {
    if (!open || typeof window === 'undefined') return

    const timeoutId = window.setTimeout(() => {
      setTerminalConfigured(!!localStorage.getItem('terminalIp'))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [open])

  useEffect(() => {
    if (!open || activeTab !== 'payments' || !client || paymentsLoadedFor === client.id) return

    let cancelled = false
    setLoadingPayments(true)

    fetch(`/api/clients/${client.id}/payments`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'No se pudo cargar el historial de pagos')
        return result as { payments: ClientPayment[] }
      })
      .then((result) => {
        if (cancelled) return
        setPayments(result.payments)
        setPaymentsLoadedFor(client.id)
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoadingPayments(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, client, open, paymentsLoadedFor])

  const handleSave = async () => {
    if (!client) return
    setLoading(true)
    try {
      await updateBrowserClient(client.id, formData)

      const patch = Object.fromEntries(
        Object.entries({
          supabase_user_id: client.id,
          first_name:   formData.name !== client.name ? formData.name : undefined,
          last_name:    formData.last_name !== client.last_name ? formData.last_name : undefined,
          email:        formData.email !== client.email ? formData.email : undefined,
          phone_number: formData.phone_number !== client.phone_number ? formData.phone_number : undefined,
          birth_date:   formData.date_of_birth !== client.date_of_birth ? formData.date_of_birth : undefined,
          gender:       formData.gender !== client.gender ? formData.gender : undefined,
        }).filter(([, v]) => v !== undefined)
      )

      if (Object.keys(patch).length > 1) {
        FacialApi.updateUser(patch as { supabase_user_id: number }).catch(() => {
          toast.warning('Guardado. Sin sincronización con reconocimiento facial.')
        })
      }

      toast.success('Cliente actualizado correctamente')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const formatTerminalDate = (d: string | null | undefined) => {
    if (!d) return ''
    return d.includes('T') ? d : `${d}T00:00:00.000`
  }

  const handleDarBaja = async () => {
    if (!client) return
    setShowConfirm(null)
    setTerminalLoading(true)
    const toastId = toast.loading('Eliminando del terminal...')
    try {
      await Terminal.deleteUser(String(client.id))
      await updateBrowserClient(client.id, { is_sync: false })
      setIsSynced(false)
      toast.success('Cliente dado de baja del terminal', { id: toastId })
      onSuccess()
    } catch (err) {
      toast.error((err as Error).message, { id: toastId })
    } finally {
      setTerminalLoading(false)
    }
  }

  const handleDarAlta = async () => {
    if (!client) return
    setShowConfirm(null)
    setTerminalLoading(true)
    const toastId = toast.loading('Registrando en terminal...')
    try {
      const sub = client.subscriptions?.[0]
      await Terminal.createPerson({
        user_id: String(client.id),
        name: client.name ?? '',
        last_name: client.last_name ?? '',
        gender: client.gender ?? 'M',
        start_date: formatTerminalDate(sub?.start_date),
        end_date: formatTerminalDate(sub?.end_date),
      })
      if (client.image_url) {
        const terminalImage = await resolveFaceImageBase64(client.image_url)
        await Terminal.setUpFaceImage(String(client.id), terminalImage)
      }
      await updateBrowserClient(client.id, { is_sync: true })
      setIsSynced(true)
      toast.success('Cliente dado de alta en el terminal. Asigna la huella para activar acceso biométrico.', { id: toastId })
      onSuccess()
    } catch (err) {
      toast.error((err as Error).message, { id: toastId })
    } finally {
      setTerminalLoading(false)
    }
  }

  const capturePhoto = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) setFaceImage(screenshot)
  }, [])

  const captureFingerprint = async () => {
    setCapturingFP(true)
    try {
      const fp = await Terminal.readFingerPrint()
      setFingerprintData(fp)
      toast.success('Huella capturada')
    } catch {
      toast.error('No se pudo capturar la huella')
    } finally {
      setCapturingFP(false)
    }
  }

  const handleSaveBiometrics = async () => {
    if (!client || !userData) return
    setSavingBiometrics(true)
    const toastId = toast.loading('Sincronizando biométricos...')

    try {
      // faceImage es un data URI cuando se acaba de capturar; si no cambió desde la carga
      // del cliente, puede ya ser una URL de Storage. El terminal siempre necesita base64.
      let imageUrl = faceImage
      let terminalImage = faceImage

      if (faceImage?.startsWith('data:')) {
        imageUrl = await uploadFaceImage(userData.company.id, client.id, faceImage)
      } else if (faceImage) {
        terminalImage = await resolveFaceImageBase64(faceImage)
      }

      await updateBrowserClient(client.id, { image_url: imageUrl })

      const employeeNo = String(client.id)
      if (terminalConfigured) {
        if (terminalImage) await Terminal.setUpFaceImage(employeeNo, terminalImage)
        if (fingerprintData?.fingerPrintData) {
          await Terminal.setUpFingerPrint(employeeNo, fingerprintData.fingerPrintData)
        }
      }

      const imageChanged = faceImage && faceImage !== client.image_url
      if (imageChanged && imageUrl) {
        FacialApi.updateUser({
          supabase_user_id:    client.id,
          profile_picture_url: imageUrl,
        }).catch(() => {
          toast.warning('Biométricos guardados. Sin sincronización con reconocimiento facial.')
        })
      }

      toast.success('Biométricos actualizados', { id: toastId })
      onSuccess()
    } catch (error) {
      toast.error((error as Error).message, { id: toastId })
    } finally {
      setSavingBiometrics(false)
    }
  }

  const subscription = client?.subscriptions?.[0]
  const isExpired = subscription ? new Date() > new Date(subscription.end_date ?? 0) : false

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-card border-border/40 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
                {client?.name} {client?.last_name}
                {isExpired ? (
                  <Badge variant="destructive" className="text-[9px] uppercase tracking-widest h-4">Vencido</Badge>
                ) : (
                  <Badge className="bg-primary text-primary-foreground text-[9px] uppercase tracking-widest h-4">Activo</Badge>
                )}
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">ID: {client?.id.toString().padStart(6, '0')}</p>
            </div>
            {terminalConfigured && (
              isSynced ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2"
                  onClick={() => setShowConfirm('baja')}
                  disabled={terminalLoading}
                >
                  {terminalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                  Dar de baja
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon"
                  onClick={() => setShowConfirm('alta')}
                  disabled={terminalLoading}
                >
                  {terminalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  Dar de alta
                </Button>
              )
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 border-b border-border/40">
            <TabsList className="h-12 gap-6">
              <TabsTrigger value="info" className="gap-2">
                <User className="h-3.5 w-3.5" /> Información
              </TabsTrigger>
              <TabsTrigger value="biometrics" className="gap-2">
                <Fingerprint className="h-3.5 w-3.5" /> Biométricos
              </TabsTrigger>
              <TabsTrigger value="membership" className="gap-2">
                <CreditCard className="h-3.5 w-3.5" /> Membresía
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <History className="h-3.5 w-3.5" /> Pagos
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 pt-0">
            {/* Tab: Información */}
            <TabsContent value="info" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-technical">Nombre</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-technical">Apellido</Label>
                  <Input
                    value={formData.last_name}
                    onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-technical">Email corporativo</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-technical">Teléfono de contacto</Label>
                  <Input
                    value={formData.phone_number}
                    onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-technical">Fecha de nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-technical">Género</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={v => setFormData(p => ({ ...p, gender: v ?? 'M' }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                      <SelectItem value="O">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-[10px] uppercase font-bold tracking-widest gap-2">
                  <X className="h-3 w-3" /> Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} size="sm" className="h-9 px-4 text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon">
                  {loading ? 'Guardando...' : <><Save className="h-3 w-3" /> Guardar cambios</>}
                </Button>
              </div>
            </TabsContent>

            {/* Tab: Biométricos */}
            <TabsContent value="biometrics" className="mt-6 space-y-5">
              {!terminalConfigured && (
                <div className="flex items-start gap-3 rounded-lg border border-[#FF9F0A]/25 bg-[#FF9F0A]/10 p-3">
                  <WifiOff className="mt-0.5 h-4 w-4 text-[#FF9F0A]" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9F0A]">Terminal no configurada</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Puedes actualizar la foto del cliente. Para sincronizar rostro o huella con Hikvision, configura la terminal en este navegador.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-technical">Foto facial</Label>
                    {faceImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[9px] uppercase tracking-widest"
                        onClick={() => setFaceImage(null)}
                      >
                        <RotateCcw className="h-3 w-3" /> Recapturar
                      </Button>
                    )}
                  </div>

                  {faceImage ? (
                    <img src={faceImage} alt="Foto del cliente" className="h-64 w-full rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="space-y-3">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="h-64 w-full rounded-lg border border-border object-cover"
                        videoConstraints={{ facingMode: 'user', width: 500, height: 360 }}
                      />
                      <Button type="button" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2" onClick={capturePhoto}>
                        <Camera className="h-3.5 w-3.5" /> Capturar foto
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                        <Fingerprint className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Huella digital</p>
                        <p className="text-xs text-muted-foreground">Captura y sincroniza la huella del miembro.</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4 h-8 w-full text-[10px] uppercase font-bold tracking-widest gap-2"
                      onClick={captureFingerprint}
                      disabled={capturingFP || !terminalConfigured}
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                      {capturingFP ? 'Capturando...' : 'Capturar huella'}
                    </Button>

                    {fingerprintData?.fingerPrintQuality !== undefined && (
                      <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/10 p-2 text-xs text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Calidad: {fingerprintData.fingerPrintQuality}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="h-9 w-full text-[10px] uppercase font-black tracking-widest bg-primary text-primary-foreground shadow-neon"
                    onClick={handleSaveBiometrics}
                    disabled={savingBiometrics || (!faceImage && !fingerprintData)}
                  >
                    {savingBiometrics ? 'Sincronizando...' : 'Guardar biométricos'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Membresía */}
            <TabsContent value="membership" className="mt-6">
              {subscription ? (
                <div className="space-y-4">
                  <div className="glass-panel rounded-lg p-5 border-l-4 border-l-primary">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <p className="text-technical">Plan contratado</p>
                        <h4 className="text-lg font-bold text-primary italic uppercase">{subscription.plans?.name ?? 'Plan Personalizado'}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-technical">Estado de vigencia</p>
                        <p className={cn("text-xs font-bold uppercase tracking-widest", isExpired ? "text-destructive" : "text-primary")}>
                          {isExpired ? 'Vencido' : 'En curso'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 border-t border-border/30 pt-4">
                      <div>
                        <p className="text-technical mb-1">Fecha de inicio</p>
                        <p className="text-sm font-mono tracking-tight text-foreground">
                          {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-technical mb-1">Próximo vencimiento</p>
                        <p className={cn("text-sm font-mono tracking-tight", isExpired ? "text-destructive" : "text-foreground")}>
                          {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-secondary/20 rounded-lg flex items-center justify-between border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">¿Deseas modificar el periodo o plan?</p>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase tracking-widest hover:bg-primary/10">Gestionar Suscripción</Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Sin membresía activa</p>
                  <Button variant="link" className="text-primary text-[10px] uppercase font-bold tracking-widest mt-2">Asignar plan ahora</Button>
                </div>
              )}
            </TabsContent>

            {/* Tab: Pagos */}
            <TabsContent value="payments" className="mt-6">
              {loadingPayments ? (
                <div className="py-12 flex flex-col items-center text-center space-y-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Cargando pagos</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center">
                    <History className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sin pagos registrados</h3>
                    <p className="text-[10px] text-muted-foreground/60 max-w-xs">
                      No se encontraron transacciones asociadas a las suscripciones de este miembro.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historial de Transacciones</h3>
                      <p className="text-[10px] text-muted-foreground/60">{payments.length} pagos asociados a suscripciones del miembro</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                      {fmtCurrency(payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0))}
                    </Badge>
                  </div>

                  <div className="max-h-80 overflow-y-auto rounded-lg border border-border/40">
                    <div className="grid grid-cols-[1fr_1fr_0.9fr_1fr] gap-3 border-b border-border/30 bg-secondary/20 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>Cantidad</span>
                      <span>Membresía</span>
                      <span>Fecha</span>
                      <span>Responsable</span>
                    </div>
                    {payments.map((payment) => {
                      const responsible = payment.responsible?.displayName ?? payment.responsible?.email ?? (payment.registered_by ? `ID ${payment.registered_by.slice(0, 8)}` : '—')
                      return (
                        <div key={payment.id} className="grid grid-cols-[1fr_1fr_0.9fr_1fr] gap-3 border-b border-border/20 px-3 py-3 last:border-b-0">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-primary">{fmtCurrency(payment.amount)}</p>
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                              {paymentTypeLabel(payment.payment_type)} · {paymentMethodLabel(payment.payment_method)}
                            </p>
                          </div>
                          <p className="text-xs font-semibold text-foreground">{getPaymentPlanName(payment)}</p>
                          <p className="text-xs font-mono text-muted-foreground">{formatPaymentDate(payment.payment_date)}</p>
                          <p className="truncate text-xs text-muted-foreground" title={responsible}>{responsible}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
        {/* Dialog de confirmación baja/alta */}
        <Dialog open={showConfirm !== null} onOpenChange={v => !v && setShowConfirm(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border/40">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-bold">
                {showConfirm === 'baja' ? 'Confirmar baja en terminal' : 'Confirmar alta en terminal'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-2">
                {showConfirm === 'baja' ? (
                  <>
                    Se eliminará a <strong>{client?.name} {client?.last_name}</strong> del terminal facial.
                    Sus datos permanecerán en el sistema y podrás darle de alta nuevamente en el futuro.
                  </>
                ) : (
                  <>
                    Se registrará a <strong>{client?.name} {client?.last_name}</strong> en el terminal con
                    {client?.subscriptions?.[0] ? (
                      <> su suscripción vigente ({
                        client.subscriptions[0].start_date
                          ? new Date(client.subscriptions[0].start_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'
                      } — {
                        client.subscriptions[0].end_date
                          ? new Date(client.subscriptions[0].end_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'
                      }).</>
                    ) : (
                      <> sin fechas de suscripción (no tiene membresía activa).</>
                    )}
                    {' '}La huella debe asignarse por separado desde la pestaña Biométricos.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-9 text-[10px] uppercase font-bold tracking-widest" onClick={() => setShowConfirm(null)}>
                Cancelar
              </Button>
              {showConfirm === 'baja' ? (
                <Button variant="destructive" size="sm" className="h-9 text-[10px] uppercase font-bold tracking-widest gap-2" onClick={handleDarBaja}>
                  <UserMinus className="h-3 w-3" /> Confirmar baja
                </Button>
              ) : (
                <Button size="sm" className="h-9 text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon" onClick={handleDarAlta}>
                  <UserPlus className="h-3 w-3" /> Confirmar alta
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Dialog>
  )
}

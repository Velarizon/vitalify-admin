'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { updateClient } from '@/lib/supabase/actions/clients'
import { toast } from 'sonner'
import { User, Fingerprint, CreditCard, History, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    phone_number: string | null
    date_of_birth: string | null
    gender: string | null
    subscriptions?: Subscription[]
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditClientDialog({ client, open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'M',
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone_number: client.phone_number || '',
        date_of_birth: client.date_of_birth || '',
        gender: client.gender || 'M',
      })
    }
  }, [client])

  const handleSave = async () => {
    if (!client) return
    setLoading(true)
    try {
      await updateClient(client.id, formData)
      toast.success('Cliente actualizado correctamente')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
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
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
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
                  <Label className="text-hud">Nombre</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-hud">Apellido</Label>
                  <Input
                    value={formData.last_name}
                    onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-hud">Email corporativo</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-hud">Teléfono de contacto</Label>
                  <Input
                    value={formData.phone_number}
                    onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-hud">Fecha de nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))}
                    className="h-10 text-sm bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-hud">Género</Label>
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
            <TabsContent value="biometrics" className="mt-6">
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center animate-pulse">
                  <Fingerprint className="h-8 w-8 text-primary/40" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Sincronización Biométrica</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    No se detectó un dispositivo Hikvision vinculado. Conecta un terminal desde la sección de configuración.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-[9px] uppercase tracking-widest">Configurar Terminal</Button>
              </div>
            </TabsContent>

            {/* Tab: Membresía */}
            <TabsContent value="membership" className="mt-6">
              {subscription ? (
                <div className="space-y-4">
                  <div className="neon-card rounded-lg p-5 border-l-4 border-l-primary">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <p className="text-hud">Plan contratado</p>
                        <h4 className="text-lg font-bold text-primary italic uppercase">{(subscription.plans as any)?.name ?? 'Plan Personalizado'}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-hud">Estado de vigencia</p>
                        <p className={cn("text-xs font-bold uppercase tracking-widest", isExpired ? "text-destructive" : "text-primary")}>
                          {isExpired ? 'Vencido' : 'En curso'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 border-t border-border/30 pt-4">
                      <div>
                        <p className="text-hud mb-1">Fecha de inicio</p>
                        <p className="text-sm font-mono tracking-tight text-foreground">
                          {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-hud mb-1">Próximo vencimiento</p>
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
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center">
                  <History className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historial de Transacciones</h3>
                  <p className="text-[10px] text-muted-foreground/60 max-w-xs">
                    El historial completo de pagos está disponible en el módulo global de finanzas.
                  </p>
                </div>
                <Button variant="link" className="text-primary text-[10px] uppercase font-bold tracking-widest">Ver en Pagos →</Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

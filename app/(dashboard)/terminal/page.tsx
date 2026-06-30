'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DoorOpen, Settings, Wifi, Cpu, Zap, Terminal as TerminalIcon, Smartphone, Eye, EyeOff, Copy, Check, Loader2 } from 'lucide-react'
import Terminal from '@/lib/terminal'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { getBrowserCompanyVitalify } from '@/lib/supabase/browser-catalogs'

function generateStrongPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const arr = new Uint32Array(14)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join('') + 'Aa1!'
}

export default function TerminalPage() {
  const { userData } = useAuthStore()
  const companyId = userData?.company.id ?? null

  const [agentIp, setAgentIp] = useState('')
  const [terminalIp, setTerminalIp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [openingDoor, setOpeningDoor] = useState(false)

  // Vitalify (trainer-app) gym registration
  const [vitalifyId, setVitalifyId] = useState<number | null>(null)
  const [vitalifyEmail, setVitalifyEmail] = useState('')
  const [vitalifyPassword, setVitalifyPassword] = useState('')
  const [showVitalifyPassword, setShowVitalifyPassword] = useState(false)
  const [registeringVitalify, setRegisteringVitalify] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setAgentIp(localStorage.getItem('agentIp') || 'http://localhost:8000')
    setTerminalIp(localStorage.getItem('terminalIp') || '')
    setUsername(localStorage.getItem('terminalUsername') || 'admin')
    setPassword(localStorage.getItem('terminalPassword') || 'admin')
  }, [])

  useEffect(() => {
    if (!companyId) return
    getBrowserCompanyVitalify(companyId)
      .then((data) => {
        setVitalifyId(data.vitalify_id ?? null)
        setVitalifyEmail(data.vitalify_email ?? '')
        setVitalifyPassword(data.vitalify_password ?? '')
      })
      .catch(() => {})
  }, [companyId])

  const handleRegisterVitalify = async () => {
    if (!companyId) return
    if (!vitalifyEmail.trim() || !vitalifyPassword.trim()) {
      toast.error('Ingresa email y contraseña para la cuenta del gimnasio')
      return
    }
    setRegisteringVitalify(true)
    const toastId = toast.loading('Registrando gimnasio en Vitalify...')
    try {
      const res = await fetch('/api/vitalify/register-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, email: vitalifyEmail.trim().toLowerCase(), password: vitalifyPassword }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'No se pudo registrar el gimnasio')
      setVitalifyId(result.vitalifyId)
      setVitalifyEmail(result.email)
      toast.success(result.alreadyExisted ? 'Gimnasio ya estaba registrado en Vitalify' : 'Gimnasio registrado en Vitalify', { id: toastId })
    } catch (err) {
      toast.error((err as Error).message, { id: toastId })
    } finally {
      setRegisteringVitalify(false)
    }
  }

  const handleCopyCreds = async () => {
    try {
      await navigator.clipboard.writeText(`${vitalifyEmail} / ${vitalifyPassword}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const handleSave = () => {
    localStorage.setItem('agentIp', agentIp)
    localStorage.setItem('terminalIp', terminalIp)
    localStorage.setItem('terminalUsername', username)
    localStorage.setItem('terminalPassword', password)
    toast.success('Configuración guardada en el nodo local')
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await Terminal.getCapabilities()
      toast.success('Protocolo de enlace verificado')
    } catch {
      toast.error('Error de redundancia: Agente no detectado')
    } finally {
      setTesting(false)
    }
  }

  const handleOpenDoor = async () => {
    setOpeningDoor(true)
    try {
      await Terminal.openDoor()
      toast.success('Señal de apertura activada')
    } catch {
      toast.error('Fallo en el actuador de la puerta')
    } finally {
      setOpeningDoor(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-heading font-bold tracking-tight">Configuración de Nodo</h1>
          <p className="text-technical tracking-widest uppercase italic">Interface Biométrica Hikvision</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-neon animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-tighter text-primary">Sistema Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-panel border-none overflow-hidden">
          <CardHeader className="border-b border-border/20 bg-secondary/10">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-foreground/80">
              <Settings size={14} className="text-primary" />
              Parámetros de Enlace Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-ip" className="text-technical">Dirección IP del Agente (Proxy)</Label>
                <div className="relative">
                  <TerminalIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    id="agent-ip"
                    value={agentIp}
                    onChange={(event) => setAgentIp(event.target.value)}
                    className="pl-10 font-mono text-xs bg-background/50 border-border"
                    placeholder="http://localhost:8000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terminal-ip" className="text-technical">Dirección IP del Dispositivo</Label>
                <div className="relative">
                  <Cpu className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    id="terminal-ip"
                    value={terminalIp}
                    onChange={(event) => setTerminalIp(event.target.value)}
                    className="pl-10 font-mono text-xs bg-background/50 border-border"
                    placeholder="http://192.168.1.10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terminal-username" className="text-technical">Identificador de Usuario</Label>
                <Input
                  id="terminal-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="bg-background/50 border-border text-xs"
                  placeholder="admin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terminal-password" className="text-technical">Token de Seguridad</Label>
                <Input
                  id="terminal-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="bg-background/50 border-border text-xs"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-border/20">
              <Button onClick={handleSave} className="bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] h-9 px-6 shadow-neon">
                Guardar Configuración
              </Button>
              <Button variant="outline" onClick={handleTest} disabled={testing} className="font-bold uppercase tracking-widest text-[10px] h-9 gap-2">
                <Wifi size={14} className={testing ? "animate-pulse" : ""} />
                {testing ? 'Verificando...' : 'Diagnóstico de Enlace'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 glass-panel border-none bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Zap size={14} />
              Acciones de Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight leading-relaxed">
              Comandos de invalidación manual y forzado de actuadores. Use solo en caso de mantenimiento.
            </p>
            <Button 
              variant="outline" 
              onClick={handleOpenDoor} 
              disabled={openingDoor}
              className="w-full h-12 flex flex-col items-center justify-center gap-1 border-primary/20 hover:bg-primary/10 transition-all group"
            >
              <div className="flex items-center gap-2">
                <DoorOpen size={16} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Apertura de Puerta</span>
              </div>
              {openingDoor && <span className="text-[8px] font-medium text-primary/60">ENVIANDO COMANDO...</span>}
            </Button>
            
            <div className="pt-4 border-t border-primary/10 space-y-3">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">
                <span>Versión Firmware</span>
                <span className="text-foreground">v2.4.12-STITCH</span>
              </div>
              <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">
                <span>Último Sync</span>
                <span className="text-foreground">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vitalify (App Móvil) gym registration */}
      <Card className="glass-panel border-none overflow-hidden">
        <CardHeader className="border-b border-border/20 bg-secondary/10">
          <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-foreground/80">
            <Smartphone size={14} className="text-primary" />
            Registro en Vitalify (App Móvil)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {vitalifyId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 p-3">
                <Check className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Gimnasio registrado</p>
                  <p className="text-xs text-muted-foreground">Trainer ID en Vitalify: <span className="font-mono text-foreground">{vitalifyId}</span></p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-technical">Email de la cuenta</Label>
                  <Input readOnly value={vitalifyEmail} className="bg-background/50 border-border text-xs font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-technical">Contraseña</Label>
                  <div className="relative">
                    <Input
                      readOnly
                      type={showVitalifyPassword ? 'text' : 'password'}
                      value={vitalifyPassword}
                      className="bg-background/50 border-border text-xs font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVitalifyPassword(v => !v)}
                      className="absolute right-3 top-2.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showVitalifyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCreds}
                className="h-9 gap-2 text-[10px] uppercase font-bold tracking-widest"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar credenciales'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Registra este gimnasio como cuenta en Vitalify para poder dar de alta miembros con el complemento de App Móvil.
                Guarda estas credenciales: son el acceso del gimnasio a la app.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vitalify-email" className="text-technical">Email del gimnasio</Label>
                  <Input
                    id="vitalify-email"
                    type="email"
                    value={vitalifyEmail}
                    onChange={(e) => setVitalifyEmail(e.target.value)}
                    className="bg-background/50 border-border text-xs"
                    placeholder="gimnasio@vitalify.app"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vitalify-password" className="text-technical">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="vitalify-password"
                      type={showVitalifyPassword ? 'text' : 'password'}
                      value={vitalifyPassword}
                      onChange={(e) => setVitalifyPassword(e.target.value)}
                      className="bg-background/50 border-border text-xs font-mono pr-20"
                      placeholder="••••••••"
                    />
                    <div className="absolute right-2 top-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowVitalifyPassword(v => !v)}
                        className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                      >
                        {showVitalifyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setVitalifyPassword(generateStrongPassword()); setShowVitalifyPassword(true) }}
                        className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline px-1"
                      >
                        Generar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleRegisterVitalify}
                disabled={registeringVitalify}
                className="bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] h-9 px-6 shadow-neon gap-2"
              >
                {registeringVitalify ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
                {registeringVitalify ? 'Registrando...' : 'Registrar en Vitalify'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

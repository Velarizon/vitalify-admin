'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DoorOpen, Settings, Wifi, Cpu, ShieldCheck, Zap, Terminal as TerminalIcon } from 'lucide-react'
import Terminal from '@/lib/terminal'
import { toast } from 'sonner'

export default function TerminalPage() {
  const [agentIp, setAgentIp] = useState('')
  const [terminalIp, setTerminalIp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [openingDoor, setOpeningDoor] = useState(false)

  useEffect(() => {
    setAgentIp(localStorage.getItem('agentIp') || 'http://localhost:8000')
    setTerminalIp(localStorage.getItem('terminalIp') || '')
    setUsername(localStorage.getItem('terminalUsername') || 'admin')
    setPassword(localStorage.getItem('terminalPassword') || 'admin')
  }, [])

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
          <p className="text-hud tracking-widest uppercase italic">Interface Biométrica Hikvision</p>
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
                <Label htmlFor="agent-ip" className="text-hud">Dirección IP del Agente (Proxy)</Label>
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
                <Label htmlFor="terminal-ip" className="text-hud">Dirección IP del Dispositivo</Label>
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
                <Label htmlFor="terminal-username" className="text-hud">Identificador de Usuario</Label>
                <Input
                  id="terminal-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="bg-background/50 border-border text-xs"
                  placeholder="admin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terminal-password" className="text-hud">Token de Seguridad</Label>
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
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DoorOpen, Settings, Wifi } from 'lucide-react'
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
    toast.success('Configuración guardada')
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await Terminal.getCapabilities()
      toast.success('Conexión exitosa con el agente')
    } catch {
      toast.error('No se pudo conectar con el agente')
    } finally {
      setTesting(false)
    }
  }

  const handleOpenDoor = async () => {
    setOpeningDoor(true)
    try {
      await Terminal.openDoor()
      toast.success('Comando de apertura enviado')
    } catch {
      toast.error('Error al abrir puerta')
    } finally {
      setOpeningDoor(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Configuración de Terminal</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings size={16} />
            Conexión del terminal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agent-ip">Agent IP</Label>
              <Input
                id="agent-ip"
                value={agentIp}
                onChange={(event) => setAgentIp(event.target.value)}
                placeholder="http://localhost:8000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminal-ip">Terminal IP</Label>
              <Input
                id="terminal-ip"
                value={terminalIp}
                onChange={(event) => setTerminalIp(event.target.value)}
                placeholder="http://192.168.1.10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminal-username">Usuario</Label>
              <Input
                id="terminal-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminal-password">Password</Label>
              <Input
                id="terminal-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>
              Guardar configuración
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              <Wifi />
              {testing ? 'Probando...' : 'Probar conexión'}
            </Button>
            <Button variant="secondary" onClick={handleOpenDoor} disabled={openingDoor}>
              <DoorOpen />
              {openingDoor ? 'Abriendo...' : 'Abrir puerta'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
